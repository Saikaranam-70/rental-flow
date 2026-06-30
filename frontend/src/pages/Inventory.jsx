import { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { inventoryAPI } from '../api';
import { fmt, fmtDate, categoryIcon, categoryLabel, getErrorMessage } from '../utils/helpers';
import { PageHeader, SearchInput, Card, Button, Badge, Modal, EmptyState, StatCard, DynamicIcon } from '../components/ui';
import NewRentalModal from '../components/rentals/NewRentalModal';
import useLangStore from '../store/langStore';
import { Plus, Wrench, Key, AlertTriangle, Info, Calendar } from 'lucide-react';

const CATEGORIES = ['all', 'bike', 'scooter', 'car', 'cycle', 'auto', 'equipment', 'other'];

export default function Inventory() {
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [maintenanceTarget, setMaintenanceTarget] = useState(null);
  const [rentOutTarget, setRentOutTarget] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const { t } = useLangStore();

  const [form, setForm] = useState({
    name:'', brand:'', model:'', year:'', color:'', category:'bike', fuelType:'petrol',
    engineCC:'', registrationNumber:'', dailyRate:'', depositAmount:'', lateFeePerDay:'',
    insuranceExpiryDate:'', pucExpiryDate:'', description:'', photoUrl: ''
  });
  const [maintForm, setMaintForm] = useState({ description:'', cost:'', nextServiceDate:'', servicedBy:'', status:'' });

  const { data, isLoading } = useQuery(['inventory', catFilter, statusFilter, search], () =>
    inventoryAPI.getAll({
      category: catFilter !== 'all' ? catFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      search: search || undefined, limit: 100,
    })
  );
  const { data: statsData } = useQuery('inventory-stats', inventoryAPI.getStats);

  const items = data?.data?.data || [];
  const stats = statsData?.data?.data?.stats || [];
  const expiringDocs = statsData?.data?.data?.expiringDocs || [];

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    if (!form.name || !form.dailyRate || !form.depositAmount || !form.category) {
      toast.error(t('fleetInventory') + ' ' + t('required')); return;
    }
    setSaving(true);
    try {
      const photos = form.photoUrl ? [{ url: form.photoUrl.trim(), isPrimary: true }] : [];
      const res = await inventoryAPI.create({
        ...form,
        photos,
        dailyRate: +form.dailyRate,
        depositAmount: +form.depositAmount,
        lateFeePerDay: +form.lateFeePerDay || 0,
        year: +form.year || undefined,
        engineCC: +form.engineCC || undefined
      });
      
      const createdItem = res?.data?.data;
      if (photoFile && createdItem?._id) {
        toast.loading('Uploading vehicle photo...', { id: 'vehicle-photo-upload' });
        const formData = new FormData();
        formData.append('photo', photoFile);
        formData.append('isPrimary', 'true');
        await inventoryAPI.uploadPhoto(createdItem._id, formData);
        toast.success('Photo uploaded successfully!', { id: 'vehicle-photo-upload' });
      }

      toast.success('Item added to fleet! 🏍️');
      setShowAdd(false);
      setPhotoFile(null);
      setForm({
        name:'', brand:'', model:'', year:'', color:'', category:'bike', fuelType:'petrol',
        engineCC:'', registrationNumber:'', dailyRate:'', depositAmount:'', lateFeePerDay:'',
        insuranceExpiryDate:'', pucExpiryDate:'', description:'', photoUrl: ''
      });
      qc.invalidateQueries('inventory');
      qc.invalidateQueries('inventory-stats');
    } catch (err) { 
      toast.error(getErrorMessage(err), { id: 'vehicle-photo-upload' }); 
    }
    finally { setSaving(false); }
  };

  const handleMaintenance = async () => {
    setSaving(true);
    try {
      await inventoryAPI.addMaintenance(maintenanceTarget._id, maintForm);
      toast.success('Maintenance log added');
      setMaintenanceTarget(null);
      qc.invalidateQueries('inventory');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const statusColors = { available: 'text-green-600', rented: 'text-orange-600', maintenance: 'text-purple-600' };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('fleetInventory')}
        subtitle={`${items.length} total`}
        action={
          <Button onClick={() => setShowAdd(true)} className="shadow-sm">
            <Plus size={16} />
            {t('addItem')}
          </Button>
        }
      />

      {/* Status Stats Row */}
      <div className="flex gap-4 flex-wrap">
        {stats.map(s => (
          <StatCard
            key={s._id}
            label={t(s._id) || s._id}
            value={s.count}
            sub={fmt(s.totalRevenue) + ' revenue'}
            color={statusColors[s._id] || 'text-gray-900'}
            icon={categoryIcon(s._id)}
          />
        ))}
      </div>

      {/* Expiring Docs Warning */}
      {expiringDocs.length > 0 && (
        <div className="bg-orange-50 border border-orange-200/60 rounded-2xl p-4.5 flex items-start gap-3">
          <AlertTriangle className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-extrabold text-orange-800 text-sm mb-1.5">{t('docsExpiringSoon')}</p>
            <div className="space-y-1">
              {expiringDocs.map(d => (
                <p key={d._id} className="text-xs text-orange-700 font-semibold">
                  {d.name} — Insurance: {fmtDate(d.insuranceExpiryDate)} · PUC: {fmtDate(d.pucExpiryDate)}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex gap-4 flex-wrap items-center">
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all duration-150 flex items-center gap-1.5 ${
                catFilter === c
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-800'
              }`}
            >
              {c === 'all' ? t('all') : (
                <>
                  <DynamicIcon name={categoryIcon(c)} size={13} />
                  {t(c) || categoryLabel(c)}
                </>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-3 flex-1 min-w-[300px]">
          <select
            className="input-base bg-white border-2 border-gray-200 focus:border-brand-500 min-h-[44px] text-gray-900 font-bold text-sm w-auto whitespace-nowrap"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">{t('all')}</option>
            <option value="available">{t('available')}</option>
            <option value="rented">{t('rented')}</option>
            <option value="maintenance">{t('maintenance')}</option>
          </select>
          <div className="flex-1">
            <SearchInput value={search} onChange={setSearch} placeholder={t('searchVehiclePlaceholder')} />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Card key={i} className="h-44 animate-pulse bg-gray-150" />)}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon="Package"
            title={t('noItemsFound')}
            description={t('noItemsDesc')}
            action={
              <Button onClick={() => setShowAdd(true)}>
                <Plus size={16} />
                {t('addItem')}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <Card key={item._id} className="hover:shadow-md transition-all flex flex-col justify-between border border-gray-200 p-5">
              <div>
                {item.primaryPhoto ? (
                  <div className="w-full h-36 rounded-xl overflow-hidden mb-3.5 bg-gray-100 relative shadow-inner">
                    <img src={item.primaryPhoto} alt={item.name} className="w-full h-full object-cover" />
                    <Badge status={item.status} label={item.status} className="absolute top-2.5 right-2.5" />
                  </div>
                ) : (
                  <div className="w-full h-36 rounded-xl flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 mb-3.5 relative">
                    <DynamicIcon name={categoryIcon(item.category)} size={36} className="text-gray-400" />
                    <Badge status={item.status} label={item.status} className="absolute top-2.5 right-2.5" />
                  </div>
                )}
                
                <h3 className="font-extrabold text-gray-900 text-base leading-tight">{item.name}</h3>
                {item.registrationNumber && item.registrationNumber !== 'N/A' && (
                  <p className="text-xs text-gray-500 mt-1 font-mono font-bold">{item.registrationNumber}</p>
                )}
                <p className="text-xs text-gray-400 font-semibold mt-0.5">
                  {item.color}
                  {item.year ? ` · ${item.year}` : ''}
                  {item.engineCC ? ` · ${item.engineCC}cc` : ''}
                </p>

                <div className="flex justify-between mt-4 pt-4 border-t border-gray-100 font-bold">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t('dailyRate')}</p>
                    <p className="font-black text-brand-600 text-lg leading-tight mt-0.5">{fmt(item.dailyRate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t('depositAmount')}</p>
                    <p className="font-extrabold text-gray-800 text-base leading-tight mt-0.5">{fmt(item.depositAmount)}</p>
                  </div>
                </div>

                {(item.isInsuranceExpired || item.isPUCExpired) && (
                  <div className="mt-3.5 p-2 bg-red-50 rounded-lg border border-red-100 flex items-center gap-1.5 text-xs text-red-700 font-bold">
                    <AlertTriangle size={14} className="flex-shrink-0" />
                    <span>
                      {item.isInsuranceExpired && item.isPUCExpired
                        ? 'Insurance & PUC Expired'
                        : item.isInsuranceExpired
                          ? 'Insurance Expired'
                          : 'PUC Expired'}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex gap-2.5">
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => setMaintenanceTarget(item)}>
                  <Wrench size={14} />
                  {t('logService').replace('🔧 ', '')}
                </Button>
                {item.status === 'available' && (
                  <Button size="sm" className="flex-1" onClick={() => setRentOutTarget(item)}>
                    <Key size={14} />
                    {t('rentOut').replace('🔑 ', '')}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      {showAdd && (
        <Modal title={t('addItem')} onClose={() => setShowAdd(false)} size="lg">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input
                label={t('fullName')}
                required
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
            </div>
            <div>
              <Input
                label={t('brand')}
                value={form.brand}
                onChange={e => set('brand', e.target.value)}
              />
            </div>
            <div>
              <Input
                label={t('model')}
                value={form.model}
                onChange={e => set('model', e.target.value)}
              />
            </div>
            <div>
              <Input
                label={t('year')}
                type="number"
                value={form.year}
                onChange={e => set('year', e.target.value)}
              />
            </div>
            <div>
              <Input
                label={t('color')}
                value={form.color}
                onChange={e => set('color', e.target.value)}
              />
            </div>
            <div>
              <label className="label">{t('category')} <span className="text-red-500">*</span></label>
              <select
                className="input-base bg-white border-2 border-gray-200 focus:border-brand-500 min-h-[44px] text-gray-900 font-bold"
                value={form.category}
                onChange={e => set('category', e.target.value)}
              >
                {CATEGORIES.filter(c => c !== 'all').map(c => (
                  <option key={c} value={c}>{t(c) || categoryLabel(c)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('fuelType')}</label>
              <select
                className="input-base bg-white border-2 border-gray-200 focus:border-brand-500 min-h-[44px] text-gray-900 font-bold"
                value={form.fuelType}
                onChange={e => set('fuelType', e.target.value)}
              >
                {['petrol','diesel','electric','cng','na'].map(f => (
                  <option key={f} value={f}>{f.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <Input
                label={t('engineCc')}
                type="number"
                value={form.engineCC}
                onChange={e => set('engineCC', e.target.value)}
              />
            </div>
            <div>
              <Input
                label={t('registrationNumber')}
                value={form.registrationNumber}
                onChange={e => set('registrationNumber', e.target.value)}
              />
            </div>
            <div>
              <Input
                label={t('dailyRate')}
                type="number"
                required
                value={form.dailyRate}
                onChange={e => set('dailyRate', e.target.value)}
              />
            </div>
            <div>
              <Input
                label={t('depositAmount')}
                type="number"
                required
                value={form.depositAmount}
                onChange={e => set('depositAmount', e.target.value)}
              />
            </div>
            <div>
              <Input
                label={t('lateFeePerDay')}
                type="number"
                value={form.lateFeePerDay}
                onChange={e => set('lateFeePerDay', e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Input
                label={t('insuranceExpiry')}
                type="date"
                value={form.insuranceExpiryDate}
                onChange={e => set('insuranceExpiryDate', e.target.value)}
              />
            </div>
            <div>
              <Input
                label={t('pucExpiry')}
                type="date"
                value={form.pucExpiryDate}
                onChange={e => set('pucExpiryDate', e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="label">{t('photo')}</label>
              <input type="file" accept="image/*" className="input-base text-sm py-2" onChange={e => setPhotoFile(e.target.files[0])} />
              {photoFile && <p className="text-xs text-green-600 mt-1.5 font-bold">✓ Selected: {photoFile.name}</p>}
            </div>
            <div className="col-span-2">
              <Textarea
                label={t('description')}
                rows={2}
                value={form.description}
                onChange={e => set('description', e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>
              {t('cancel')}
            </Button>
            <Button className="flex-1" loading={saving} onClick={handleAdd}>
              {t('addToFleet')}
            </Button>
          </div>
        </Modal>
      )}

      {/* Maintenance Modal */}
      {maintenanceTarget && (
        <Modal title={`${t('logService').replace('🔧 ', '')} — ${maintenanceTarget.name}`} onClose={() => setMaintenanceTarget(null)}>
          <div className="space-y-4">
            <div>
              <Textarea
                label={t('description')}
                rows={2}
                value={maintForm.description}
                onChange={e => setMaintForm(f => ({ ...f, description: e.target.value }))}
                placeholder={t('oilChangePlaceholder')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  label="Cost (₹)"
                  type="number"
                  value={maintForm.cost}
                  onChange={e => setMaintForm(f => ({ ...f, cost: e.target.value }))}
                />
              </div>
              <div>
                <Input
                  label={t('servicedBy')}
                  value={maintForm.servicedBy}
                  onChange={e => setMaintForm(f => ({ ...f, servicedBy: e.target.value }))}
                />
              </div>
              <div>
                <Input
                  label={t('nextServiceDate')}
                  type="date"
                  value={maintForm.nextServiceDate}
                  onChange={e => setMaintForm(f => ({ ...f, nextServiceDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">{t('setStatus')}</label>
                <select
                  className="input-base bg-white border-2 border-gray-200 focus:border-brand-500 min-h-[44px] text-gray-900 font-bold"
                  value={maintForm.status}
                  onChange={e => setMaintForm(f => ({ ...f, status: e.target.value }))}
                >
                  <option value="">{t('keepCurrent')}</option>
                  <option value="available">{t('available')}</option>
                  <option value="maintenance">{t('maintenance')}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setMaintenanceTarget(null)}>
                {t('cancel')}
              </Button>
              <Button className="flex-1" loading={saving} onClick={handleMaintenance}>
                {t('saveLog')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Rent Out Modal */}
      {rentOutTarget && (
        <NewRentalModal 
          onClose={() => setRentOutTarget(null)} 
          onSuccess={() => {
            setRentOutTarget(null);
            qc.invalidateQueries('inventory');
          }}
          preselectedVehicleId={rentOutTarget._id}
        />
      )}
    </div>
  );
}
