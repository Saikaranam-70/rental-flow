import { useState } from 'react';
import { useQuery } from 'react-query';
import toast from 'react-hot-toast';
import { customersAPI, inventoryAPI, rentalsAPI } from '../../api';
import { Modal, Button, Input, Textarea } from '../ui';
import { fmt, categoryIcon, getErrorMessage } from '../../utils/helpers';
import useLangStore from '../../store/langStore';
import { ClipboardList, Search, Info, Check, Shield, FileText, Upload } from 'lucide-react';

export default function NewRentalModal({ onClose, onSuccess, preselectedVehicleId }) {
  const { t } = useLangStore();
  const [customerDetails, setCustomerDetails] = useState({
    name: '', phone: '', email: '', aadhaarNumber: '', dlNumber: '', passportNumber: '', voterIdNumber: '', address: '', city: ''
  });
  
  const [form, setForm] = useState({
    inventoryId: preselectedVehicleId || '',
    startDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: '', notes: '', discountAmount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [otherDocType, setOtherDocType] = useState('none'); // 'none' | 'passport' | 'voterid'
  const [files, setFiles] = useState({
    aadhaar_front: null,
    aadhaar_back: null,
    dl_front: null,
    dl_back: null,
    passport_front: null,
    passport_back: null,
    voterid_front: null,
    voterid_back: null,
  });
  const [vehicleSearch, setVehicleSearch] = useState('');

  const { data: invData } = useQuery('inventory-available', () =>
    inventoryAPI.getAll({ status: 'available', limit: 100 })
  );

  const availableItems = invData?.data?.data || [];
  
  const filteredVehicles = availableItems.filter(i => {
    const term = vehicleSearch.toLowerCase();
    return (
      i.name.toLowerCase().includes(term) ||
      (i.registrationNumber && i.registrationNumber.toLowerCase().includes(term)) ||
      i.category.toLowerCase().includes(term) ||
      (i.brand && i.brand.toLowerCase().includes(term)) ||
      (i.model && i.model.toLowerCase().includes(term))
    );
  });

  const selectedItem = availableItems.find(i => i._id === form.inventoryId);

  const days = form.startDate && form.expectedReturnDate
    ? Math.max(0, Math.ceil((new Date(form.expectedReturnDate) - new Date(form.startDate)) / (1000 * 60 * 60 * 24)))
    : 0;

  const baseAmount = selectedItem ? days * selectedItem.dailyRate : 0;
  const totalAmount = Math.max(0, baseAmount - (parseFloat(form.discountAmount) || 0));

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setCust = (k, v) => setCustomerDetails(c => ({ ...c, [k]: v }));

  const [blacklistWarning, setBlacklistWarning] = useState(null);

  const handlePhoneChange = async (phoneVal) => {
    setCust('phone', phoneVal);
    if (phoneVal.length >= 10) {
      try {
        const res = await customersAPI.getAll({ search: phoneVal.trim(), isBlacklisted: true });
        const blacklistedList = res.data?.data || [];
        const match = blacklistedList.find(c => c.phone.trim() === phoneVal.trim());
        if (match) {
          setBlacklistWarning(match.blacklistReason || 'This customer is blacklisted!');
        } else {
          setBlacklistWarning(null);
        }
      } catch (err) {
        setBlacklistWarning(null);
      }
    } else {
      setBlacklistWarning(null);
    }
  };

  const handleFileChange = (key, file) => {
    setFiles(f => ({ ...f, [key]: file }));
  };

  const handleSubmit = async () => {
    if (!customerDetails.name || !customerDetails.phone) {
      toast.error('Customer name and phone number are required'); return;
    }
    if (!form.inventoryId || !form.startDate || !form.expectedReturnDate) {
      toast.error('Please fill all required fields'); return;
    }
    if (days <= 0) { toast.error('Return date must be after start date'); return; }

    setLoading(true);
    try {
      const payload = {
        ...form,
        customerId: 'new',
        customerDetails: {
          ...customerDetails,
          passportNumber: otherDocType === 'passport' ? customerDetails.passportNumber : '',
          voterIdNumber: otherDocType === 'voterid' ? customerDetails.voterIdNumber : '',
        },
      };
      
      const res = await rentalsAPI.create(payload);
      const rental = res.data.data;
      const targetCustomerId = rental.customerId?._id || rental.customerId;

      // Upload files
      if (targetCustomerId) {
        const uploadPromises = [];
        const fileMap = [];

        // Aadhaar
        if (files.aadhaar_front) fileMap.push(['aadhaar', 'front', files.aadhaar_front]);
        if (files.aadhaar_back) fileMap.push(['aadhaar', 'back', files.aadhaar_back]);

        // DL
        if (files.dl_front) fileMap.push(['dl', 'front', files.dl_front]);
        if (files.dl_back) fileMap.push(['dl', 'back', files.dl_back]);

        // Other documents
        if (otherDocType === 'passport') {
          if (files.passport_front) fileMap.push(['passport', 'front', files.passport_front]);
          if (files.passport_back) fileMap.push(['passport', 'back', files.passport_back]);
        } else if (otherDocType === 'voterid') {
          if (files.voterid_front) fileMap.push(['voterid', 'front', files.voterid_front]);
          if (files.voterid_back) fileMap.push(['voterid', 'back', files.voterid_back]);
        }

        for (const [idType, side, file] of fileMap) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('idType', idType);
          formData.append('side', side);
          uploadPromises.push(customersAPI.uploadId(targetCustomerId, formData));
        }

        if (uploadPromises.length > 0) {
          toast.loading('Uploading documents...', { id: 'doc-upload' });
          await Promise.all(uploadPromises);
          toast.success('Documents uploaded successfully!', { id: 'doc-upload' });
        }
      }

      toast.success('Rental created successfully! 🎉');
      onSuccess?.();
    } catch (err) {
      toast.error(getErrorMessage(err), { id: 'doc-upload' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={t('createRental')} onClose={onClose} size="lg">
      <div className="space-y-5">
        
        {/* Customer Details Form */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4.5 space-y-4 shadow-sm">
          <p className="font-extrabold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-200 pb-2">
            <Shield size={14} className="text-brand-650" />
            Customer Details
          </p>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="col-span-2 sm:col-span-1">
              <Input label={t('fullName')} required placeholder="Ravi Kumar" value={customerDetails.name} onChange={e => setCust('name', e.target.value)} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Input label={t('phone')} required placeholder="9876543210" value={customerDetails.phone} onChange={e => handlePhoneChange(e.target.value)} />
              {blacklistWarning && (
                <div className="mt-1.5 p-2 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold animate-pulse">
                  ⚠️ {blacklistWarning}
                </div>
              )}
            </div>
            <div className="col-span-2">
              <Input label={t('email')} type="email" placeholder="ravi@gmail.com" value={customerDetails.email} onChange={e => setCust('email', e.target.value)} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Input label={t('city')} placeholder="Visakhapatnam" value={customerDetails.city} onChange={e => setCust('city', e.target.value)} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Input label={t('address')} placeholder="Dwaraka Nagar" value={customerDetails.address} onChange={e => setCust('address', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Unified Document Upload Center */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4.5 space-y-5 shadow-sm">
          <div>
            <p className="font-extrabold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-200 pb-2">
              <FileText size={14} className="text-brand-650" />
              Required Document Uploads
            </p>
            <p className="text-xs text-gray-550 mt-1 font-semibold">Upload document details and front/back photos below.</p>
          </div>

          {/* 1. Aadhaar Card Card */}
          <div className="bg-white border border-gray-150 rounded-2xl p-4 space-y-3.5 shadow-inner">
            <div className="flex justify-between items-center">
              <p className="text-xs font-black text-brand-600 uppercase tracking-wider">{t('aadhaarCard')}</p>
              <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-black uppercase tracking-wider">Required</span>
            </div>
            <Input label={t('aadhaarNumber')} placeholder="XXXX-XXXX-XXXX" value={customerDetails.aadhaarNumber} onChange={e => setCust('aadhaarNumber', e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t('aadhaarCard')} ({t('front')})</label>
                <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-3 hover:border-brand-400 transition-colors cursor-pointer flex flex-col items-center text-center">
                  <input type="file" accept="image/*,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={e => handleFileChange('aadhaar_front', e.target.files[0])} />
                  <Upload size={16} className="text-gray-400 mb-1" />
                  <span className="text-[10px] text-gray-500 font-bold max-w-full truncate">{files.aadhaar_front ? files.aadhaar_front.name : 'Choose File'}</span>
                </div>
              </div>
              <div>
                <label className="label">{t('aadhaarCard')} ({t('backSide')})</label>
                <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-3 hover:border-brand-400 transition-colors cursor-pointer flex flex-col items-center text-center">
                  <input type="file" accept="image/*,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={e => handleFileChange('aadhaar_back', e.target.files[0])} />
                  <Upload size={16} className="text-gray-400 mb-1" />
                  <span className="text-[10px] text-gray-500 font-bold max-w-full truncate">{files.aadhaar_back ? files.aadhaar_back.name : 'Choose File'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Driving License Card */}
          <div className="bg-white border border-gray-150 rounded-2xl p-4 space-y-3.5 shadow-inner">
            <div className="flex justify-between items-center">
              <p className="text-xs font-black text-brand-600 uppercase tracking-wider">{t('drivingLicense')}</p>
              <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-black uppercase tracking-wider">Required</span>
            </div>
            <Input label={t('dlNumber')} placeholder="AP31201900012" value={customerDetails.dlNumber} onChange={e => setCust('dlNumber', e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t('drivingLicense')} ({t('front')})</label>
                <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-3 hover:border-brand-400 transition-colors cursor-pointer flex flex-col items-center text-center">
                  <input type="file" accept="image/*,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={e => handleFileChange('dl_front', e.target.files[0])} />
                  <Upload size={16} className="text-gray-400 mb-1" />
                  <span className="text-[10px] text-gray-500 font-bold max-w-full truncate">{files.dl_front ? files.dl_front.name : 'Choose File'}</span>
                </div>
              </div>
              <div>
                <label className="label">{t('drivingLicense')} ({t('backSide')})</label>
                <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-3 hover:border-brand-400 transition-colors cursor-pointer flex flex-col items-center text-center">
                  <input type="file" accept="image/*,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={e => handleFileChange('dl_back', e.target.files[0])} />
                  <Upload size={16} className="text-gray-400 mb-1" />
                  <span className="text-[10px] text-gray-500 font-bold max-w-full truncate">{files.dl_back ? files.dl_back.name : 'Choose File'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Other Documents Dropdown Card */}
          <div className="bg-white border border-gray-150 rounded-2xl p-4 space-y-3.5 shadow-inner">
            <p className="text-xs font-black text-gray-700 uppercase tracking-wider">Other Document (Optional)</p>
            <div>
              <label className="label">Select Document Type</label>
              <select
                className="input-base bg-white border-2 border-gray-200 focus:border-brand-500 min-h-[44px] text-gray-950 font-bold"
                value={otherDocType}
                onChange={e => setOtherDocType(e.target.value)}
              >
                <option value="none">None</option>
                <option value="passport">Passport</option>
                <option value="voterid">Voter ID</option>
              </select>
            </div>

            {/* Passport fields */}
            {otherDocType === 'passport' && (
              <div className="space-y-3.5 border-t border-gray-100 pt-3 animate-fade-in">
                <Input label="Passport Number" placeholder="Z1234567" value={customerDetails.passportNumber} onChange={e => setCust('passportNumber', e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Passport Front</label>
                    <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-3 hover:border-brand-400 transition-colors cursor-pointer flex flex-col items-center text-center">
                      <input type="file" accept="image/*,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={e => handleFileChange('passport_front', e.target.files[0])} />
                      <Upload size={16} className="text-gray-400 mb-1" />
                      <span className="text-[10px] text-gray-500 font-bold max-w-full truncate">{files.passport_front ? files.passport_front.name : 'Choose File'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="label">Passport Back</label>
                    <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-3 hover:border-brand-400 transition-colors cursor-pointer flex flex-col items-center text-center">
                      <input type="file" accept="image/*,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={e => handleFileChange('passport_back', e.target.files[0])} />
                      <Upload size={16} className="text-gray-400 mb-1" />
                      <span className="text-[10px] text-gray-500 font-bold max-w-full truncate">{files.passport_back ? files.passport_back.name : 'Choose File'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Voter ID fields */}
            {otherDocType === 'voterid' && (
              <div className="space-y-3.5 border-t border-gray-100 pt-3 animate-fade-in">
                <Input label="Voter ID Card Number" placeholder="ABC1234567" value={customerDetails.voterIdNumber} onChange={e => setCust('voterIdNumber', e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Voter ID Front</label>
                    <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-3 hover:border-brand-400 transition-colors cursor-pointer flex flex-col items-center text-center">
                      <input type="file" accept="image/*,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={e => handleFileChange('voterid_front', e.target.files[0])} />
                      <Upload size={16} className="text-gray-400 mb-1" />
                      <span className="text-[10px] text-gray-500 font-bold max-w-full truncate">{files.voterid_front ? files.voterid_front.name : 'Choose File'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="label">Voter ID Back</label>
                    <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-3 hover:border-brand-400 transition-colors cursor-pointer flex flex-col items-center text-center">
                      <input type="file" accept="image/*,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={e => handleFileChange('voterid_back', e.target.files[0])} />
                      <Upload size={16} className="text-gray-400 mb-1" />
                      <span className="text-[10px] text-gray-500 font-bold max-w-full truncate">{files.voterid_back ? files.voterid_back.name : 'Choose File'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Selection */}
        <div>
          <label className="label">{t('fleet')} <span className="text-red-500">*</span></label>
          <div className="relative mb-2">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <Search size={16} />
            </span>
            <input 
              type="text" 
              placeholder={t('searchVehiclePlaceholder')} 
              className="input-base pl-10 border-2 border-gray-200 focus:border-brand-500 min-h-[44px] text-gray-900 font-bold" 
              value={vehicleSearch} 
              onChange={e => setVehicleSearch(e.target.value)} 
            />
          </div>
          <select className="input-base bg-white border-2 border-gray-200 focus:border-brand-500 min-h-[44px] text-gray-950 font-bold" value={form.inventoryId} onChange={e => set('inventoryId', e.target.value)}>
            <option value="">{t('selectAvailableItem')}</option>
            {filteredVehicles.map(i => (
              <option key={i._id} value={i._id}>
                {i.name} {i.registrationNumber ? `(${i.registrationNumber})` : ''} — {fmt(i.dailyRate)}/{t('days').slice(0,-3)}
              </option>
            ))}
          </select>
        </div>

        {/* Rental Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input label="Start Date" type="date" required value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          </div>
          <div>
            <Input label="Return Date" type="date" required value={form.expectedReturnDate} onChange={e => set('expectedReturnDate', e.target.value)} min={form.startDate} />
          </div>
        </div>

        {/* Pricing adjustments */}
        <div>
          <Input label={t('discount')} type="number" value={form.discountAmount} onChange={e => set('discountAmount', e.target.value)} placeholder="0" min="0" />
        </div>

        {/* Special Notes */}
        <div>
          <Textarea label={t('notes')} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any special instructions..." />
        </div>

        {/* Pricing Summary */}
        {selectedItem && days > 0 && (
          <div className="bg-green-50 border border-green-200/60 rounded-xl p-4.5 space-y-2.5 animate-fade-in shadow-sm font-bold text-sm">
            <p className="font-extrabold text-green-800 flex items-center gap-1.5">
              <ClipboardList size={16} />
              {t('rentalSummary')}
            </p>
            {[
              [t('fleet'), selectedItem.name],
              [t('dailyRate'), fmt(selectedItem.dailyRate)],
              [t('duration'), `${days} ${t('days')}`],
              [t('depositAmount'), fmt(selectedItem.depositAmount)],
              ['Base Amount', fmt(baseAmount)],
              form.discountAmount > 0 ? [t('discount'), `− ${fmt(form.discountAmount)}`] : null,
            ].filter(Boolean).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-green-200/10 pb-1 last:border-0 last:pb-0">
                <span className="text-gray-500 font-bold">{k}</span>
                <span className="text-gray-900">{v}</span>
              </div>
            ))}
            <div className="border-t border-green-200/60 pt-2.5 flex justify-between">
              <span className="font-extrabold text-green-800">{t('totalRentalAmount')}</span>
              <span className="font-black text-green-700 text-lg leading-tight">{fmt(totalAmount)}</span>
            </div>
            <p className="text-xs text-green-600 text-center font-bold mt-1.5 flex items-center justify-center gap-1">
              <Info size={12} />
              {t('depositNotice')}
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button type="button" className="flex-1" loading={loading} onClick={handleSubmit}>
            {t('createRental')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
