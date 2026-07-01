import { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { rentalsAPI } from '../api';
import { fmt, fmtDate, overdueDays, categoryIcon, getErrorMessage } from '../utils/helpers';
import { PageHeader, TabBar, SearchInput, Card, Button, Badge, Avatar, Modal, EmptyState, DynamicIcon, } from '../components/ui';
import * as UI from '../components/ui';
import NewRentalModal from '../components/rentals/NewRentalModal';
import useLangStore, { getWhatsAppLink } from '../store/langStore';
import useAuthStore from '../store/authStore';
import { MessageCircle, Calendar, ArrowRight, ClipboardCopy, Info } from 'lucide-react';

const TABS = [
  { value: 'all', label: 'all' },
  { value: 'active', label: 'active' },
  { value: 'overdue', label: 'overdue' },
  { value: 'returned', label: 'returned' },
];

export default function Rentals() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('status') || 'all');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [returnModal, setReturnModal] = useState(null);
  const [extendModal, setExtendModal] = useState(null);
  const [returnForm, setReturnForm] = useState({ actualReturnDate: '', depositReturned: '', penaltyAmount: '', paymentMethod: 'cash', returnNotes: '' });
  const [extendForm, setExtendForm] = useState({ newReturnDate: '', reason: '' });
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t, language } = useLangStore();
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery(
    ['rentals', tab],
    () => rentalsAPI.getAll({ status: tab === 'all' ? undefined : tab, limit: 50 }),
  );

  const rentals = data?.data?.data || [];

  const filtered = rentals.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.customerId?.name?.toLowerCase().includes(q) ||
      r.inventoryId?.name?.toLowerCase().includes(q) ||
      r.rentalNumber?.toLowerCase().includes(q) ||
      r.customerId?.phone?.includes(search);
  });

  const tabsWithCount = TABS.map(tOption => ({
    value: tOption.value,
    label: t(tOption.label),
    count: tOption.value === 'all' ? rentals.length : rentals.filter(r => r.status === tOption.value).length,
  }));

  const handleReturn = async () => {
    if (!returnForm.actualReturnDate) { toast.error('Return date required'); return; }
    setProcessing(true);
    try {
      await rentalsAPI.processReturn(returnModal._id, returnForm);
      toast.success('Return processed! ✅');
      setReturnModal(null);
      qc.invalidateQueries('rentals');
      qc.invalidateQueries('dashboard-stats');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally { setProcessing(false); }
  };

  const handleExtend = async () => {
    if (!extendForm.newReturnDate) { toast.error('New return date required'); return; }
    setProcessing(true);
    try {
      await rentalsAPI.extend(extendModal._id, extendForm);
      toast.success('Rental extended! 📅');
      setExtendModal(null);
      qc.invalidateQueries('rentals');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally { setProcessing(false); }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('rentals')}
        subtitle={`${rentals.length} total rentals`}
        action={
          <Button onClick={() => setShowNew(true)} className="shadow-sm">
            <PlusIcon size={16} />
            {t('newRentalBtn')}
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <TabBar tabs={tabsWithCount} active={tab} onChange={setTab} />
        <div className="flex-1 sm:max-w-xs w-full">
          <SearchInput value={search} onChange={setSearch} placeholder={t('searchVehiclePlaceholder')} />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="h-20 animate-pulse bg-gray-150" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon="FileText"
            title={t('noRentalsFound')}
            description={tab === 'overdue' ? 'Great! No overdue rentals.' : t('createFirstRental')}
            action={tab === 'all' && (
              <Button onClick={() => setShowNew(true)}>
                <PlusIcon size={16} />
                {t('newRentalBtn')}
              </Button>
            )}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const isOverdue = r.status === 'overdue';
            const isActive = r.status === 'active';
            const days = isOverdue ? overdueDays(r.expectedReturnDate) : null;
            const daysLeft = isActive
              ? Math.max(0, Math.ceil((new Date(r.expectedReturnDate) - new Date()) / (1000 * 60 * 60 * 24)))
              : null;

            // WhatsApp messages templates lookup
            let msgType = 'chat';
            let msgData = { customerName: r.customerId?.name };
            if (isActive) {
              msgType = 'confirmation';
              msgData = {
                customerName: r.customerId?.name,
                vehicleName: r.inventoryId?.name,
                regNo: r.inventoryId?.registrationNumber,
                startDate: new Date(r.startDate).toLocaleDateString('en-IN'),
                returnDate: new Date(r.expectedReturnDate).toLocaleDateString('en-IN'),
                amount: r.totalAmount,
                deposit: r.depositAmount,
                rentalNumber: r.rentalNumber
              };
            } else if (isOverdue) {
              msgType = 'overdue';
              msgData = {
                customerName: r.customerId?.name,
                vehicleName: r.inventoryId?.name,
                regNo: r.inventoryId?.registrationNumber,
                dueDate: new Date(r.expectedReturnDate).toLocaleDateString('en-IN'),
                days: days,
                agencyName: user?.agencyName
              };
            } else if (r.status === 'returned') {
              msgType = 'return';
              msgData = {
                customerName: r.customerId?.name,
                vehicleName: r.inventoryId?.name,
                amount: r.totalAmount,
                depositReturned: r.depositReturned || 0
              };
            }

            const waLink = getWhatsAppLink(r.customerId?.phone || '', msgType, msgData, language);

            return (
              <Card
                key={r._id}
                className={`cursor-pointer border border-gray-200 hover:border-gray-300 transition-all border-l-4 ${
                  isOverdue ? 'border-l-red-500' :
                  isActive ? 'border-l-blue-500' :
                  'border-l-gray-350'
                }`}
                onClick={() => navigate(`/rentals/${r._id}`)}
              >
                <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                  <Avatar name={r.customerId?.name} color={isOverdue ? 'red' : isActive ? 'blue' : 'brand'} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-gray-900 text-base">{r.customerId?.name}</span>
                      <Badge status={r.status} label={r.status} />
                      <span className="text-xs text-gray-400 font-bold font-mono">{r.rentalNumber}</span>
                    </div>
                    
                    <p className="text-sm text-gray-500 font-semibold mt-1 flex items-center gap-1.5">
                      <DynamicIcon name={categoryIcon(r.inventoryId?.category)} size={14} className="text-gray-400" />
                      <span>{r.inventoryId?.name}</span>
                      {r.inventoryId?.registrationNumber && (
                        <span className="text-xs text-gray-400 font-mono font-bold">({r.inventoryId.registrationNumber})</span>
                      )}
                    </p>
                    
                    <p className="text-xs text-gray-400 font-bold mt-1">
                      {fmtDate(r.startDate)} → {fmtDate(r.expectedReturnDate)}
                      {r.actualReturnDate && ` (Returned: ${fmtDate(r.actualReturnDate)})`}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-start w-full sm:w-auto gap-3 sm:gap-1.5 mt-2 sm:mt-0">
                    <div className="text-left sm:text-right">
                      <p className="font-black text-gray-900 text-lg leading-tight">{fmt(r.totalAmount)}</p>
                      {isOverdue && <p className="text-red-600 font-bold text-xs mt-0.5">+{days}d {t('daysOverdue')}</p>}
                      {isActive && daysLeft !== null && (
                        <p className={`font-extrabold text-xs mt-0.5 ${daysLeft <= 1 ? 'text-orange-500' : 'text-green-600'}`}>
                          {daysLeft === 0 ? t('dueToday') : `${daysLeft}d ${t('left')}`}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2 items-center" onClick={e => e.stopPropagation()}>
                      {/* WhatsApp Button */}
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="p-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-sm transition-all duration-150 active:scale-95 flex items-center justify-center border border-green-600/10"
                        title={t('sendWhatsAppAlert')}
                      >
                        <MessageCircle size={16} />
                      </a>

                      {r.status !== 'returned' && r.status !== 'cancelled' && (
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="secondary" className="min-h-[38px]" onClick={(e) => { e.stopPropagation(); setExtendModal(r); setExtendForm({ newReturnDate: '', reason: '' }); }}>
                            {t('extend')}
                          </Button>
                          <Button size="sm" className="min-h-[38px]" onClick={(e) => { e.stopPropagation(); setReturnModal(r); setReturnForm({ actualReturnDate: new Date().toISOString().split('T')[0], depositReturned: r.depositAmount, penaltyAmount: '', paymentMethod: 'cash', returnNotes: '' }); }}>
                            {t('returnBtn').replace(' ✓', '')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Return Modal */}
      {returnModal && (
        <Modal title={t('processReturn')} onClose={() => setReturnModal(null)}>
            <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-semibold space-y-1 shadow-inner">
              <p className="font-extrabold text-gray-900 text-base">{returnModal.customerId?.name}</p>
              <p className="text-gray-500">{returnModal.inventoryId?.name}</p>
              <p className="text-gray-600 font-bold">{t('depositAmount')}: {fmt(returnModal.depositAmount)}</p>
            </div>

            <div>
              <UI.Input label={t('actualReturnDate')} type="date" required value={returnForm.actualReturnDate} onChange={e => setReturnForm(f => ({ ...f, actualReturnDate: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <UI.Input label={t('depositToReturn').replace(' (₹)', '')} type="number" value={returnForm.depositReturned} onChange={e => setReturnForm(f => ({ ...f, depositReturned: e.target.value }))} />
              </div>
              <div>
                <UI.Input label={t('penalty').replace(' (₹)', '')} type="number" value={returnForm.penaltyAmount} onChange={e => setReturnForm(f => ({ ...f, penaltyAmount: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div>
              <label className="label">{t('paymentMethod')}</label>
              <select className="input-base bg-white border-2 border-gray-200 focus:border-brand-500 min-h-[44px] text-gray-950 font-bold" value={returnForm.paymentMethod} onChange={e => setReturnForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                <option value="cash">CASH</option>
                <option value="upi">UPI</option>
                <option value="card">CARD</option>
              </select>
            </div>
            <div>
              <UI.Textarea label={t('returnNotes')} rows={2} value={returnForm.returnNotes} onChange={e => setReturnForm(f => ({ ...f, returnNotes: e.target.value }))} placeholder="Condition, damages, etc." />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setReturnModal(null)}>{t('cancel')}</Button>
              <Button className="flex-1" loading={processing} onClick={handleReturn}>{t('confirmReturn')}</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Extend Modal */}
      {extendModal && (
        <Modal title={t('extendRental')} onClose={() => setExtendModal(null)}>
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-semibold shadow-inner">
              <p className="font-extrabold text-gray-900 text-base">{extendModal.customerId?.name}</p>
              <p className="text-gray-500 mt-0.5">{t('currentDue')}: {fmtDate(extendModal.expectedReturnDate)}</p>
            </div>
            <div>
              <UI.Input label={t('newReturnDate')} type="date" required value={extendForm.newReturnDate} min={new Date().toISOString().split('T')[0]} onChange={e => setExtendForm(f => ({ ...f, newReturnDate: e.target.value }))} />
            </div>
            <div>
              <UI.Input label={t('reasonForExtension')} value={extendForm.reason} onChange={e => setExtendForm(f => ({ ...f, reason: e.target.value }))} placeholder="Customer requested, out of town, etc." />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setExtendModal(null)}>{t('cancel')}</Button>
              <Button className="flex-1" loading={processing} onClick={handleExtend}>{t('extendRental')}</Button>
            </div>
          </div>
        </Modal>
      )}
      {/* New Rental Modal */}
      {showNew && (
        <NewRentalModal 
          onClose={() => setShowNew(false)} 
          onSuccess={() => qc.invalidateQueries('rentals')} 
        />
      )}
    </div>
  );
}

// Plus icon helper
function PlusIcon({ size = 16, className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
