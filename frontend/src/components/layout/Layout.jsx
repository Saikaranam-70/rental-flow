import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../store/authStore';
import useLangStore from '../../store/langStore';
import { useQuery } from 'react-query';
import { rentalsAPI } from '../../api';
import { LanguageSelector } from '../ui';
import {
  LayoutDashboard, Users, Package, FileText,
  CreditCard, BarChart2, Settings, LogOut,
  ChevronLeft, Menu, Bell, AlertCircle, Bike,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'dashboard', icon: LayoutDashboard, exact: true },
  { path: '/rentals', label: 'rentals', icon: FileText, badge: 'overdue' },
  { path: '/inventory', label: 'fleet', icon: Package },
  { path: '/payments', label: 'payments', icon: CreditCard },
  { path: '/reports', label: 'reports', icon: BarChart2 },
  { path: '/settings', label: 'settings', icon: Settings },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { t } = useLangStore();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: dashData } = useQuery('dashboard-stats', () => rentalsAPI.getDashboard(), {
    refetchInterval: 60000,
  });
  const overdueCount = dashData?.data?.data?.stats?.overdueRentals || 0;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const SidebarContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full bg-[#111318] text-gray-400">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
        <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
          <Bike size={20} />
        </div>
        {(!collapsed || mobile) && (
          <div>
            <div className="text-white font-black text-base leading-tight tracking-tight">RentFlow</div>
            <div className="text-gray-500 text-xs truncate max-w-[130px] font-semibold">{user?.agencyName}</div>
          </div>
        )}
        {!mobile && (
          <button onClick={() => setCollapsed(!collapsed)} className="ml-auto text-gray-500 hover:text-gray-300 transition-colors">
            <ChevronLeft size={16} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ path, label, icon: Icon, exact, badge }) => (
          <NavLink
            key={path}
            to={path}
            end={exact}
            onClick={() => mobile && setMobileOpen(false)}
            className={({ isActive }) =>
              `sidebar-item rounded-xl px-3 py-2.5 flex items-center gap-3 text-sm font-bold transition-all ${
                isActive 
                  ? 'bg-[#1E2128] text-white' 
                  : 'text-gray-400 hover:bg-[#1A1D24] hover:text-gray-200'
              }`
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            {(!collapsed || mobile) && (
              <>
                <span className="flex-1 whitespace-nowrap">{t(label)}</span>
                {badge === 'overdue' && overdueCount > 0 && (
                  <span className="bg-red-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-sm">
                    {overdueCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Plan badge */}
      {(!collapsed || mobile) && (
        <div className="mx-3 mb-3 px-3.5 py-2.5 bg-brand-500/10 border border-brand-500/20 rounded-xl">
          <div className="text-brand-400 text-xs font-bold capitalize">{t(user?.plan) || user?.plan} {t('plans')}</div>
          {user?.trialEndsAt && new Date(user.trialEndsAt) > new Date() && (
            <div className="text-gray-500 text-xs mt-0.5 font-medium">{t('trialActive')}</div>
          )}
        </div>
      )}

      {/* User */}
      <div className="p-3 border-t border-gray-800 bg-[#0c0d10]">
        <div className={`flex items-center gap-3 ${collapsed && !mobile ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-black flex-shrink-0 shadow-sm">
            {user?.ownerName?.[0]?.toUpperCase() || 'U'}
          </div>
          {(!collapsed || mobile) && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-bold truncate leading-tight">{user?.ownerName}</div>
                <div className="text-gray-500 text-xs truncate font-medium">{user?.email}</div>
              </div>
              <button onClick={handleLogout} title={t('logout')} className="text-gray-500 hover:text-red-400 transition-colors">
                <LogOut size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-[#111318] transition-all duration-200 flex-shrink-0 ${collapsed ? 'w-16' : 'w-56'}`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed left-0 top-0 bottom-0 w-64 z-50 flex flex-col lg:hidden shadow-modal"
            >
              <SidebarContent mobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center gap-4 flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700">
            <Menu size={20} />
          </button>

          <div className="flex-1" />

          {/* Language Selector */}
          <LanguageSelector />

          {/* Overdue alert */}
          {overdueCount > 0 && (
            <NavLink to="/rentals?status=overdue" className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors">
              <AlertCircle size={14} className="pulse-dot" />
              {overdueCount} {t('overdue')}
            </NavLink>
          )}

          {/* Notification bell */}
          <button className="relative text-gray-500 hover:text-gray-700 transition-colors p-1.5 hover:bg-gray-50 rounded-lg">
            <Bell size={20} />
            {overdueCount > 0 && (
              <span className="absolute top-0 right-0 w-4.5 h-4.5 bg-red-600 rounded-full text-white text-[9px] flex items-center justify-center font-black border border-white">
                {overdueCount > 9 ? '9+' : overdueCount}
              </span>
            )}
          </button>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-black shadow-sm">
            {user?.ownerName?.[0]?.toUpperCase() || 'U'}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-gray-50">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
