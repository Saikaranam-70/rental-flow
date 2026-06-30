import { useState } from 'react';
import { useQuery } from 'react-query';
import { paymentsAPI } from '../api';
import { fmt, fmtDateTime } from '../utils/helpers';
import { PageHeader, Card, StatCard, SearchInput, TabBar } from '../components/ui';
import useLangStore from '../store/langStore';

const METHOD_COLORS = {
  cash: 'bg-orange-100 text-orange-700',
  upi: 'bg-blue-100 text-blue-700',
  card: 'bg-purple-100 text-purple-700',
  netbanking: 'bg-green-100 text-green-700',
  cheque: 'bg-gray-100 text-gray-700',
};

const TYPE_COLORS = {
  deposit: 'bg-yellow-100 text-yellow-700',
  rental: 'bg-green-100 text-green-700',
  penalty: 'bg-red-100 text-red-700',
  refund: 'bg-blue-100 text-blue-700',
  extension: 'bg-purple-100 text-purple-700',
};

export default function Payments() {
  const [methodFilter, setMethodFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { t } = useLangStore();

  const { data, isLoading } = useQuery(['payments', methodFilter], () =>
    paymentsAPI.getAll({ method: methodFilter !== 'all' ? methodFilter : undefined, limit: 100 })
  );

  const payments = data?.data?.data || [];
  const totals = data?.data?.totals || [];

  const totalCollected = totals.filter(t => t._id !== 'refund').reduce((s, t) => s + t.total, 0);
  const totalRefunded = totals.find(t => t._id === 'refund')?.total || 0;

  const filtered = payments.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.customerName?.toLowerCase().includes(q) || p.inventoryName?.toLowerCase().includes(q);
  });

  const TABS = [
    { value: 'all', label: t('all') },
    { value: 'cash', label: 'CASH' },
    { value: 'upi', label: 'UPI' },
    { value: 'card', label: 'CARD' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={t('payments')} subtitle={t('paymentTransactions')} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('totalCollected')} value={fmt(totalCollected)} color="text-green-600" icon="Coins" />
        <StatCard label={t('totalRefunded')} value={fmt(totalRefunded)} color="text-blue-600" icon="RotateCcw" />
        <StatCard label={t('netRevenue')} value={fmt(totalCollected - totalRefunded)} color="text-brand-600" icon="TrendingUp" />
        <StatCard label={t('transactions')} value={payments.length} color="text-purple-600" icon="ClipboardList" />
      </div>

      {/* Method breakdown */}
      <div className="grid grid-cols-3 gap-4">
        {totals.filter(tItem => tItem._id !== 'refund').map(tItem => (
          <Card key={tItem._id} className="text-center border-2 border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase mb-1.5">{tItem._id?.toUpperCase()}</p>
            <p className="text-xl font-black text-gray-900 leading-tight">{fmt(tItem.total)}</p>
            <p className="text-xs text-gray-400 font-semibold mt-1">{tItem.count} txns</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <TabBar tabs={TABS} active={methodFilter} onChange={setMethodFilter} />
        <div className="flex-1 sm:max-w-xs w-full">
          <SearchInput value={search} onChange={setSearch} placeholder={t('searchVehiclePlaceholder')} />
        </div>
      </div>

      <Card className="p-0 overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-semibold">
            <thead className="bg-gray-50 border-b border-gray-150 text-gray-500">
              <tr>
                {['Customer', 'Vehicle', 'Amount', 'Method', 'Type', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="bg-white">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3.5"><div className="skeleton h-4 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 font-bold bg-white">
                    {t('noPaymentsFound')}
                  </td>
                </tr>
              ) : (
                filtered.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors bg-white">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-sm">
                          {p.customerName?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 whitespace-nowrap leading-tight">{p.customerName}</p>
                          <p className="text-[10px] text-gray-400 font-mono font-bold mt-0.5">{p.rentalNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-650 whitespace-nowrap">{p.inventoryName}</td>
                    <td className="px-4 py-3.5">
                      <span className={`font-black ${p.payment?.type === 'refund' ? 'text-blue-600' : 'text-green-600'}`}>
                        {p.payment?.type === 'refund' ? '−' : '+'}{fmt(p.payment?.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm ${METHOD_COLORS[p.payment?.method] || 'bg-gray-100 text-gray-600'}`}>
                        {p.payment?.method?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm ${TYPE_COLORS[p.payment?.type] || 'bg-gray-100 text-gray-600'}`}>
                        {p.payment?.type?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 text-xs whitespace-nowrap font-medium">{fmtDateTime(p.payment?.paidAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
