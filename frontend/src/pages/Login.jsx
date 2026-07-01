import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import useLangStore from '../store/langStore';
import { getErrorMessage } from '../utils/helpers';
import { Button, Input, LanguageSelector } from '../components/ui';
import { Bike } from 'lucide-react';
import useSEO from '../hooks/useSEO';

export default function Login() {
  useSEO({
    title: 'Login to Manager Dashboard',
    description: 'Log in to your RentFlow CRM business account. Securely manage your vehicle inventory, rental agreements, customer identity proofs, and transaction invoices.',
    keywords: 'rentflow login, vehicle rental crm portal, bike rental app log in, manage rent accounts'
  });

  const { login } = useAuthStore();
  const { t } = useLangStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative">
      {/* Onboarding Language Switcher */}
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-md">
            <Bike size={28} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">RentFlow</h1>
          <p className="text-gray-500 text-sm mt-1.5 font-semibold">Smart CRM for rental agencies</p>
        </div>

        <div className="card p-8 bg-white border border-gray-200 rounded-2xl shadow-card">
          <h2 className="text-xl font-extrabold text-gray-900 mb-6 tracking-tight">
            {t('signIn')}
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <Input
                label={t('emailAddress')}
                type="email"
                placeholder="you@agency.com"
                error={errors.email?.message}
                {...register('email', { required: t('required') })}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">{t('password')}</label>
                <Link to="/forgot-password" className="text-xs text-brand-600 hover:underline font-bold">
                  {t('forgotPasswordBtn')}
                </Link>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                className={`input-base text-gray-900 font-medium placeholder-gray-400 bg-white border-2 border-gray-200 focus:border-brand-500 min-h-[44px] ${errors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
                {...register('password', { required: t('required') })}
              />
              {errors.password && <p className="mt-1 text-xs text-red-600 font-bold">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              disabled={loading}
              loading={loading}
              className="w-full mt-2"
            >
              {t('signIn')} →
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6 font-semibold">
            {t('donotHaveAccount')}{' '}
            <Link to="/register" className="text-brand-600 font-extrabold hover:underline">
              {t('createAccount')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
