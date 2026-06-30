import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { rentalsAPI, customersAPI } from '../api';
import { fmt, fmtDate, fmtDateTime, categoryIcon, getErrorMessage, overdueDays } from '../utils/helpers';
import { Card, Button, Badge, Avatar, Modal, DynamicIcon, Input, Textarea } from '../components/ui';
import useLangStore, { getWhatsAppLink } from '../store/langStore';
import useAuthStore from '../store/authStore';
import { ChevronLeft, FileText, Receipt, AlertTriangle, Phone, Mail, User, Info, Plus, MessageCircle, MapPin, Upload, Eye } from 'lucide-react';

export function RentalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showPayment, setShowPayment] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash', type: 'rental', reference: '', note: '' });
  const [saving, setSaving] = useState(false);
  const { t, language } = useLangStore();
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery(['rental', id], () => rentalsAPI.getOne(id));
  const rental = data?.data?.data;

  if (isLoading) return <div className="text-center py-20 text-gray-500 font-bold">{t('loading')}</div>;
  if (!rental) return <div className="text-center py-20 text-gray-500 font-bold">{t('noRentalsFound')}</div>;

  const customer = rental.customerId;
  const item = rental.inventoryId;
  const days = overdueDays(rental.expectedReturnDate);
  const isActive = ['active', 'overdue'].includes(rental.status);

  const addPayment = async () => {
    if (!payForm.amount || !payForm.method) { toast.error('Amount and method required'); return; }
    setSaving(true);
    try {
      await rentalsAPI.addPayment(id, payForm);
      toast.success('Payment recorded!');
      setShowPayment(false);
      qc.invalidateQueries(['rental', id]);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleDocUpload = async (idType, side, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('idType', idType);
    formData.append('side', side || 'front');

    const toastId = toast.loading(`Uploading ${idType}...`);
    try {
      await customersAPI.uploadId(customer._id, formData);
      toast.success('Document uploaded successfully!', { id: toastId });
      qc.invalidateQueries(['rental', id]);
    } catch (err) {
      toast.error(getErrorMessage(err), { id: toastId });
    }
  };

  const getInvoiceHtml = () => {
    const baseAmount = rental.totalDays * rental.dailyRate;
    const paid = rental.payments?.filter(p => p.type !== 'refund').reduce((s, p) => s + p.amount, 0) || 0;
    const pending = Math.max(0, rental.totalAmount - paid + rental.depositAmount - (rental.depositReturned || 0));

    return `
      <div class="invoice-box">
        <div class="invoice-header">
          <div>
            <div class="invoice-title">${user?.agencyName?.toUpperCase() || 'RENTFLOW CRM'}</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Smart Rental CRM Invoice</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: bold; font-size: 16px; color: #111827;">${rental.rentalNumber}</div>
            <div style="font-size: 12px; color: #4b5563;">Date: ${new Date(rental.createdAt).toLocaleDateString('en-IN')}</div>
            <div style="font-size: 12px; color: #4b5563;">Status: <span style="text-transform: uppercase; font-weight: bold; color: ${rental.status === 'overdue' ? '#dc2626' : rental.status === 'returned' ? '#16a34a' : '#2563eb'}">${rental.status}</span></div>
          </div>
        </div>

        <div class="grid-2">
          <div>
            <h4 style="margin: 0 0 8px 0; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">CUSTOMER DETAILS</h4>
            <strong>Name:</strong> ${customer?.name || '—'}<br>
            <strong>Phone:</strong> ${customer?.phone || '—'}<br>
            ${customer?.email ? `<strong>Email:</strong> ${customer.email}<br>` : ''}
            ${customer?.aadhaarNumber ? `<strong>Aadhaar No:</strong> ${customer.aadhaarNumber}<br>` : ''}
            ${customer?.dlNumber ? `<strong>DL Number:</strong> ${customer.dlNumber}<br>` : ''}
            ${customer?.address ? `<strong>Address:</strong> ${customer.address}, ${customer.city || ''}<br>` : ''}
          </div>
          <div>
            <h4 style="margin: 0 0 8px 0; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">RENTAL DETAILS</h4>
            <strong>Vehicle:</strong> ${item?.name || '—'}<br>
            <strong>Registration:</strong> ${item?.registrationNumber && item.registrationNumber !== 'N/A' ? item.registrationNumber : '—'}<br>
            <strong>Start Date:</strong> ${new Date(rental.startDate).toLocaleDateString('en-IN')}<br>
            <strong>Return Date:</strong> ${new Date(rental.expectedReturnDate).toLocaleDateString('en-IN')}<br>
            <strong>Duration:</strong> ${rental.totalDays} Days<br>
            <strong>Daily Rate:</strong> ₹${rental.dailyRate}/day<br>
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Days</th>
              <th style="text-align: right;">Rate</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Rental charges for ${item?.name || 'Vehicle'}</td>
              <td style="text-align: right;">${rental.totalDays}</td>
              <td style="text-align: right;">₹${rental.dailyRate}</td>
              <td style="text-align: right;">₹${baseAmount}</td>
            </tr>
            ${rental.extensions?.map(ext => `
              <tr>
                <td>Extension (${new Date(ext.newReturnDate).toLocaleDateString('en-IN')})</td>
                <td style="text-align: right;">${ext.additionalDays}</td>
                <td style="text-align: right;">₹${rental.dailyRate}</td>
                <td style="text-align: right;">₹${ext.additionalAmount}</td>
              </tr>
            `).join('') || ''}
            ${rental.penaltyAmount > 0 ? `
              <tr>
                <td>Late Return Penalties / Fine</td>
                <td style="text-align: right;">—</td>
                <td style="text-align: right;">—</td>
                <td style="text-align: right; color: #dc2626;">₹${rental.penaltyAmount}</td>
              </tr>
            ` : ''}
            ${rental.discountAmount > 0 ? `
              <tr>
                <td>Discount applied</td>
                <td style="text-align: right;">—</td>
                <td style="text-align: right;">—</td>
                <td style="text-align: right; color: #16a34a;">- ₹${rental.discountAmount}</td>
              </tr>
            ` : ''}
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; gap: 40px;">
          <div>
            <h4 style="margin: 0 0 8px 0; color: #374151;">TERMS & CONDITIONS</h4>
            <div style="font-size: 11px; color: #6b7280; max-width: 400px; line-height: 1.5;">
              1. The renter is responsible for traffic violations & vehicle damage during the rental period.<br>
              2. Vehicle must be returned with the same level of fuel as at rental start.<br>
              3. Late returns will attract overdue fee. Overdue days count towards extra daily rate charges.<br>
            </div>
          </div>
          <div class="total-section">
            <div class="total-row"><span>Subtotal:</span> <span>₹${rental.totalAmount}</span></div>
            <div class="total-row"><span>Security Deposit:</span> <span>₹${rental.depositAmount}</span></div>
            <div class="total-row" style="color: #16a34a; font-weight: 500;"><span>Total Paid:</span> <span>₹${paid}</span></div>
            ${rental.depositReturned > 0 ? `<div class="total-row" style="color: #2563eb;"><span>Deposit Refunded:</span> <span>₹${rental.depositReturned}</span></div>` : ''}
            <div class="total-row total-bold">
              <span>Balance Due:</span>
              <span>₹${pending}</span>
            </div>
          </div>
        </div>

        <div class="footer">
          <div class="signature-line">Renter Signature</div>
          <div class="signature-line">Authorized Signatory</div>
        </div>
      </div>
    `;
  };

  const getSlipHtml = () => {
    const paid = rental.payments?.filter(p => p.type !== 'refund').reduce((s, p) => s + p.amount, 0) || 0;
    const pending = Math.max(0, rental.totalAmount - paid + rental.depositAmount - (rental.depositReturned || 0));

    return `
      <div class="header">
        <h2 style="margin: 0; font-size: 18px; letter-spacing: 1px;">${user?.agencyName?.toUpperCase() || 'RENTFLOW'}</h2>
        <div style="font-size: 10px; color: #444; margin-top: 2px;">Smart CRM Receipt Slip</div>
      </div>
      <div class="divider"></div>
      <div class="row"><span class="bold">Receipt No:</span> <span>${rental.rentalNumber}</span></div>
      <div class="row"><span>Date:</span> <span>${new Date(rental.createdAt).toLocaleDateString('en-IN')}</span></div>
      <div class="divider"></div>
      <div class="bold" style="margin-bottom: 2px;">Customer Details:</div>
      <div>${customer?.name || '—'}</div>
      <div>Ph: ${customer?.phone || '—'}</div>
      <div class="divider"></div>
      <div class="bold" style="margin-bottom: 2px;">Vehicle details:</div>
      <div>${item?.name || '—'}</div>
      <div>No: ${item?.registrationNumber && item.registrationNumber !== 'N/A' ? item.registrationNumber : '—'}</div>
      <div class="row" style="margin-top: 4px;"><span>Period:</span> <span>${rental.totalDays} Days</span></div>
      <div class="row"><span>Daily Rate:</span> <span>₹${rental.dailyRate}</span></div>
      <div class="divider"></div>
      <div class="row"><span>Deposit:</span> <span>₹${rental.depositAmount}</span></div>
      <div class="row"><span>Total Amount:</span> <span>₹${rental.totalAmount}</span></div>
      <div class="row bold" style="color: #16a34a;"><span>Total Paid:</span> <span>₹${paid}</span></div>
      <div class="divider"></div>
      <div class="row bold" style="font-size: 13px;"><span>Balance Due:</span> <span>₹${pending}</span></div>
      <div class="divider"></div>
      <div class="center" style="font-size: 10px; margin-top: 15px; line-height: 1.4;">
        Thank you for renting with us!<br>
        Have a safe trip!
      </div>
    `;
  };

  const getInvoiceStyles = () => `
    .invoice-box { max-width: 800px; margin: auto; padding: 10px; font-size: 14px; line-height: 24px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; }
    .invoice-header { display: flex; justify-content: space-between; border-bottom: 2px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 25px; }
    .invoice-title { font-size: 26px; font-weight: 800; color: #2563eb; line-height: 1; letter-spacing: -0.5px; }
    .grid-2 { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .table th { background: #f9fafb; font-weight: bold; padding: 10px 12px; border: 1px solid #e5e7eb; text-align: left; color: #374151; font-size: 12px; text-transform: uppercase; }
    .table td { padding: 10px 12px; border: 1px solid #e5e7eb; color: #4b5563; }
    .total-section { width: 300px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #f3f4f6; }
    .total-bold { font-weight: bold; font-size: 16px; border-top: 2px solid #e5e7eb; padding-top: 10px; border-bottom: none; color: #111827; }
    .footer { margin-top: 80px; display: flex; justify-content: space-between; }
    .signature-line { border-top: 1px solid #9ca3af; width: 220px; text-align: center; margin-top: 40px; font-size: 12px; padding-top: 5px; color: #4b5563; }
  `;

  const getSlipStyles = () => `
    body { width: 280px; margin: 0 auto; font-size: 12px; font-family: 'Courier New', Courier, monospace; color: #000; padding: 10px; }
    .header { text-align: center; margin-bottom: 15px; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; }
    .bold { font-weight: bold; }
    .center { text-align: center; }
  `;

  const handlePrint = (type) => {
    const printWindow = window.open('', '_blank', 'width=800,height=800');
    let contentHtml = '';
    
    if (type === 'invoice') {
      contentHtml = getInvoiceHtml();
    } else if (type === 'slip') {
      contentHtml = getSlipHtml();
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${rental.rentalNumber} - ${type === 'invoice' ? 'Invoice' : 'Slip'}</title>
          <style>
            ${type === 'invoice' ? getInvoiceStyles() : getSlipStyles()}
          </style>
        </head>
        <body>
          ${contentHtml}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const totalPaid = rental.payments?.filter(p => p.type !== 'refund').reduce((s, p) => s + p.amount, 0) || 0;
  const totalRefunded = rental.payments?.filter(p => p.type === 'refund').reduce((s, p) => s + p.amount, 0) || 0;

  // Direct WhatsApp alerts handler
  let msgType = 'chat';
  let msgData = { customerName: customer?.name };
  if (rental.status === 'overdue') {
    msgType = 'overdue';
    msgData = {
      customerName: customer?.name,
      vehicleName: item?.name,
      regNo: item?.registrationNumber,
      dueDate: new Date(rental.expectedReturnDate).toLocaleDateString('en-IN'),
      days,
      agencyName: user?.agencyName
    };
  } else if (rental.status === 'returned') {
    msgType = 'return';
    msgData = {
      customerName: customer?.name,
      vehicleName: item?.name,
      amount: rental.totalAmount,
      depositReturned: rental.depositReturned || 0
    };
  } else if (rental.status === 'active') {
    msgType = 'confirmation';
    msgData = {
      customerName: customer?.name,
      vehicleName: item?.name,
      regNo: item?.registrationNumber,
      startDate: new Date(rental.startDate).toLocaleDateString('en-IN'),
      returnDate: new Date(rental.expectedReturnDate).toLocaleDateString('en-IN'),
      amount: rental.totalAmount,
      deposit: rental.depositAmount,
      rentalNumber: rental.rentalNumber
    };
  }

  const waAlertLink = getWhatsAppLink(customer?.phone || '', msgType, msgData, language);

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
        <button onClick={() => navigate('/rentals')} className="w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors hover:shadow-sm">
          <ChevronLeft size={16} />
        </button>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">{t('rentalDetails')} {rental.rentalNumber}</h1>
        <Badge status={rental.status} label={rental.status} />
        
        <div className="ml-auto flex gap-2 flex-wrap sm:flex-nowrap">
          <Button size="sm" variant="outline" className="min-h-[38px] border-2" onClick={() => handlePrint('invoice')}>
            <FileText size={14} />
            {t('printInvoice')}
          </Button>
          <Button size="sm" variant="outline" className="min-h-[38px] border-2" onClick={() => handlePrint('slip')}>
            <Receipt size={14} />
            {t('printSlip')}
          </Button>
        </div>
      </div>

      {/* Alert banner */}
      {rental.status === 'overdue' ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4.5 flex items-center justify-between flex-wrap gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-600 flex-shrink-0" size={24} />
            <div>
              <p className="font-extrabold text-red-800 text-sm">{t('overdue')} by {days} {t('days')}</p>
              <p className="text-xs text-red-600 font-semibold">{t('currentDue')}: {fmtDate(rental.expectedReturnDate)}</p>
            </div>
          </div>
          <a
            href={waAlertLink}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-sm text-xs font-bold transition-all duration-150 active:scale-95 flex items-center gap-2 border border-green-600/10"
          >
            <MessageCircle size={16} />
            {t('sendWhatsAppAlert')}
          </a>
        </div>
      ) : rental.status === 'active' ? (
        <div className="bg-green-50 border border-green-200/60 rounded-xl p-4.5 flex items-center justify-between flex-wrap gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Info className="text-green-600 flex-shrink-0" size={24} />
            <div>
              <p className="font-extrabold text-green-800 text-sm">Send Confirmation Message</p>
              <p className="text-xs text-green-600 font-semibold">Share booking details instantly on WhatsApp</p>
            </div>
          </div>
          <a
            href={waAlertLink}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-sm text-xs font-bold transition-all duration-150 active:scale-95 flex items-center gap-2 border border-green-600/10"
          >
            <MessageCircle size={16} />
            Share Receipt
          </a>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Customer Information Card (Unified) */}
        <Card className="md:col-span-2 border border-gray-200">
          <h3 className="font-extrabold text-gray-500 text-xs uppercase tracking-wider mb-4">Customer Details</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-semibold">
            <div className="flex items-center gap-3 col-span-full mb-2">
              <Avatar name={customer?.name} size="lg" />
              <div>
                <p className="font-black text-gray-950 text-base leading-tight">{customer?.name}</p>
                <div className="flex gap-2 items-center mt-1.5" onClick={e => e.stopPropagation()}>
                  <a
                    href={`tel:${customer?.phone}`}
                    className="p-1.5 bg-gray-100 hover:bg-gray-250/60 rounded-lg text-gray-600 transition-colors flex items-center justify-center"
                    title="Call Phone"
                  >
                    <Phone size={13} />
                  </a>
                  <a
                    href={waAlertLink}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 bg-green-500 hover:bg-green-650 text-white rounded-lg transition-colors flex items-center justify-center"
                    title="Chat on WhatsApp"
                  >
                    <MessageCircle size={13} />
                  </a>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-50 pb-2.5">
              <p className="text-gray-400 font-bold text-xs uppercase">{t('phone')}</p>
              <p className="text-gray-900 mt-0.5">{customer?.phone || '—'}</p>
            </div>
            
            <div className="border-b border-gray-50 pb-2.5">
              <p className="text-gray-400 font-bold text-xs uppercase">{t('email')}</p>
              <p className="text-gray-900 mt-0.5 truncate">{customer?.email || '—'}</p>
            </div>

            <div className="border-b border-gray-50 pb-2.5">
              <p className="text-gray-400 font-bold text-xs uppercase">{t('city')}</p>
              <p className="text-gray-900 mt-0.5">{customer?.city || '—'}</p>
            </div>

            <div className="border-b border-gray-50 pb-2.5">
              <p className="text-gray-400 font-bold text-xs uppercase">{t('address')}</p>
              <p className="text-gray-900 mt-0.5">{customer?.address || '—'}</p>
            </div>
          </div>

          {/* Integrated Document Verification & Slot Manager */}
          <div className="mt-6 border-t border-gray-100 pt-5">
            <h4 className="font-extrabold text-gray-800 text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <FileText size={14} className="text-brand-650" />
              Document Slot Manager
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                { 
                  label: t('aadhaarCard'), 
                  num: customer?.aadhaarNumber,
                  slots: [
                    { label: 'Front', key: 'aadhaar_front', url: customer?.aadhaarFrontUrl, side: 'front', type: 'aadhaar' },
                    { label: 'Back', key: 'aadhaar_back', url: customer?.aadhaarBackUrl, side: 'back', type: 'aadhaar' }
                  ]
                },
                { 
                  label: t('drivingLicense'), 
                  num: customer?.dlNumber,
                  slots: [
                    { label: 'Front', key: 'dl_front', url: customer?.dlFrontUrl, side: 'front', type: 'dl' },
                    { label: 'Back', key: 'dl_back', url: customer?.dlBackUrl, side: 'back', type: 'dl' }
                  ]
                },
                { 
                  label: 'Passport', 
                  num: customer?.passportNumber,
                  slots: [
                    { label: 'Photo Page', key: 'passport', url: customer?.passportUrl, side: 'front', type: 'passport' }
                  ]
                },
                { 
                  label: 'Voter ID', 
                  num: customer?.voterIdNumber,
                  slots: [
                    { label: 'Voter Card', key: 'voterid', url: customer?.voterIdUrl, side: 'front', type: 'voterid' }
                  ]
                }
              ].map(docGroup => (
                <div key={docGroup.label} className="bg-gray-50 border border-gray-200/60 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-black text-gray-700 uppercase tracking-wide">{docGroup.label}</p>
                    {docGroup.num && <span className="text-[10px] bg-gray-200 px-2 py-0.5 rounded font-mono font-bold text-gray-600">{docGroup.num}</span>}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2.5">
                    {docGroup.slots.map(slot => (
                      <div key={slot.key} className="bg-white border border-gray-150 rounded-lg p-2.5 flex items-center justify-between text-xs font-bold">
                        <span className="text-gray-500">{slot.label}</span>
                        <div className="flex gap-1.5 items-center">
                          {slot.url ? (
                            <>
                              <a
                                href={slot.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-brand-50 hover:bg-brand-100 rounded-lg text-brand-700 transition-colors flex items-center justify-center"
                                title="View document"
                              >
                                <Eye size={13} />
                              </a>
                              <label className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors flex items-center justify-center cursor-pointer" title="Replace file">
                                <Upload size={13} />
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                  onChange={e => handleDocUpload(slot.type, slot.side, e.target.files[0])}
                                />
                              </label>
                            </>
                          ) : (
                            <label className="p-1.5 bg-gray-50 hover:bg-gray-100 text-brand-650 transition-colors flex items-center gap-1 cursor-pointer" title="Upload file">
                              <Upload size={12} />
                              <span className="text-[10px]">Upload</span>
                              <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                  onChange={e => handleDocUpload(slot.type, slot.side, e.target.files[0])}
                                />
                            </label>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Vehicle Information */}
        <Card className="border border-gray-200">
          <h3 className="font-extrabold text-gray-500 text-xs uppercase tracking-wider mb-4">{t('fleet')}</h3>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-gray-500">
              <DynamicIcon name={categoryIcon(item?.category)} size={28} />
            </div>
            <div>
              <p className="font-extrabold text-gray-900 leading-tight">{item?.name}</p>
              {item?.registrationNumber && item.registrationNumber !== 'N/A' && (
                <p className="text-xs text-gray-500 font-mono font-bold mt-1 bg-gray-100 px-2 py-0.5 rounded w-fit">{item.registrationNumber}</p>
              )}
              <p className="text-xs text-gray-500 font-bold mt-1.5">{fmt(item?.dailyRate)}/{t('days').slice(0,-3)}</p>
            </div>
          </div>
        </Card>

        {/* Rental Details */}
        <Card className="border border-gray-200">
          <h3 className="font-extrabold text-gray-500 text-xs uppercase tracking-wider mb-4">{t('rentalDetails')}</h3>
          <div className="space-y-3 text-sm font-semibold">
            {[
              ['Start Date', fmtDate(rental.startDate)],
              [t('currentDue'), fmtDate(rental.expectedReturnDate)],
              rental.actualReturnDate ? [t('actualReturnDate'), fmtDate(rental.actualReturnDate)] : null,
              [t('duration'), `${rental.totalDays} ${t('days')}`],
              [t('dailyRate'), fmt(rental.dailyRate)],
              rental.discountAmount > 0 ? [t('discount'), fmt(rental.discountAmount)] : null,
              ['Total Amount', fmt(rental.totalAmount)],
            ].filter(Boolean).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                <span className="text-gray-400 font-bold">{k}</span>
                <span className="text-gray-900">{v}</span>
              </div>
            ))}
            {rental.notes && (
              <p className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-150 mt-2">
                <strong>{t('notes')}:</strong> {rental.notes}
              </p>
            )}
          </div>
        </Card>

        {/* Financial Summary */}
        <Card className="border border-gray-200">
          <h3 className="font-extrabold text-gray-500 text-xs uppercase tracking-wider mb-4">{t('financialSummary')}</h3>
          <div className="space-y-3 text-sm font-semibold">
            {[
              [t('rentalAmount'), fmt(rental.totalAmount)],
              [t('depositTaken'), fmt(rental.depositAmount)],
              rental.penaltyAmount > 0 ? [t('penalty').replace(' (₹)', ''), fmt(rental.penaltyAmount)] : null,
              [t('totalPaid'), fmt(totalPaid)],
              totalRefunded > 0 ? [t('totalRefunded'), fmt(totalRefunded)] : null,
              rental.depositReturned ? [t('depositReturned'), fmt(rental.depositReturned)] : null,
            ].filter(Boolean).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                <span className="text-gray-400 font-bold">{k}</span>
                <span className="text-gray-900">{v}</span>
              </div>
            ))}
            <div className="border-t-2 border-gray-100 pt-3 flex justify-between font-bold">
              <span className="text-gray-700 font-extrabold">{t('amountPending')}</span>
              <span className={`font-black text-base ${rental.amountPending > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {rental.amountPending > 0 ? fmt(rental.amountPending) : t('settled')}
              </span>
            </div>
          </div>
          {isActive && (
            <Button size="sm" className="mt-4.5 w-full shadow-sm" onClick={() => setShowPayment(true)}>
              <Plus size={14} />
              {t('recordPayment')}
            </Button>
          )}
        </Card>
      </div>

      {/* Extensions history */}
      {rental.extensions?.length > 0 && (
        <Card className="border border-gray-200">
          <h3 className="font-extrabold text-gray-500 text-xs uppercase tracking-wider mb-4">{t('extensions')}</h3>
          <div className="space-y-2.5">
            {rental.extensions.map((ext, i) => (
              <div key={i} className="flex justify-between items-center text-sm font-semibold p-3.5 bg-blue-50 border border-blue-100 rounded-xl">
                <span className="text-blue-900">{fmtDate(ext.previousReturnDate)} → {fmtDate(ext.newReturnDate)}</span>
                <span className="text-blue-700 font-bold">+{ext.additionalDays}d · {fmt(ext.additionalAmount)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Payment History */}
      <Card className="border border-gray-200">
        <h3 className="font-extrabold text-gray-500 text-xs uppercase tracking-wider mb-4">{t('paymentHistory')}</h3>
        {rental.payments?.length === 0 ? (
          <p className="text-gray-400 text-sm font-semibold py-4">No payments recorded yet</p>
        ) : (
          <div className="space-y-2.5">
            {rental.payments?.map((p, i) => (
              <div key={i} className={`flex justify-between items-center text-sm font-semibold p-3.5 rounded-xl border ${p.type === 'refund' ? 'bg-blue-50/50 border-blue-100' : 'bg-gray-50 border-gray-150'}`}>
                <div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase mr-2.5 shadow-sm ${p.type === 'refund' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{p.type}</span>
                  <span className="text-gray-500 font-bold">{p.method?.toUpperCase()}</span>
                  {p.reference && <span className="text-gray-400 text-xs font-mono font-bold ml-2">Ref: {p.reference}</span>}
                </div>
                <div className="text-right">
                  <p className={`font-black ${p.type === 'refund' ? 'text-blue-600' : 'text-green-600'}`}>
                    {p.type === 'refund' ? '−' : '+'}{fmt(p.amount)}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{fmtDateTime(p.paidAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Payment Modal */}
      {showPayment && (
        <Modal title={t('recordPayment')} onClose={() => setShowPayment(false)}>
          <div className="space-y-4">
            <div>
              <Input label="Amount (₹)" type="number" required value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Method</label>
                <select className="input-base bg-white border-2 border-gray-200 focus:border-brand-500 min-h-[44px] text-gray-950 font-bold" value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}>
                  {['cash','upi','card','netbanking','cheque'].map(m => (
                    <option key={m} value={m}>{m.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Type</label>
                <select className="input-base bg-white border-2 border-gray-200 focus:border-brand-500 min-h-[44px] text-gray-950 font-bold" value={payForm.type} onChange={e => setPayForm(f => ({ ...f, type: e.target.value }))}>
                  {['deposit','rental','penalty','extension'].map(t => (
                    <option key={t} value={t}>{t.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Input label="Reference / UPI ID" value={payForm.reference} onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowPayment(false)}>{t('cancel')}</Button>
              <Button className="flex-1" loading={saving} onClick={addPayment}>{t('recordPayment')}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default RentalDetail;
