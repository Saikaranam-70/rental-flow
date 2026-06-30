import { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { rentalsAPI } from '../api';
import { fmt, fmtDate, overdueDays, categoryIcon } from '../utils/helpers';
import { StatCard, Card, Button, SkeletonCard, Avatar, DynamicIcon } from '../components/ui';
import NewRentalModal from '../components/rentals/NewRentalModal';
import useLangStore, { getWhatsAppLink } from '../store/langStore';
import useAuthStore from '../store/authStore';
import { MessageCircle, Bell, ArrowRight, CheckCircle2, Calendar } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [showNewRental, setShowNewRental] = useState(false);
  const { t, language } = useLangStore();
  const { user } = useAuthStore();

  const { data, isLoading, refetch } = useQuery(
    'dashboard-stats',
    () => rentalsAPI.getDashboard(),
    { refetchInterval: 60000 }
  );

  const stats = data?.data?.data?.stats || {};
  const overdueList = data?.data?.data?.overdueList || [];
  const upcomingReturns = data?.data?.data?.upcomingReturns || [];

  const getLocalDateString = () => {
    const locale = language === 'te' ? 'te-IN' : 'en-IN';
    return new Date().toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">{t('dashboard')}</h1>
          <p className="text-gray-500 text-sm mt-1 font-semibold">{getLocalDateString()}</p>
        </div>
        <Button onClick={() => setShowNewRental(true)} className="shadow-sm">
          <DynamicIcon name="Plus" size={16} />
          {t('newRentalBtn')}
        </Button>
      </div>

      {/* Stats Row */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label={t('activeRentals')} value={stats.activeRentals || 0} icon="Key" color="text-blue-600" />
          <StatCard label={t('overdue')} value={stats.overdueRentals || 0} icon="AlertCircle" color="text-red-600" pulse={stats.overdueRentals > 0} />
          <StatCard label={t('monthRevenue')} value={fmt(stats.monthRevenue || 0)} icon="Coins" color="text-green-600" />
          <StatCard label={t('depositHeld')} value={fmt(stats.depositHeld || 0)} icon="Lock" color="text-purple-600" />
          <StatCard label={t('todayRentals')} value={stats.todayRentals || 0} icon="ClipboardList" color="text-brand-600" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Alert Panel */}
        <Card className="border-t-4 border-t-red-500">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 pulse-dot" />
              <h3 className="font-extrabold text-red-600">{t('overdueRentals')}</h3>
            </div>
            <button onClick={() => navigate('/rentals?status=overdue')} className="text-xs text-gray-500 hover:text-gray-900 font-bold flex items-center gap-1 transition-colors">
              {t('viewAll')} <ArrowRight size={12} />
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : overdueList.length === 0 ? (
            <div className="text-center py-10 flex flex-col items-center">
              <div className="p-3 bg-green-50 text-green-600 rounded-full mb-3 border border-green-100">
                <CheckCircle2 size={32} />
              </div>
              <p className="text-gray-900 font-bold text-sm">{t('noOverdueRentals')}</p>
              <p className="text-gray-500 text-xs mt-1 font-semibold">{t('allRentalsOnTrack')}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {overdueList.map(r => {
                const days = overdueDays(r.expectedReturnDate);
                const waLink = getWhatsAppLink(r.customerId?.phone || '', 'overdue', {
                  customerName: r.customerId?.name,
                  vehicleName: r.inventoryId?.name,
                  regNo: r.inventoryId?.registrationNumber,
                  dueDate: new Date(r.expectedReturnDate).toLocaleDateString('en-IN'),
                  days,
                  agencyName: user?.agencyName || 'RentFlow CRM'
                }, language);

                return (
                  <div
                    key={r._id}
                    className="flex items-center gap-3 p-3 bg-red-50/50 hover:bg-red-50 border border-red-100 rounded-xl transition-all"
                  >
                    <div className="cursor-pointer flex-1 flex items-center gap-3 min-w-0" onClick={() => navigate(`/rentals/${r._id}`)}>
                      <Avatar name={r.customerId?.name} color="red" />
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-sm text-gray-900 truncate">{r.customerId?.name}</p>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 truncate mt-0.5 font-medium">
                          <DynamicIcon name={categoryIcon(r.inventoryId?.category)} size={12} />
                          <span>{r.inventoryId?.name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-2">
                      <div>
                        <p className="font-black text-red-600 text-lg leading-none">{days}d</p>
                        <p className="text-[10px] text-red-500 font-extrabold uppercase mt-0.5">{t('daysOverdue')}</p>
                      </div>
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-sm transition-all duration-150 active:scale-95 flex items-center justify-center"
                        title={t('sendWhatsAppAlert')}
                      >
                        <MessageCircle size={18} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Upcoming Returns */}
        <Card className="border-t-4 border-t-blue-500">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-extrabold text-gray-900">{t('returningSoon')}</h3>
            <button onClick={() => navigate('/rentals')} className="text-xs text-gray-500 hover:text-gray-900 font-bold flex items-center gap-1 transition-colors">
              {t('viewAll')} <ArrowRight size={12} />
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : upcomingReturns.length === 0 ? (
            <div className="text-center py-10 flex flex-col items-center">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-3 border border-blue-100">
                <Calendar size={32} />
              </div>
              <p className="text-gray-500 text-sm font-semibold">{t('noUpcomingReturns')}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {upcomingReturns.map(r => {
                const daysLeft = Math.max(0, Math.ceil((new Date(r.expectedReturnDate) - new Date()) / (1000 * 60 * 60 * 24)));
                const waLink = getWhatsAppLink(r.customerId?.phone || '', 'reminder', {
                  customerName: r.customerId?.name,
                  vehicleName: r.inventoryId?.name,
                  dueDate: new Date(r.expectedReturnDate).toLocaleDateString('en-IN')
                }, language);

                return (
                  <div
                    key={r._id}
                    className="flex items-center gap-3 p-3 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 rounded-xl transition-all"
                  >
                    <div className="cursor-pointer flex-1 flex items-center gap-3 min-w-0" onClick={() => navigate(`/rentals/${r._id}`)}>
                      <Avatar name={r.customerId?.name} color="blue" />
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-sm text-gray-900 truncate">{r.customerId?.name}</p>
                        <p className="text-xs text-gray-500 font-semibold mt-0.5">{fmtDate(r.expectedReturnDate)}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-2">
                      <div className="mr-1">
                        <p className={`font-black text-lg leading-none ${daysLeft === 0 ? 'text-orange-500' : 'text-blue-600'}`}>
                          {daysLeft === 0 ? t('today') : `${daysLeft}d`}
                        </p>
                        {daysLeft > 0 && <p className="text-[10px] text-gray-400 font-extrabold uppercase mt-0.5">{t('left')}</p>}
                      </div>
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-sm transition-all duration-150 active:scale-95 flex items-center justify-center"
                        title={t('sendWhatsAppAlert')}
                      >
                        <MessageCircle size={18} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <h3 className="font-extrabold text-gray-950 mb-5">{t('quickActions')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: t('newRentalBtn'), icon: 'Plus', color: 'bg-brand-50 hover:bg-brand-100 border-brand-200 text-brand-700', action: () => setShowNewRental(true) },
            { label: t('addVehicleBtn'), icon: 'Package', color: 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700', action: () => navigate('/inventory') },
            { label: t('viewReportsBtn'), icon: 'BarChart2', color: 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700', action: () => navigate('/reports') },
          ].map(q => (
            <button
              key={q.label}
              onClick={q.action}
              className={`flex flex-col items-center justify-center gap-2.5 p-5 rounded-2xl border-2 font-bold text-sm transition-all hover:scale-102 hover:shadow-sm active:scale-98 ${q.color}`}
            >
              <div className="p-2 bg-white/80 rounded-xl shadow-sm border border-current/10">
                <DynamicIcon name={q.icon} size={22} />
              </div>
              {q.label}
            </button>
          ))}
        </div>
      </Card>

      {showNewRental && (
        <NewRentalModal
          onClose={() => setShowNewRental(false)}
          onSuccess={() => { setShowNewRental(false); refetch(); }}
        />
      )}
    </div>
  );
}
