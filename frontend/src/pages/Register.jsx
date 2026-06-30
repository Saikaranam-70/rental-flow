import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import useLangStore from '../store/langStore';
import { getErrorMessage } from '../utils/helpers';
import { Button, Input, Select, LanguageSelector } from '../components/ui';
import { Bike } from 'lucide-react';

export default function Register() {
  const { register: registerFn } = useAuthStore();
  const { t } = useLangStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await registerFn(data);
      toast.success('Account created! Welcome to RentFlow 🎉');
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

      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-md">
            <Bike size={24} />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">RentFlow</h1>
          <p className="text-gray-500 text-sm mt-1 font-semibold">14 days free · No credit card required</p>
        </div>

        <div className="card p-8 bg-white border border-gray-200 rounded-2xl shadow-card">
          <h2 className="text-xl font-extrabold text-gray-900 mb-5 tracking-tight">{t('createAccount')}</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Input
                  label={t('fullName')}
                  placeholder="Ravi Kumar"
                  required
                  error={errors.ownerName && t('required')}
                  {...register('ownerName', { required: true })}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Input
                  label={t('agencyName')}
                  placeholder="Vizag Bike Rentals"
                  required
                  error={errors.agencyName && t('required')}
                  {...register('agencyName', { required: true })}
                />
              </div>
              <div className="col-span-2">
                <Input
                  label={t('emailAddress')}
                  type="email"
                  placeholder="you@agency.com"
                  required
                  error={errors.email && t('required')}
                  {...register('email', { required: true })}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Input
                  label={t('phone')}
                  placeholder="9876543210"
                  required
                  error={errors.phone && t('required')}
                  {...register('phone', { required: true })}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Input
                  label={t('city')}
                  placeholder="Visakhapatnam"
                  {...register('city')}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Select
                  label={t('businessType')}
                  {...register('businessType')}
                >
                  <option value="mixed">Mixed (Bikes + Cars)</option>
                  <option value="bike_rental">Bike / Scooter Rental</option>
                  <option value="car_rental">Car Rental</option>
                  <option value="equipment_rental">Equipment Rental</option>
                </Select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Input
                  label={t('password')}
                  type="password"
                  placeholder="Min 8 characters"
                  required
                  error={errors.password && t('required')}
                  {...register('password', { required: true, minLength: 8 })}
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} loading={loading} className="w-full mt-2">
              {t('register')} →
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6 font-semibold">
            {t('alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-brand-600 font-extrabold hover:underline">{t('signIn')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
