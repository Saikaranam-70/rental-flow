import { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { customersAPI } from '../api';
import { getTierColor, getTierLabel, getErrorMessage, cn } from '../utils/helpers';
import { PageHeader, SearchInput, Card, Button, Avatar, Badge, Modal, EmptyState, ConfirmDialog } from '../components/ui';
import useLangStore, { getWhatsAppLink } from '../store/langStore';
import { MessageCircle, UserPlus, Slash, UserCheck, Phone, Mail, MapPin, ClipboardList, Info } from 'lucide-react';

export function Customers() {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [blacklistTarget, setBlacklistTarget] = useState(null);
  const [form, setForm] = useState({ name:'',phone:'',email:'',address:'',city:'',aadhaarNumber:'',dlNumber:'',source:'walk_in' });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t, language } = useLangStore();

  const { data, isLoading } = useQuery(['customers', search], () =>
    customersAPI.getAll({ search, limit: 50 })
  );
  const customers = data?.data?.data || [];

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    if (!form.name || !form.phone) { toast.error(t('fullName') + ' & ' + t('phone') + ' ' + t('required')); return; }
    setSaving(true);
    try {
      await customersAPI.create(form);
      toast.success('Customer added!');
      setShowAdd(false);
      setForm({ name:'',phone:'',email:'',address:'',city:'',aadhaarNumber:'',dlNumber:'',source:'walk_in' });
      qc.invalidateQueries('customers');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleBlacklist = async () => {
    try {
      await customersAPI.toggleBlacklist(blacklistTarget._id, {
        action: blacklistTarget.isBlacklisted ? 'unblacklist' : 'blacklist',
        reason: t('manualFlagReason'),
      });
      toast.success(blacklistTarget.isBlacklisted ? 'Customer unblocked' : 'Customer blacklisted');
      setBlacklistTarget(null);
      qc.invalidateQueries('customers');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('customers')}
        subtitle={`${customers.length} total`}
        action={
          <Button onClick={() => setShowAdd(true)} className="shadow-sm">
            <UserPlus size={16} />
            {t('addCustomerBtn')}
          </Button>
        }
      />
      
      <SearchInput value={search} onChange={setSearch} placeholder={t('searchVehiclePlaceholder')} />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Card key={i} className="h-20 animate-pulse bg-gray-150" />)}
        </div>
      ) : customers.length === 0 ? (
        <Card>
          <EmptyState
            icon="Users"
            title={t('noCustomers')}
            description={t('noCustomersDesc')}
            action={
              <Button onClick={() => setShowAdd(true)}>
                <UserPlus size={16} />
                {t('addCustomerBtn')}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {customers.map(c => {
            const waChatLink = getWhatsAppLink(c.phone, 'chat', { customerName: c.name }, language);
            return (
              <Card
                key={c._id}
                className="hover:border-gray-300 transition-all border border-gray-200 cursor-pointer"
                onClick={() => navigate(`/customers/${c._id}`)}
              >
                <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                  <Avatar name={c.name} color={c.isBlacklisted ? 'red' : 'brand'} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-gray-900 text-base">{c.name}</span>
                      {c.isBlacklisted && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                          <Slash size={10} />
                          {t('blacklist')}
                        </span>
                      )}
                      {!c.isBlacklisted && c.totalRentals > 0 && (
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold shadow-sm', getTierColor(c.tier))}>
                          {t(getTierLabel(c.tier))}
                        </span>
                      )}
                    </div>
                    
                    {/* Customer Info row */}
                    <div className="flex items-center gap-4 flex-wrap text-sm text-gray-500 mt-1.5 font-semibold">
                      <span className="flex items-center gap-1">
                        <Phone size={13} className="text-gray-400" />
                        {c.phone}
                      </span>
                      {c.email && (
                        <span className="flex items-center gap-1">
                          <Mail size={13} className="text-gray-400" />
                          {c.email}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 flex-wrap text-xs text-gray-400 mt-1 font-semibold">
                      {c.city && (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-gray-400" />
                          {c.city}
                        </span>
                      )}
                      {c.aadhaarNumber && (
                        <span>Aadhaar: <span className="font-mono">{c.aadhaarNumber}</span></span>
                      )}
                      <span className="flex items-center gap-1">
                        <ClipboardList size={11} className="text-gray-400" />
                        {c.totalRentals} {t('rentals')}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto justify-end mt-2 sm:mt-0" onClick={e => e.stopPropagation()}>
                    {/* WhatsApp Quick Chat */}
                    <a
                      href={waChatLink}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-sm transition-all duration-150 active:scale-95 flex items-center justify-center border border-green-600/10"
                      title="WhatsApp Chat"
                    >
                      <MessageCircle size={18} />
                    </a>

                    <Button size="sm" variant="secondary" onClick={() => navigate(`/customers/${c._id}`)}>
                      {t('view')}
                    </Button>
                    <Button
                      size="sm"
                      variant={c.isBlacklisted ? 'outline' : 'danger'}
                      className="min-h-[38px]"
                      onClick={() => setBlacklistTarget(c)}
                    >
                      {c.isBlacklisted ? t('unblock') : t('blacklist')}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Customer Modal */}
      {showAdd && (
        <Modal title={t('addCustomer')} onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Input
                  label={t('fullName')}
                  required
                  placeholder="Ravi Kumar"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Input
                  label={t('phone')}
                  required
                  placeholder="9876543210"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Input
                  label={t('email')}
                  type="email"
                  placeholder="ravi@gmail.com"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Input
                  label={t('aadhaarNumber')}
                  placeholder="XXXX-XXXX-XXXX"
                  value={form.aadhaarNumber}
                  onChange={e => set('aadhaarNumber', e.target.value)}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Input
                  label={t('dlNumber')}
                  placeholder="AP31201900012"
                  value={form.dlNumber}
                  onChange={e => set('dlNumber', e.target.value)}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Input
                  label={t('city')}
                  placeholder="Visakhapatnam"
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="label">{t('source')}</label>
                <select
                  className="input-base bg-white border-2 border-gray-200 focus:border-brand-500 min-h-[44px] text-gray-900 font-medium"
                  value={form.source}
                  onChange={e => set('source', e.target.value)}
                >
                  {['walk_in','whatsapp','phone','referral','online'].map(s => (
                    <option key={s} value={s}>{s.replace('_',' ').toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <Input
                  label={t('address')}
                  placeholder="Dwaraka Nagar"
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                />
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800 flex items-start gap-2 font-semibold">
              <Info size={14} className="flex-shrink-0 mt-0.5 text-yellow-600" />
              <span>ID proof photo upload (Aadhaar/DL) is available on the customer profile page after saving.</span>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>
                {t('cancel')}
              </Button>
              <Button className="flex-1" loading={saving} onClick={handleAdd}>
                {t('saveCustomer')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Blacklist Confirmation */}
      {blacklistTarget && (
        <ConfirmDialog
          title={blacklistTarget.isBlacklisted ? t('unblockConfirmTitle') : t('blockConfirmTitle')}
          message={blacklistTarget.isBlacklisted ? t('unblockConfirmDesc') : t('blockConfirmDesc')}
          onConfirm={handleBlacklist}
          onCancel={() => setBlacklistTarget(null)}
          confirmLabel={blacklistTarget.isBlacklisted ? t('unblock') : t('blacklist')}
          danger={!blacklistTarget.isBlacklisted}
        />
      )}
    </div>
  );
}

export default Customers;
