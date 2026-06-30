import { useNavigate } from 'react-router-dom';
import useLangStore from '../store/langStore';
import { Bike } from 'lucide-react';
import { Button } from '../components/ui';

export default function NotFound() {
  const navigate = useNavigate();
  const { t } = useLangStore();
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center flex flex-col items-center">
        <div className="w-20 h-20 bg-brand-50 text-brand-600 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-brand-100">
          <Bike size={44} />
        </div>
        <h1 className="text-6xl font-black text-gray-900 mb-2 tracking-tight">404</h1>
        <p className="text-gray-550 text-lg mb-8 font-semibold">Page not found — looks like this route took a wrong turn!</p>
        <Button onClick={() => navigate('/')} className="shadow-sm">
          ← {t('back')} {t('dashboard')}
        </Button>
      </div>
    </div>
  );
}
