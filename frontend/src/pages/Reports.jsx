import { useState } from 'react';
import { useQuery } from 'react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import { reportsAPI, downloadBlob } from '../api';
import { fmt } from '../utils/helpers';
import { PageHeader, Card, StatCard, Button, DynamicIcon } from '../components/ui';
import useLangStore from '../store/langStore';
import { Download, Award, Star } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PIE_COLORS = ['#F59E0B','#3B82F6','#10B981','#8B5CF6','#EF4444','#F97316'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white px-3 py-2 rounded-xl text-xs font-semibold shadow-lg">
      <p className="font-bold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' && p.value > 100 ? fmt(p.value) : p.value}</p>
      ))}
    </div>
  );
};

export default function Reports() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [exporting, setExporting] = useState('');
  const { t } = useLangStore();

  const { data, isLoading } = useQuery(['reports', year], () =>
    reportsAPI.getOverview({ year })
  );

  const report = data?.data?.data || {};
  const kpis = report.kpis || {};
  const monthlyRevenue = (report.monthlyRevenue || []).map((m) => ({
    month: MONTHS[m.month - 1],
    Revenue: m.revenue,
    Rentals: m.count,
  }));
  const topInventory = report.topInventory || [];
  const topCustomers = report.topCustomers || [];
  const paymentMethods = report.paymentMethods || [];
  const statusBreakdown = report.statusBreakdown || [];
  const categoryBreakdown = report.categoryBreakdown || [];

  const handleExport = async (type) => {
    setExporting(type);
    try {
      const res = type === 'rentals'
        ? await reportsAPI.exportRentals()
        : await reportsAPI.exportCustomers();
      downloadBlob(res.data, `${type}-${Date.now()}.csv`);
      toast.success(`${type} exported as CSV!`);
    } catch (err) {
      toast.error('Export failed — upgrade to Basic or Pro plan');
    } finally { setExporting(''); }
  };

  if (isLoading) return (
    <div className="space-y-5">
      <PageHeader title={t('reportsAnalytics')} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="card h-24 animate-pulse bg-gray-150" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => <div key={i} className="card h-64 animate-pulse bg-gray-150" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <PageHeader title={t('reportsAnalytics')} subtitle={t('performanceOverview')} />
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={year}
            onChange={e => setYear(+e.target.value)}
            className="input-base bg-white border-2 border-gray-200 focus:border-brand-500 min-h-[44px] text-gray-950 font-bold text-sm w-auto"
          >
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button size="sm" variant="secondary" loading={exporting === 'rentals'} onClick={() => handleExport('rentals')}>
            <Download size={14} />
            {t('exportRentals')}
          </Button>
          <Button size="sm" variant="secondary" loading={exporting === 'customers'} onClick={() => handleExport('customers')}>
            <Download size={14} />
            {t('exportCustomers')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('totalCollected')} value={fmt(kpis.totalRevenue || 0)} color="text-green-600" icon="Coins" />
        <StatCard label={t('transactions')} value={kpis.totalRentals || 0} color="text-blue-600" icon="ClipboardList" />
        <StatCard label={t('avgRentalValue')} value={fmt(kpis.avgRentalValue || 0)} color="text-brand-600" icon="BarChart2" />
        <StatCard label={t('overdueRate')} value={`${kpis.overdueRate || 0}%`} color={kpis.overdueRate > 20 ? 'text-red-600' : 'text-orange-500'} icon="AlertCircle" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <Card className="col-span-1 lg:col-span-2 border border-gray-200">
          <h3 className="font-extrabold text-gray-900 mb-4">{t('monthlyRevenueRentals')} — {year}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyRevenue} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 'bold' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 'bold' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 'bold' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, fontWeight: 'bold' }} />
              <Bar yAxisId="left" name="Revenue (₹)" dataKey="Revenue" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" name="Rentals Count" dataKey="Rentals" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Payment Methods Pie */}
        <Card className="border border-gray-200">
          <h3 className="font-extrabold text-gray-900 mb-4">{t('paymentMethod')}</h3>
          {paymentMethods.length === 0 ? (
            <div className="text-center py-8 text-gray-400 font-bold text-sm">{t('noDataYet')}</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={paymentMethods} dataKey="total" nameKey="_id" cx="50%" cy="50%" outerRadius={85} label={({ _id, percent }) => `${_id?.toUpperCase()} ${(percent * 100).toFixed(0)}%`}>
                  {paymentMethods.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Rental Status Breakdown */}
        <Card className="border border-gray-200">
          <h3 className="font-extrabold text-gray-900 mb-4">{t('rentalHistory')}</h3>
          <div className="space-y-4 font-bold text-sm">
            {statusBreakdown.map((s) => {
              const total = statusBreakdown.reduce((sum, x) => sum + x.count, 0);
              const pct = total ? Math.round((s.count / total) * 100) : 0;
              const colors = { active: '#3B82F6', overdue: '#EF4444', returned: '#10B981', cancelled: '#9CA3AF' };
              return (
                <div key={s._id}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-extrabold text-gray-700 capitalize">{t(s._id) || s._id}</span>
                    <span className="text-gray-500">{s.count} txns · {fmt(s.amount)}</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 animate-slide-in"
                      style={{ width: `${pct}%`, background: colors[s._id] || '#9CA3AF' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Top Vehicles */}
        <Card className="border border-gray-200">
          <h3 className="font-extrabold text-gray-900 mb-4 flex items-center gap-1.5">
            <Award className="text-yellow-500" size={18} />
            {t('topVehicles')}
          </h3>
          {topInventory.length === 0 ? (
            <p className="text-gray-450 font-semibold text-sm text-center py-8">{t('noDataYet')}</p>
          ) : (
            <div className="space-y-3 font-semibold">
              {topInventory.map((item, i) => (
                <div key={item._id} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 ${
                    i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : 'bg-orange-700'
                  }`}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-sm text-gray-900 truncate leading-tight">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.totalRentals} {t('rentals')}</p>
                  </div>
                  <p className="font-black text-brand-650 text-sm">{fmt(item.totalRevenue)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top Customers */}
        <Card className="border border-gray-200">
          <h3 className="font-extrabold text-gray-900 mb-4 flex items-center gap-1.5">
            <Star className="text-yellow-500" size={18} />
            {t('topCustomers')}
          </h3>
          {topCustomers.length === 0 ? (
            <p className="text-gray-455 font-semibold text-sm text-center py-8">{t('noDataYet')}</p>
          ) : (
            <div className="space-y-3 font-semibold">
              {topCustomers.map((c, i) => (
                <div key={c._id} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 ${
                    i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : 'bg-orange-700'
                  }`}>{i + 1}</div>
                  <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-sm">
                    {c.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-sm text-gray-900 leading-tight">{c.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{c.totalRentals} {t('rentals')}</p>
                  </div>
                  <p className="font-black text-green-600 text-sm">{fmt(c.totalAmountPaid)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Category Revenue */}
        <Card className="col-span-1 lg:col-span-2 border border-gray-200">
          <h3 className="font-extrabold text-gray-900 mb-4">{t('revenueByCategory')}</h3>
          {categoryBreakdown.length === 0 ? (
            <p className="text-gray-450 font-semibold text-sm text-center py-8">{t('noDataYet')}</p>
          ) : (
            <div className="space-y-4 font-semibold text-sm">
              {categoryBreakdown.map((cat, i) => {
                const maxRevenue = Math.max(...categoryBreakdown.map(c => c.revenue));
                const pct = maxRevenue ? (cat.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={cat._id} className="flex items-center gap-4">
                    <div className="w-24 text-sm font-extrabold text-gray-600 capitalize flex-shrink-0">{t(cat._id) || cat._id}</div>
                    <div className="flex-1 h-3.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-sm text-gray-900 leading-tight">{fmt(cat.revenue)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{cat.count} {t('rentals')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
