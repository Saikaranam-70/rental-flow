import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { customersAPI } from '../api';
import { fmt, fmtDate, getTierLabel, getTierColor, categoryIcon, getErrorMessage, cn } from '../utils/helpers';
import { Card, Button, Badge, Avatar, DynamicIcon } from '../components/ui';
import useLangStore, { getWhatsAppLink } from '../store/langStore';
import { ChevronLeft, MessageCircle, FileText, Upload, Trash, Compass, MapPin, Calendar, Coins, UserCheck, ShieldAlert } from 'lucide-react';

export function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState({});
  const { t, language } = useLangStore();

  const { data, isLoading } = useQuery(['customer', id], () => customersAPI.getOne(id));
  const result = data?.data?.data;
  const customer = result;
  const rentals = result?.rentalHistory || [];

  const handleFileUpload = async (idType, side, file) => {
    if (!file) return;
    const key = `${idType}_${side || 'front'}`;
    setUploading(prev => ({ ...prev, [key]: true }));
    const formData = new FormData();
    formData.append('file', file);
    formData.append('idType', idType);
    if (side) formData.append('side', side);

    try {
      await customersAPI.uploadId(customer._id, formData);
      toast.success(`${idType.toUpperCase()} proof uploaded successfully!`);
      qc.invalidateQueries(['customer', id]);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
    }
  };

  if (isLoading) return <div className="text-center py-20 text-gray-500 font-bold">{t('loading')}</div>;
  if (!customer) return <div className="text-center py-20 text-gray-500 font-bold">{t('noCustomers')}</div>;

  const waChatLink = getWhatsAppLink(customer.phone, 'chat', { customerName: customer.name }, language);

  const DocSlot = ({ idType, side, url, label }) => {
    const key = `${idType}_${side || 'front'}`;
    const isPdf = url && (url.toLowerCase().endsWith('.pdf') || url.includes('/raw/upload/'));
    const isLd = uploading[key];

    return (
      <div className="relative border border-dashed border-gray-300 rounded-xl p-3 flex flex-col items-center justify-center min-h-[110px] bg-gray-50 hover:bg-gray-100 transition-all select-none">
        {isLd && (
          <div className="absolute inset-0 bg-white/95 rounded-xl flex items-center justify-center z-10">
            <span className="text-xs font-bold text-gray-600 animate-pulse">{t('loading')}</span>
          </div>
        )}

        {url ? (
          <div className="w-full space-y-2 flex flex-col items-center">
            {isPdf ? (
              <FileText size={32} className="text-brand-600" />
            ) : (
              <img src={url} alt={label} className="w-full h-16 object-cover rounded-lg shadow-sm border border-gray-250" />
            )}
            <div className="flex gap-2.5">
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors"
              >
                {t('view')}
              </a>
              <label className="text-xs font-bold text-gray-500 hover:text-gray-900 cursor-pointer transition-colors">
                {t('replace')}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => handleFileUpload(idType, side, e.target.files[0])}
                />
              </label>
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full text-gray-400 hover:text-gray-700">
            <Upload size={22} className="mb-1 text-gray-400" />
            <span className="text-xs font-bold text-center">{t(label.toLowerCase()) || label}</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => handleFileUpload(idType, side, e.target.files[0])}
            />
          </label>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/customers')} className="w-9 h-9 bg-white hover:bg-gray-150 border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <h1 className="text-xl font-black text-gray-950 tracking-tight">{t('customerProfile')}</h1>
      </div>

      {/* Header Profile Info */}
      <Card>
        <div className="flex items-start gap-5 flex-wrap sm:flex-nowrap">
          <Avatar name={customer.name} size="xl" color={customer.isBlacklisted ? 'red' : 'brand'} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">{customer.name}</h2>
              {customer.isBlacklisted ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                  <ShieldAlert size={12} />
                  {t('blacklistedStatus')}
                </span>
              ) : (
                <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm', getTierColor(customer.tier))}>
                  {t(getTierLabel(customer.tier))}
                </span>
              )}
            </div>
            
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-600 font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="text-gray-400">📱</span> {customer.phone}
              </span>
              {customer.email && (
                <span className="flex items-center gap-1.5">
                  <span className="text-gray-400">✉️</span> {customer.email}
                </span>
              )}
              {customer.city && (
                <span className="flex items-center gap-1.5">
                  <span className="text-gray-400">🏙️</span> {customer.city}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span className="text-gray-400">📅</span> {t('joined')}: {fmtDate(customer.createdAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-gray-400">🏍️</span> {customer.totalRentals} {t('rentals')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-gray-400">💰</span> {t('amountPaid')}: {fmt(customer.totalAmountPaid)}
              </span>
            </div>

            {customer.isBlacklisted && customer.blacklistReason && (
              <div className="mt-4 text-xs font-bold text-red-700 bg-red-50 rounded-xl px-4 py-2.5 border border-red-150 flex items-start gap-1.5">
                <ShieldAlert size={14} className="flex-shrink-0 mt-0.5" />
                <span><strong>Reason:</strong> {customer.blacklistReason}</span>
              </div>
            )}
          </div>
          
          <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
            {/* WhatsApp Quick Chat */}
            <a
              href={waChatLink}
              target="_blank"
              rel="noreferrer"
              className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl shadow-sm transition-all duration-150 active:scale-95 flex items-center justify-center border border-green-600/10"
              title="WhatsApp Chat"
            >
              <MessageCircle size={20} />
            </a>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Address & Info */}
        <div className="md:col-span-1">
          <Card className="h-full">
            <h3 className="font-extrabold text-gray-500 text-xs uppercase tracking-wider mb-4">{t('address')} & {t('source')}</h3>
            <div className="space-y-3.5 text-sm font-semibold">
              {[
                [t('address'), customer.address],
                [t('city'), customer.city],
                [t('stateLabel'), customer.state],
                [t('pincode'), customer.pincode],
                [t('source'), customer.source?.replace('_', ' ')],
                [t('alternatePhone'), customer.alternatePhone],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                  <span className="text-gray-400 font-bold">{k}</span>
                  <span className="text-gray-900 capitalize text-right">{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ID Proofs & Documents */}
        <div className="md:col-span-2">
          <Card>
            <h3 className="font-extrabold text-gray-500 text-xs uppercase tracking-wider mb-4">{t('documents')}</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Aadhaar Card */}
              <div className="border-2 border-gray-100 rounded-xl p-3 bg-white space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-extrabold text-xs text-gray-900 uppercase">{t('aadhaarCard')}</h4>
                    <p className="text-xs font-mono font-bold text-gray-500 mt-0.5">{customer.aadhaarNumber || 'Not added'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <DocSlot idType="aadhaar" side="front" url={customer.aadhaarFrontUrl} label="Front" />
                  <DocSlot idType="aadhaar" side="back" url={customer.aadhaarBackUrl} label="Back" />
                </div>
              </div>

              {/* Driving License */}
              <div className="border-2 border-gray-100 rounded-xl p-3 bg-white space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-extrabold text-xs text-gray-900 uppercase">{t('drivingLicense')}</h4>
                    <p className="text-xs font-mono font-bold text-gray-500 mt-0.5">
                      {customer.dlNumber || 'Not added'}
                      {customer.dlExpiryDate && ` (Exp: ${fmtDate(customer.dlExpiryDate)})`}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <DocSlot idType="dl" side="front" url={customer.dlFrontUrl} label="Front" />
                  <DocSlot idType="dl" side="back" url={customer.dlBackUrl} label="Back" />
                </div>
              </div>

              {/* Passport */}
              <div className="border-2 border-gray-100 rounded-xl p-3 bg-white space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-extrabold text-xs text-gray-900 uppercase">{t('passport')}</h4>
                    <p className="text-xs font-mono font-bold text-gray-500 mt-0.5">{customer.passportNumber || 'Not added'}</p>
                  </div>
                </div>
                <div className="pt-1">
                  <DocSlot idType="passport" side="front" url={customer.passportUrl} label="Upload" />
                </div>
              </div>

              {/* Voter ID */}
              <div className="border-2 border-gray-100 rounded-xl p-3 bg-white space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-extrabold text-xs text-gray-900 uppercase">{t('voterId')}</h4>
                    <p className="text-xs font-mono font-bold text-gray-500 mt-0.5">{customer.voterIdNumber || 'Not added'}</p>
                  </div>
                </div>
                <div className="pt-1">
                  <DocSlot idType="voterid" side="front" url={customer.voterIdUrl} label="Upload" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Rental History */}
      <Card>
        <h3 className="font-extrabold text-gray-500 text-xs uppercase tracking-wider mb-4">{t('rentalHistory')}</h3>
        {rentals.length === 0 ? (
          <p className="text-gray-400 text-sm font-semibold text-center py-6">No rentals yet</p>
        ) : (
          <div className="space-y-3">
            {rentals.map(r => (
              <div
                key={r._id}
                onClick={() => navigate(`/rentals/${r._id}`)}
                className="flex items-center gap-4 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors border border-gray-150"
              >
                <div className="text-gray-500">
                  <DynamicIcon name={categoryIcon(r.inventoryId?.category)} size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-sm text-gray-900 truncate">{r.inventoryId?.name}</p>
                  <p className="text-xs text-gray-400 font-semibold mt-0.5">{fmtDate(r.startDate)} → {fmtDate(r.expectedReturnDate)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900 text-sm">{fmt(r.totalAmount)}</p>
                  <Badge status={r.status} label={r.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default CustomerProfile;
