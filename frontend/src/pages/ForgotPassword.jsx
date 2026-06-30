import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../api';
import useLangStore from '../store/langStore';
import { getErrorMessage } from '../utils/helpers';
import { Button, Input, LanguageSelector } from '../components/ui';
import { Bike, Mail } from 'lucide-react';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useLangStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { toast.error('Enter your email'); return; }
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative">
      {/* Onboarding Language Switcher */}
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-md">
            <Bike size={24} />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">RentFlow</h1>
        </div>
        <div className="card p-8 bg-white border border-gray-200 rounded-2xl shadow-card">
          {sent ? (
            <div className="text-center">
              <div className="text-gray-400 p-4 bg-gray-100 rounded-full mb-4 w-fit mx-auto">
                <Mail size={32} className="text-gray-500" />
              </div>
              <h2 className="font-extrabold text-gray-900 mb-2">Check your email</h2>
              <p className="text-gray-500 text-sm font-semibold">If an account exists for <strong>{email}</strong>, we've sent a password reset link.</p>
              <Link to="/login" className="btn-primary mt-6 justify-center w-full min-h-[44px]">{t('backToLogin')}</Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-extrabold text-gray-900 mb-2">{t('resetPassword')}</h2>
              <p className="text-gray-500 text-sm mb-6 font-semibold">Enter your email and we'll send you a reset link.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input 
                    label={t('emailAddress')} 
                    type="email" 
                    placeholder="you@agency.com" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                  />
                </div>
                <Button type="submit" disabled={loading} loading={loading} className="w-full">
                  {t('sendResetLink')}
                </Button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-5 font-semibold">
                <Link to="/login" className="text-brand-600 hover:underline">← {t('backToLogin')}</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
