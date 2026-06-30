import { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { agencyAPI, staffAPI } from '../api';
import useAuthStore from '../store/authStore';
import { fmtDate, getErrorMessage } from '../utils/helpers';
import { PageHeader, Card, Button, Modal, LanguageSelector, DynamicIcon } from '../components/ui';
import useLangStore from '../store/langStore';
import { ShieldCheck, UserCheck, AlertCircle, Sparkles, Plus, Trash2, Check, BookOpen, MessageSquare, Mail, Cloud, CreditCard, Zap, Database, TrendingUp } from 'lucide-react';

const PLAN_FEATURES = {
  free:       { price: '₹0/mo',    color: 'border-gray-200',  features: ['20 rentals/month','1 user','Basic dashboard','No alerts'] },
  basic:      { price: '₹499/mo',  color: 'border-blue-300',  features: ['Unlimited rentals','1 user','WhatsApp alerts','CSV export'] },
  pro:        { price: '₹999/mo',  color: 'border-brand-450', features: ['Unlimited rentals','5 staff users','WhatsApp + Email alerts','Full reports','Priority support'] },
  enterprise: { price: 'Custom',   color: 'border-purple-400',features: ['Unlimited everything','Unlimited users','Custom integrations','Dedicated support'] },
};

export default function Settings() {
  const { user, updateUser } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name:'', email:'', role:'staff' });
  const { t } = useLangStore();
  const [sendingTestReport, setSendingTestReport] = useState(false);

  const triggerTestReport = async () => {
    setSendingTestReport(true);
    try {
      const res = await agencyAPI.testSalesReport();
      toast.success(res.data?.message || 'Test report successfully sent to your WhatsApp!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSendingTestReport(false);
    }
  };

  const [profile, setProfile] = useState({
    agencyName: user?.agencyName || '',
    ownerName: user?.ownerName || '',
    phone: user?.phone || '',
    alternatePhone: user?.alternatePhone || '',
    city: user?.city || '',
    state: user?.state || '',
    pincode: user?.pincode || '',
    gstin: user?.gstin || '',
    address: user?.address || '',
    businessType: user?.businessType || 'mixed',
  });

  const [settings, setSettings] = useState({
    whatsappEnabled: user?.settings?.whatsappEnabled || false,
    whatsappNumber: user?.settings?.whatsappNumber || '',
    emailNotifications: user?.settings?.emailNotifications !== false,
    overdueAlertDays: user?.settings?.overdueAlertDays || 0,
    depositPolicy: user?.settings?.depositPolicy || '',
    rentalTerms: user?.settings?.rentalTerms || '',
  });

  const { data: staffData, refetch: refetchStaff } = useQuery('staff', staffAPI.getAll, {
    enabled: tab === 'staff',
  });
  const staff = staffData?.data?.data || [];

  const saveProfile = async () => {
    setSaving(true);
    try {
      await agencyAPI.updateProfile({ ...profile, settings });
      updateUser({ agencyName: profile.agencyName, ownerName: profile.ownerName });
      toast.success('Settings saved!');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleInvite = async () => {
    if (!inviteForm.name || !inviteForm.email) { toast.error('Name and email required'); return; }
    try {
      await staffAPI.invite(inviteForm);
      toast.success('Invitation sent! 📧');
      setShowInvite(false);
      refetchStaff();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const removeStaff = async (id) => {
    try {
      await staffAPI.remove(id);
      toast.success('Staff removed');
      refetchStaff();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const TABS = ['profile', 'notifications', 'staff', 'plans', 'integrations'];

  return (
    <div className="space-y-5">
      <PageHeader title={t('settingsTitle')} />

      {/* Tab Bar */}
      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl w-fit flex-wrap border border-gray-250/20">
        {TABS.map(tKey => (
          <button
            key={tKey}
            onClick={() => setTab(tKey)}
            className={`px-4.5 py-2 rounded-lg text-sm font-bold transition-all capitalize select-none min-h-[38px] ${
              tab === tKey
                ? 'bg-white text-gray-950 shadow-sm border border-gray-200/20'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {t(tKey)}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="space-y-5">
          {/* Language Selection Card */}
          <Card className="border border-gray-200">
            <h3 className="font-extrabold text-gray-900 mb-2.5">{t('selectLanguage')}</h3>
            <p className="text-gray-500 text-xs font-semibold mb-4">Choose your preferred application language instantly.</p>
            <LanguageSelector />
          </Card>

          <Card className="border border-gray-200">
            <h3 className="font-extrabold text-gray-900 mb-5">{t('agencyProfile')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ['agencyName', t('agencyName'), true],
                ['ownerName', t('ownerName'), true],
                ['phone', t('phone'), true],
                ['alternatePhone', t('alternatePhone')],
                ['city', t('city')],
                ['state', t('stateLabel')],
                ['pincode', t('pincode')],
                ['gstin', t('gstin')],
              ].map(([k, l, req]) => (
                <div key={k}>
                  <label className="label">{l}{req && <span className="text-red-500 ml-0.5">*</span>}</label>
                  <input
                    className="input-base text-gray-900 font-bold border-2 border-gray-200 focus:border-brand-500 min-h-[44px]"
                    value={profile[k] || ''}
                    onChange={e => setProfile(p => ({ ...p, [k]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="col-span-full sm:col-span-2">
                <label className="label">{t('address')}</label>
                <input
                  className="input-base text-gray-900 font-bold border-2 border-gray-200 focus:border-brand-500 min-h-[44px]"
                  value={profile.address || ''}
                  onChange={e => setProfile(p => ({ ...p, address: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">{t('businessType')}</label>
                <select
                  className="input-base bg-white border-2 border-gray-200 focus:border-brand-500 min-h-[44px] text-gray-950 font-bold"
                  value={profile.businessType}
                  onChange={e => setProfile(p => ({ ...p, businessType: e.target.value }))}
                >
                  <option value="mixed">Mixed (Bikes + Cars + Equipment)</option>
                  <option value="bike_rental">Bike / Scooter Rental</option>
                  <option value="car_rental">Car Rental</option>
                  <option value="equipment_rental">Equipment Rental</option>
                  <option value="vehicle_rental">All Vehicles</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button loading={saving} onClick={saveProfile}>
                {t('saveChanges')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Notifications Tab */}
      {tab === 'notifications' && (
        <Card className="border border-gray-200">
          <h3 className="font-extrabold text-gray-900 mb-5">{t('notificationSettings')}</h3>
          <div className="space-y-5">
            {/* WhatsApp toggle */}
            <div className="flex items-center justify-between p-4.5 bg-gray-50 border border-gray-150 rounded-2xl">
              <div className="flex items-center gap-3.5">
                <div className="p-2 bg-green-100 text-green-700 rounded-xl border border-green-200/10">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <p className="font-extrabold text-gray-900 text-sm">{t('whatsappAlerts')}</p>
                  <p className="text-xs text-gray-500 font-semibold mt-0.5">{t('whatsappAlertsDesc')}</p>
                </div>
              </div>
              <button
                onClick={() => setSettings(s => ({ ...s, whatsappEnabled: !s.whatsappEnabled }))}
                className={`relative w-12 h-6.5 rounded-full transition-colors duration-150 focus:outline-none ${settings.whatsappEnabled ? 'bg-brand-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-1 left-1 w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform duration-150 ${settings.whatsappEnabled ? 'translate-x-5.5' : ''}`} />
              </button>
            </div>

            {settings.whatsappEnabled && (
              <div className="animate-fade-in space-y-1">
                <label className="label">{t('whatsappNumber')}</label>
                <input
                  className="input-base text-gray-900 font-bold border-2 border-gray-200 focus:border-brand-500 min-h-[44px]"
                  placeholder="+91 9876543210"
                  value={settings.whatsappNumber}
                  onChange={e => setSettings(s => ({ ...s, whatsappNumber: e.target.value }))}
                />
                <p className="text-xs text-gray-400 font-semibold mt-1.5 flex items-center gap-1">
                  <Info size={12} /> Configured via Twilio — add your API key in integrations tab
                </p>
              </div>
            )}

            {/* Email toggle */}
            <div className="flex items-center justify-between p-4.5 bg-gray-50 border border-gray-150 rounded-2xl">
              <div className="flex items-center gap-3.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl border border-blue-200/10">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="font-extrabold text-gray-900 text-sm">{t('emailNotifications')}</p>
                  <p className="text-xs text-gray-500 font-semibold mt-0.5">{t('emailNotificationsDesc')}</p>
                </div>
              </div>
              <button
                onClick={() => setSettings(s => ({ ...s, emailNotifications: !s.emailNotifications }))}
                className={`relative w-12 h-6.5 rounded-full transition-colors duration-150 focus:outline-none ${settings.emailNotifications ? 'bg-brand-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-1 left-1 w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform duration-150 ${settings.emailNotifications ? 'translate-x-5.5' : ''}`} />
              </button>
            </div>

            {/* Daily Sales Report WhatsApp Card */}
            <div className="p-4.5 bg-gray-50 border border-gray-150 rounded-2xl space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-xl border border-purple-200/10">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <p className="font-extrabold text-gray-900 text-sm">Daily Sales report on WhatsApp</p>
                    <p className="text-xs text-gray-500 font-semibold mt-0.5">Receive your CRM's sales metrics automatically at 9:30 PM IST daily.</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[38px] border-2 border-purple-200 text-purple-700 hover:bg-purple-50"
                  loading={sendingTestReport}
                  onClick={triggerTestReport}
                >
                  Send Test Report
                </Button>
              </div>
            </div>

            <div>
              <label className="label">{t('overdueAlertDays')}</label>
              <select
                className="input-base bg-white border-2 border-gray-200 focus:border-brand-500 min-h-[44px] text-gray-950 font-bold"
                value={settings.overdueAlertDays}
                onChange={e => setSettings(s => ({ ...s, overdueAlertDays: +e.target.value }))}
              >
                <option value={0}>Same day (due date)</option>
                <option value={1}>1 day after</option>
                <option value={2}>2 days after</option>
                <option value={3}>3 days after</option>
              </select>
            </div>

            <div>
              <label className="label">{t('depositPolicy')}</label>
              <textarea
                className="input-base resize-none text-gray-900 font-bold border-2 border-gray-200 focus:border-brand-500"
                rows={2}
                value={settings.depositPolicy}
                onChange={e => setSettings(s => ({ ...s, depositPolicy: e.target.value }))}
              />
            </div>

            <div className="flex justify-end">
              <Button loading={saving} onClick={saveProfile}>
                {t('saveNotificationSettings')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Staff Tab */}
      {tab === 'staff' && (
        <Card className="border border-gray-200">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <h3 className="font-extrabold text-gray-900">{t('staffMembers')}</h3>
            <Button size="sm" onClick={() => setShowInvite(true)} className="min-h-[38px] shadow-sm">
              <Plus size={14} />
              {t('inviteStaff').replace('＋ ', '')}
            </Button>
          </div>

          {/* Owner row */}
          <div className="flex items-center gap-3.5 p-4 bg-brand-50 border border-brand-200 rounded-2xl mb-4.5">
            <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white font-black flex-shrink-0 shadow-sm">
              {user?.ownerName?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-extrabold text-gray-900 leading-tight">{user?.ownerName}</p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">{user?.email}</p>
            </div>
            <span className="text-[11px] font-black text-brand-700 bg-brand-100/80 px-2.5 py-1 rounded-full uppercase tracking-wider">{t('owner')}</span>
          </div>

          {staff.length === 0 ? (
            <div className="text-center py-10 text-gray-400 font-bold">
              <div className="p-3 bg-gray-50 rounded-full w-fit mx-auto mb-3 border border-gray-150">
                <Trash2 size={24} className="text-gray-400" />
              </div>
              <p className="text-sm font-semibold">{t('inviteStaffDesc')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {staff.map(s => (
                <div key={s._id} className="flex items-center gap-3.5 p-3.5 bg-gray-50 border border-gray-150 rounded-2xl">
                  <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-black flex-shrink-0 shadow-sm">
                    {s.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-extrabold text-gray-900 leading-tight">{s.name}</p>
                    <p className="text-xs text-gray-500 font-semibold mt-0.5">{s.email}</p>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1.5 rounded-full bg-gray-200/50 text-gray-600 tracking-wider">
                    {s.role}
                  </span>
                  <Button size="sm" variant="danger" className="min-h-[38px]" onClick={() => removeStaff(s._id)}>
                    <Trash2 size={14} />
                    {t('remove')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Plans Tab */}
      {tab === 'plans' && (
        <div className="space-y-4">
          <Card className="border border-gray-200">
            <h3 className="font-extrabold text-gray-900 mb-1.5">{t('currentPlan')}</h3>
            <p className="text-sm text-gray-550 mb-6 font-semibold">
              You're currently on the <span className="font-black text-brand-600 capitalize">{user?.plan}</span>.
              {user?.planExpiresAt && ` Expires ${fmtDate(user.planExpiresAt)}.`}
              {user?.trialEndsAt && new Date(user.trialEndsAt) > new Date() && (
                <span className="text-green-600 font-extrabold"> {t('trialActive')} {fmtDate(user.trialEndsAt)}.</span>
              )}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(PLAN_FEATURES).map(([plan, info]) => (
                <div key={plan} className={`border-2 rounded-2xl p-5 bg-white relative flex flex-col justify-between ${info.color} ${user?.plan === plan ? 'shadow-md border-brand-500' : ''}`}>
                  <div>
                    <div className="flex items-center justify-between mb-3.5">
                      <p className="font-black text-gray-900 capitalize text-base">{plan}</p>
                      {user?.plan === plan && (
                        <span className="text-[10px] bg-brand-600 text-white px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">Current</span>
                      )}
                    </div>
                    <p className="text-2xl font-black text-gray-950 mb-5 leading-tight">{info.price}</p>
                    <ul className="space-y-3 font-semibold text-xs text-gray-650">
                      {info.features.map(f => (
                        <li key={f} className="flex items-start gap-1.5 leading-tight">
                          <Check size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {user?.plan !== plan && plan !== 'enterprise' && (
                    <Button size="sm" className="w-full mt-6" onClick={() => toast.success('Razorpay payment integration — configure in production')}>
                      Upgrade
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Integrations Tab */}
      {tab === 'integrations' && (
        <Card className="border border-gray-200">
          <h3 className="font-extrabold text-gray-900 mb-5">{t('integrations')}</h3>
          <div className="space-y-4 font-semibold text-sm">
            {[
              { name: 'Cloudinary', icon: Cloud, desc: 'ID proof photos & vehicle images storage', status: 'Configure in .env', color: 'bg-blue-50/50 border-blue-100 text-blue-700' },
              { name: 'Twilio WhatsApp', icon: MessageSquare, desc: 'Overdue alerts & rental confirmations via WhatsApp API', status: 'Configure in .env', color: 'bg-green-50/50 border-green-100 text-green-700' },
              { name: 'Razorpay', icon: CreditCard, desc: 'Online payment collection & subscription billing', status: 'Configure in .env', color: 'bg-blue-50/50 border-blue-100 text-blue-700' },
              { name: 'Nodemailer / Gmail SMTP', icon: Mail, desc: 'Email notifications and staff invites', status: 'Configure in .env', color: 'bg-red-50/50 border-red-100 text-red-700' },
              { name: 'Redis / BullMQ', icon: Zap, desc: 'Background job queues for automated alerts', status: 'Configure in .env', color: 'bg-orange-50/50 border-orange-100 text-orange-700' },
              { name: 'MongoDB Atlas', icon: Database, desc: 'Primary database — all your data', status: 'Connected', color: 'bg-green-50/50 border-green-100 text-green-750' },
            ].map(intg => {
              const IconComp = intg.icon;
              return (
                <div key={intg.name} className="flex items-center gap-4.5 p-4 bg-white border border-gray-200 rounded-2xl hover:shadow-sm transition-all duration-150">
                  <div className={`p-2.5 rounded-xl border border-current/10 ${intg.color} flex items-center justify-center`}>
                    <IconComp size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-gray-900 text-base leading-tight">{intg.name}</p>
                    <p className="text-xs text-gray-500 font-semibold mt-1 leading-tight">{intg.desc}</p>
                  </div>
                  <span className={`text-xs font-black px-3 py-1.5 rounded-full shadow-sm border ${
                    intg.status === 'Connected'
                      ? 'bg-green-50 text-green-700 border-green-100'
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                  }`}>
                    {intg.status === 'Connected' ? t('connected') : t('configureInEnv')}
                  </span>
                </div>
              );
            })}
          </div>
          
          <div className="mt-5 p-4.5 bg-gray-50 rounded-2xl border border-gray-200 flex gap-3 items-start">
            <BookOpen size={20} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">📋 Setup Instructions</p>
              <p className="text-xs text-gray-500 font-semibold mt-1 leading-relaxed">Copy <code className="bg-gray-200 px-1.5 py-0.5 rounded font-mono font-bold text-gray-700">.env.example</code> to <code className="bg-gray-200 px-1.5 py-0.5 rounded font-mono font-bold text-gray-700">.env</code> in the backend directory and fill in your credentials. Run <code className="bg-gray-200 px-1.5 py-0.5 rounded font-mono font-bold text-gray-700">npm run dev</code> to start.</p>
            </div>
          </div>
        </Card>
      )}

      {/* Invite Staff Modal */}
      {showInvite && (
        <Modal title={t('inviteStaffTitle')} onClose={() => setShowInvite(false)}>
          <div className="space-y-4">
            <div>
              <Input label={t('fullName')} required value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Input label={t('emailAddress')} type="email" required value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input-base bg-white border-2 border-gray-200 focus:border-brand-500 min-h-[44px] text-gray-950 font-bold" value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}>
                <option value="staff">Staff (Create rentals, collect payments)</option>
                <option value="manager">Manager (All except billing)</option>
                <option value="accountant">Accountant (Payments & reports only)</option>
                <option value="viewer">Viewer (Read only)</option>
              </select>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-800 flex items-start gap-2 font-semibold">
              <Info size={14} className="flex-shrink-0 mt-0.5 text-blue-600" />
              <span>{t('inviteStaffDesc')}</span>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowInvite(false)}>{t('cancel')}</Button>
              <Button className="flex-1" onClick={handleInvite}>{t('confirm')}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
