import { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { customersAPI, inventoryAPI, rentalsAPI } from '../../api';
import { Modal, Button, Input, Textarea } from '../ui';
import { fmt, categoryIcon, getErrorMessage } from '../../utils/helpers';
import useLangStore, { getWhatsAppLink } from '../../store/langStore';
import useAuthStore from '../../store/authStore';
import { ClipboardList, Search, Info, Check, Shield, FileText, Upload, Printer, MessageCircle, AlertTriangle } from 'lucide-react';

export default function NewRentalModal({ onClose, onSuccess, preselectedVehicleId }) {
  const { t, language } = useLangStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [customerDetails, setCustomerDetails] = useState({
    name: '', phone: '', email: '', aadhaarNumber: '', dlNumber: '', passportNumber: '', voterIdNumber: '', address: '', city: '',
    aadhaarFrontUrl: null, aadhaarBackUrl: null, dlFrontUrl: null, dlBackUrl: null,
    passportUrl: null, passportBackUrl: null, voterIdUrl: null, voterIdBackUrl: null
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
  const [createdRentalData, setCreatedRentalData] = useState(null);
  const [blacklistWarning, setBlacklistWarning] = useState(null);

  // New vehicle modes: 'select' | 'add'
  const [vehicleMode, setVehicleMode] = useState(preselectedVehicleId ? 'select' : 'select');
  const [newVehicle, setNewVehicle] = useState({
    name: '', brand: '', model: '', year: '', color: '',
    category: 'bike', fuelType: 'na', engineCC: '',
    registrationNumber: '', dailyRate: '', depositAmount: '',
    lateFeePerDay: '', insuranceExpiryDate: '', pucExpiryDate: '',
    description: ''
  });
  const [vehiclePhoto, setVehiclePhoto] = useState(null);

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

  // Resolve calculations based on mode
  const isVehicleAddMode = vehicleMode === 'add';
  const resolvedVehicleName = isVehicleAddMode ? newVehicle.name : (selectedItem?.name || '');
  const resolvedDailyRate = isVehicleAddMode ? (parseFloat(newVehicle.dailyRate) || 0) : (selectedItem?.dailyRate || 0);
  const resolvedDepositAmount = isVehicleAddMode ? (parseFloat(newVehicle.depositAmount) || 0) : (selectedItem?.depositAmount || 0);

  const baseAmount = days * resolvedDailyRate;
  const totalAmount = Math.max(0, baseAmount - (parseFloat(form.discountAmount) || 0));

  const handleClose = () => {
    onSuccess?.();
    onClose();
    if (createdRentalData) {
      navigate(`/rentals/${createdRentalData._id}`);
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setCust = (k, v) => setCustomerDetails(c => ({ ...c, [k]: v }));
  const setNewVeh = (k, v) => setNewVehicle(nv => ({ ...nv, [k]: v }));

  const handlePhoneChange = async (phoneVal) => {
    setCust('phone', phoneVal);
    if (phoneVal.length >= 10) {
      try {
        const res = await customersAPI.getAll({ search: phoneVal.trim() });
        const customersList = res.data?.data || [];
        const match = customersList.find(c => c.phone.trim() === phoneVal.trim());
        if (match) {
          if (match.isBlacklisted) {
            setBlacklistWarning(match.blacklistReason || 'This customer is blacklisted!');
          } else {
            setBlacklistWarning(null);
          }
          
          setCustomerDetails({
            name: match.name || '',
            phone: match.phone || '',
            email: match.email || '',
            aadhaarNumber: match.aadhaarNumber || '',
            dlNumber: match.dlNumber || '',
            passportNumber: match.passportNumber || '',
            voterIdNumber: match.voterIdNumber || '',
            address: match.address || '',
            city: match.city || '',
            aadhaarFrontUrl: match.aadhaarFrontUrl || null,
            aadhaarBackUrl: match.aadhaarBackUrl || null,
            dlFrontUrl: match.dlFrontUrl || null,
            dlBackUrl: match.dlBackUrl || null,
            passportUrl: match.passportUrl || null,
            passportBackUrl: match.passportBackUrl || null,
            voterIdUrl: match.voterIdUrl || null,
            voterIdBackUrl: match.voterIdBackUrl || null,
          });

          if (match.passportNumber) setOtherDocType('passport');
          else if (match.voterIdNumber) setOtherDocType('voterid');
          else setOtherDocType('none');

          toast.success('Existing customer details auto-filled!');
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
    if (isVehicleAddMode) {
      if (!newVehicle.name || !newVehicle.dailyRate || !newVehicle.depositAmount) {
        toast.error('Please enter name, daily rate, and deposit for the new vehicle'); return;
      }
    } else {
      if (!form.inventoryId) {
        toast.error('Please select a vehicle'); return;
      }
    }
    if (!form.startDate || !form.expectedReturnDate) {
      toast.error('Please fill all required fields'); return;
    }
    if (days <= 0) { toast.error('Return date must be after start date'); return; }

    setLoading(true);
    try {
      const payload = {
        ...form,
        inventoryId: isVehicleAddMode ? 'new' : form.inventoryId,
        vehicleDetails: isVehicleAddMode ? newVehicle : undefined,
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

      // Upload files sequentially
      if (targetCustomerId) {
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

        if (fileMap.length > 0) {
          let count = 0;
          for (const [idType, side, file] of fileMap) {
            count++;
            toast.loading(`Uploading document ${count} of ${fileMap.length}...`, { id: 'doc-upload' });
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('idType', idType);
            formData.append('side', side);
            await customersAPI.uploadId(targetCustomerId, formData);
          }
          toast.success('Documents uploaded successfully!', { id: 'doc-upload' });
        }
      }

      // Upload vehicle photo if in vehicle add mode and photo is selected
      if (isVehicleAddMode && vehiclePhoto) {
        const createdVehicleId = rental.inventoryId?._id || rental.inventoryId;
        if (createdVehicleId) {
          toast.loading('Uploading vehicle photo...', { id: 'vehicle-photo' });
          const photoData = new FormData();
          photoData.append('photo', vehiclePhoto);
          await inventoryAPI.uploadPhoto(createdVehicleId, photoData);
          toast.success('Vehicle photo uploaded successfully!', { id: 'vehicle-photo' });
        }
      }

      toast.success('Rental created successfully! 🎉');
      setCreatedRentalData(rental);
    } catch (err) {
      toast.error(getErrorMessage(err), { id: 'doc-upload' });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (type) => {
    if (!createdRentalData) return;
    const rental = createdRentalData;
    const customer = rental.customerId;
    const item = rental.inventoryId;
    const pending = rental.totalAmount + rental.depositAmount;

    const printWindow = window.open('', '_blank', 'width=800,height=800');
    let contentHtml = '';
    
    if (type === 'invoice') {
      contentHtml = `
        <div class="invoice-box">
          <div class="invoice-header">
            <div>
              <div class="invoice-title">${user?.agencyName?.toUpperCase() || 'RENTFLOW CRM'}</div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Smart Rental CRM Invoice</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: bold; font-size: 16px; color: #111827;">${rental.rentalNumber}</div>
              <div style="font-size: 12px; color: #4b5563;">Date: ${new Date(rental.createdAt).toLocaleDateString('en-IN')}</div>
              <div style="font-size: 12px; color: #4b5563;">Status: <span style="text-transform: uppercase; font-weight: bold; color: #2563eb;">ACTIVE</span></div>
            </div>
          </div>

          <div class="grid-2">
            <div>
              <h4 style="margin: 0 0 8px 0; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">CUSTOMER DETAILS</h4>
              <strong>Name:</strong> ${customer?.name || '—'}<br>
              <strong>Phone:</strong> ${customer?.phone || '—'}<br>
              ${customer?.email ? `<strong>Email:</strong> ${customer.email}<br>` : ''}
              ${customerDetails.address ? `<strong>Address:</strong> ${customerDetails.address}, ${customerDetails.city || ''}<br>` : ''}
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
                <td style="text-align: right;">₹${rental.baseAmount}</td>
              </tr>
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
    } else if (type === 'slip') {
      contentHtml = `
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
        <div class="row bold" style="font-size: 13px;"><span>Balance Due:</span> <span>₹${pending}</span></div>
        <div class="divider"></div>
        <div class="center" style="font-size: 10px; margin-top: 15px; line-height: 1.4;">
          Thank you for renting with us!<br>
          Have a safe trip!
        </div>
      `;
    }

    const invoiceStyles = `
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

    const slipStyles = `
      body { width: 280px; margin: 0 auto; font-size: 12px; font-family: 'Courier New', Courier, monospace; color: #000; padding: 10px; }
      .header { text-align: center; margin-bottom: 15px; }
      .divider { border-top: 1px dashed #000; margin: 8px 0; }
      .row { display: flex; justify-content: space-between; margin: 2px 0; }
      .bold { font-weight: bold; }
      .center { text-align: center; }
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>${rental.rentalNumber} - ${type === 'invoice' ? 'Invoice' : 'Slip'}</title>
          <style>
            ${type === 'invoice' ? invoiceStyles : slipStyles}
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

  // Helper for rendering document slots
  const renderDocSlot = (label, fileKey, urlVal, fileObj) => {
    return (
      <div>
        <label className="label">{label}</label>
        <div className="relative border-2 border-dashed border-gray-250 rounded-2xl p-4 hover:border-brand-400 transition-colors cursor-pointer flex flex-col items-center justify-center text-center min-h-[82px] bg-gray-50/50 shadow-inner">
          <input 
            type="file" 
            accept="image/*,application/pdf" 
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" 
            onChange={e => handleFileChange(fileKey, e.target.files[0])} 
          />
          
          {fileObj ? (
            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] text-brand-700 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded font-black uppercase tracking-wider">New File Chosen</span>
              <span className="text-xs text-gray-700 font-extrabold max-w-[150px] truncate">{fileObj.name}</span>
            </div>
          ) : urlVal ? (
            <div className="flex flex-col items-center gap-1.5 z-20 relative">
              <span className="text-[9px] text-green-700 bg-green-50 border border-green-150 px-2 py-0.5 rounded font-black uppercase tracking-wider">✓ Added Before</span>
              <a 
                href={urlVal} 
                target="_blank" 
                rel="noreferrer" 
                className="text-xs text-brand-650 font-extrabold hover:underline truncate max-w-[150px]"
                onClick={e => e.stopPropagation()} 
              >
                View Document
              </a>
            </div>
          ) : (
            <>
              <Upload size={16} className="text-gray-400 mb-1" />
              <span className="text-[10px] text-gray-500 font-extrabold">Choose File</span>
            </>
          )}
        </div>
      </div>
    );
  };

  // Render Confirmation Receipt View
  if (createdRentalData) {
    const rental = createdRentalData;
    const customer = rental.customerId;
    const item = rental.inventoryId;
    const waLink = getWhatsAppLink(customer?.phone || '', 'confirmation', {
      customerName: customer?.name,
      vehicleName: item?.name,
      regNo: item?.registrationNumber,
      startDate: new Date(rental.startDate).toLocaleDateString('en-IN'),
      returnDate: new Date(rental.expectedReturnDate).toLocaleDateString('en-IN'),
      amount: rental.totalAmount,
      deposit: rental.depositAmount,
      rentalNumber: rental.rentalNumber
    }, language);

    return (
      <Modal title="Rental Confirmed!" onClose={handleClose}>
        <div className="space-y-6 text-center py-4 flex flex-col items-center flex-wrap">
          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center border border-green-150 shadow-sm animate-bounce">
            <Check size={36} strokeWidth={3} />
          </div>
          
          <div>
            <h2 className="text-xl font-black text-gray-950">Booking Confirmed!</h2>
            <p className="text-xs text-gray-400 font-mono font-bold mt-1">Rental No: {rental.rentalNumber}</p>
          </div>

          <div className="w-full bg-gray-50 border border-gray-150 rounded-2xl p-4 text-sm font-semibold text-left space-y-2 max-w-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Customer:</span>
              <span className="text-gray-900">{customer?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Vehicle:</span>
              <span className="text-gray-900">{item?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Amount:</span>
              <span className="text-gray-955 font-extrabold">{fmt(rental.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Security Deposit:</span>
              <span className="text-gray-900">{fmt(rental.depositAmount)}</span>
            </div>
          </div>

          {/* Receipt Options Panel */}
          <div className="w-full space-y-3 max-w-sm">
            <p className="font-extrabold text-gray-800 text-xs uppercase tracking-wider text-left pl-1">Print & Share Receipts</p>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => handlePrint('invoice')} variant="outline" className="min-h-[44px]">
                <Printer size={14} className="mr-1" />
                Print A4
              </Button>
              <Button onClick={() => handlePrint('slip')} variant="outline" className="min-h-[44px]">
                <Printer size={14} className="mr-1" />
                Print Slip
              </Button>
            </div>
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="w-full h-11 bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-sm text-sm font-bold transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 border border-green-600/10"
            >
              <MessageCircle size={18} />
              Share Receipt on WhatsApp
            </a>
          </div>

          <div className="pt-4 border-t border-gray-150 w-full">
            <Button className="w-full min-h-[44px]" onClick={handleClose}>
              Done / Close
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

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
              {renderDocSlot(`${t('aadhaarCard')} (${t('front')})`, 'aadhaar_front', customerDetails.aadhaarFrontUrl, files.aadhaar_front)}
              {renderDocSlot(`${t('aadhaarCard')} (${t('backSide')})`, 'aadhaar_back', customerDetails.aadhaarBackUrl, files.aadhaar_back)}
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
              {renderDocSlot(`${t('drivingLicense')} (${t('front')})`, 'dl_front', customerDetails.dlFrontUrl, files.dl_front)}
              {renderDocSlot(`${t('drivingLicense')} (${t('backSide')})`, 'dl_back', customerDetails.dlBackUrl, files.dl_back)}
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
                  {renderDocSlot("Passport Front", "passport_front", customerDetails.passportUrl, files.passport_front)}
                  {renderDocSlot("Passport Back", "passport_back", customerDetails.passportBackUrl, files.passport_back)}
                </div>
              </div>
            )}

            {/* Voter ID fields */}
            {otherDocType === 'voterid' && (
              <div className="space-y-3.5 border-t border-gray-100 pt-3 animate-fade-in">
                <Input label="Voter ID Card Number" placeholder="ABC1234567" value={customerDetails.voterIdNumber} onChange={e => setCust('voterIdNumber', e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  {renderDocSlot("Voter ID Front", "voterid_front", customerDetails.voterIdUrl, files.voterid_front)}
                  {renderDocSlot("Voter ID Back", "voterid_back", customerDetails.voterIdBackUrl, files.voterid_back)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Selection Block */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4.5 space-y-4 shadow-sm">
          <p className="font-extrabold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-200 pb-2">
            <Shield size={14} className="text-brand-650" />
            Vehicle Details
          </p>
          
          {/* Mode Switcher */}
          <div className="flex gap-2 mb-1 bg-gray-200/50 p-1 rounded-xl">
            <button
              type="button"
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${vehicleMode === 'select' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-550 hover:text-gray-900'}`}
              onClick={() => setVehicleMode('select')}
            >
              Select Existing Available
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${vehicleMode === 'add' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-555 hover:text-gray-900'}`}
              onClick={() => setVehicleMode('add')}
            >
              ＋ Add New Vehicle
            </button>
          </div>

          {vehicleMode === 'select' ? (
            <div className="space-y-3">
              <div className="relative">
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
          ) : (
            <div className="grid grid-cols-2 gap-3.5 animate-fade-in">
              <div className="col-span-2">
                <Input label="Vehicle Name (e.g. Hero Splendor Plus)" required placeholder="Hero Splendor Plus" value={newVehicle.name} onChange={e => setNewVeh('name', e.target.value)} />
              </div>
              <div>
                <Input label="Brand" placeholder="Hero" value={newVehicle.brand} onChange={e => setNewVeh('brand', e.target.value)} />
              </div>
              <div>
                <Input label="Model" placeholder="Splendor +" value={newVehicle.model} onChange={e => setNewVeh('model', e.target.value)} />
              </div>
              <div>
                <Input label="Manufacture Year" type="number" placeholder="2024" value={newVehicle.year} onChange={e => setNewVeh('year', e.target.value)} />
              </div>
              <div>
                <Input label="Color" placeholder="Black" value={newVehicle.color} onChange={e => setNewVeh('color', e.target.value)} />
              </div>
              <div>
                <label className="label">Category *</label>
                <select className="input-base bg-white border-2 border-gray-200 focus:border-brand-500 min-h-[44px] text-gray-950 font-bold" value={newVehicle.category} onChange={e => setNewVeh('category', e.target.value)}>
                  <option value="bike">Bike</option>
                  <option value="scooter">Scooter</option>
                  <option value="car">Car</option>
                  <option value="auto">Auto</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Fuel Type</label>
                <select className="input-base bg-white border-2 border-gray-200 focus:border-brand-500 min-h-[44px] text-gray-950 font-bold" value={newVehicle.fuelType} onChange={e => setNewVeh('fuelType', e.target.value)}>
                  <option value="petrol">PETROL</option>
                  <option value="diesel">DIESEL</option>
                  <option value="electric">ELECTRIC</option>
                  <option value="cng">CNG</option>
                  <option value="na">N/A</option>
                </select>
              </div>
              <div>
                <Input label="Engine CC" type="number" placeholder="110" value={newVehicle.engineCC} onChange={e => setNewVeh('engineCC', e.target.value)} />
              </div>
              <div>
                <Input label="Registration Number" placeholder="AP31XY1234" value={newVehicle.registrationNumber} onChange={e => setNewVeh('registrationNumber', e.target.value)} />
              </div>
              <div>
                <Input label="Daily Rate (₹) *" required type="number" placeholder="400" value={newVehicle.dailyRate} onChange={e => setNewVeh('dailyRate', e.target.value)} />
              </div>
              <div>
                <Input label="Security Deposit (₹) *" required type="number" placeholder="2000" value={newVehicle.depositAmount} onChange={e => setNewVeh('depositAmount', e.target.value)} />
              </div>
              <div>
                <Input label="Late Fee / Day (₹)" type="number" placeholder="100" value={newVehicle.lateFeePerDay} onChange={e => setNewVeh('lateFeePerDay', e.target.value)} />
              </div>
              <div>
                <Input label="Insurance Expiry" type="date" value={newVehicle.insuranceExpiryDate} onChange={e => setNewVeh('insuranceExpiryDate', e.target.value)} />
              </div>
              <div>
                <Input label="PUC Expiry" type="date" value={newVehicle.pucExpiryDate} onChange={e => setNewVeh('pucExpiryDate', e.target.value)} />
              </div>
              <div className="col-span-2">
                <Textarea label="Description / Special Conditions" rows={2} placeholder="Scratches on left shield, double helmet included..." value={newVehicle.description} onChange={e => setNewVeh('description', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="label">Vehicle Photo</label>
                <div className="relative border-2 border-dashed border-gray-250 rounded-2xl p-4 hover:border-brand-400 transition-colors cursor-pointer flex flex-col items-center justify-center text-center min-h-[82px] bg-gray-50/50 shadow-inner">
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" onChange={e => setVehiclePhoto(e.target.files[0])} />
                  {vehiclePhoto ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] text-brand-700 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded font-black uppercase tracking-wider">Photo Selected</span>
                      <span className="text-xs text-gray-700 font-extrabold max-w-[150px] truncate">{vehiclePhoto.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload size={16} className="text-gray-400 mb-1" />
                      <span className="text-[10px] text-gray-500 font-extrabold">Choose Vehicle Photo</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
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
        {resolvedVehicleName && days > 0 && (
          <div className="bg-green-50 border border-green-200/60 rounded-xl p-4.5 space-y-2.5 animate-fade-in shadow-sm font-bold text-sm">
            <p className="font-extrabold text-green-800 flex items-center gap-1.5">
              <ClipboardList size={16} />
              {t('rentalSummary')}
            </p>
            {[
              [t('fleet'), resolvedVehicleName],
              [t('dailyRate'), fmt(resolvedDailyRate)],
              [t('duration'), `${days} ${t('days')}`],
              [t('depositAmount'), fmt(resolvedDepositAmount)],
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
