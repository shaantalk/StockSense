import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Package, List as ListIcon, ShoppingCart, Settings as SettingsIcon, Loader2, LogOut } from 'lucide-react';
import Dashboard from './components/Dashboard';
import InventoryList from './components/InventoryList';
import ShoppingList from './components/ShoppingList';
import Settings from './components/Settings';
import Checkout from './components/Checkout';
import Login from './components/Login';
import Onboarding from './components/Onboarding';
import { googleApiService } from './services/googleApiService';
import { runInitJobs } from './services/initService';
import type { UserConfig, Shop, Member, Status } from './types';

function App() {
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const logoutRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (logoutRef.current && !logoutRef.current.contains(event.target as Node)) {
        setShowLogout(false);
      }
    };
    if (showLogout) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLogout]);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('google_access_token');
      if (token) {
        setIsAuthenticated(true);
        await loadConfig();
      } else {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      // 1. Discover households
      const households = await googleApiService.discoverHouseholds();

      // 2. Get User Info
      const user = await googleApiService.getUserInfo();

      // Fire off background init jobs now that user is authenticated
      runInitJobs();

      let activeHouseholdId = localStorage.getItem('activeHouseholdId');
      if (activeHouseholdId && !households.find(h => h.id === activeHouseholdId)) {
        activeHouseholdId = null;
        localStorage.removeItem('activeHouseholdId');
      }

      if (!activeHouseholdId && households.length > 0) {
        activeHouseholdId = households[0].id;
        localStorage.setItem('activeHouseholdId', activeHouseholdId);
      }

      let shops: Shop[] = [];
      let categories: { name: string; color: string }[] = [];
      let members: Member[] = [];
      let units: string[] = [];
      let statuses: Status[] = [];
      let currency = '₹'; // Default

      if (activeHouseholdId) {
        const fetchSafe = async (sheet: string) => {
          try { return await googleApiService.getTableData(sheet); } catch { return []; }
        };

        const configData = await fetchSafe('Config');
        const settingsData = await fetchSafe('Settings');
        const shopsData = await fetchSafe('Shops');
        const categoriesData = await fetchSafe('Categories');
        const membersData = await fetchSafe('Members');
        const unitsData = await fetchSafe('Units');
        const statusesData = await fetchSafe('Statuses');

        shops = shopsData.map((s: any) => ({ name: s.name, color: s.color || '#94a3b8' })).filter((s: any) => s.name);
        categories = categoriesData.map((c: any) => ({ name: c.name, color: c.color })).filter((c: any) => c.name);
        members = membersData.map((m: any) => ({ email: m.email, name: m.name || m.email?.split('@')[0] || 'User', color: m.color || '#94a3b8' })).filter((m: any) => m.email);
        units = unitsData.map((u: any) => u.name).filter(Boolean);
        statuses = statusesData.map((s: any) => ({ name: s.name, color: s.color || '#94a3b8' })).filter((s: any) => s.name);

        // Fallbacks
        const legacyShops = configData.filter((c: any) => c.type === 'Shop').map((c: any) => ({ name: c.value, color: '#94a3b8' }));
        if (legacyShops.length > 0 && shops.length === 0) shops = legacyShops;

        const legacyMembers = configData.filter((c: any) => c.type === 'Member').map((c: any) => ({ email: c.value, name: c.value?.split('@')[0] || 'User', color: '#94a3b8' }));
        if (legacyMembers.length > 0 && members.length === 0) members = legacyMembers;

        if (units.length === 0) units = ['Kilos', 'Liters', 'Grams', 'Numbers', 'Packets'];
        if (statuses.length === 0) statuses = [{ name: 'Normal', color: '#10b981' }, { name: 'Near Finish', color: '#f59e0b' }];

        const currencyEntry = settingsData.find((c: any) => c.key === 'Currency') || configData.find((c: any) => c.type === 'Currency');
        if (currencyEntry) currency = currencyEntry.value;
      }

      setConfig({
        households,
        currentUser: user,
        categories,
        shops,
        members,
        units,
        statuses,
        currency,
        activeHouseholdId: activeHouseholdId || undefined
      });

      if (households.length === 0 && location.pathname !== '/onboarding') {
        navigate('/onboarding');
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      // If unauthorized, clear token and redirect to login
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        localStorage.removeItem('google_access_token');
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (_token: string, _user: { email: string; name: string }) => {
    setIsAuthenticated(true);
    loadConfig();
    navigate('/');
  };

  const handleCreateHousehold = async (name: string) => {
    const householdId = await googleApiService.createHousehold(name);
    localStorage.setItem('activeHouseholdId', householdId);
    await loadConfig();
    navigate('/');
  };

  const handleJoinHousehold = (id: string) => {
    localStorage.setItem('activeHouseholdId', id);
    loadConfig();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#0f172a] pb-24 text-slate-200 selection:bg-primary-500/30">
      {/* Dynamic Header */}
      <header className="p-6 flex items-center justify-between sticky top-0 z-30 bg-[#0f172a]/80 backdrop-blur-xl border-b border-white/5">
        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => navigate('/')}
        >
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform">
            <Package size={18} />
          </div>
          <span className="font-black text-xl tracking-tighter text-white group-hover:text-primary-400 transition-colors">StockSense</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary-400">
              {config?.households.find(h => h.id === localStorage.getItem('activeHouseholdId'))?.name || 'Loading...'}
            </span>
          </div>
          <div className="relative" ref={logoutRef}>
            <div
              className="w-10 h-10 rounded-full border-2 border-primary-500/20 p-0.5 bg-slate-900 group cursor-pointer hover:border-primary-500 transition-all"
              onClick={() => setShowLogout(!showLogout)}
            >
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(config?.currentUser?.name || 'U')}&background=0ea5e9&color=fff`}
                alt="User"
                className="w-full h-full rounded-full"
              />
            </div>

            <AnimatePresence>
              {showLogout && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full mt-3 right-0 w-48 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col"
                >
                  <div className="p-3 border-b border-slate-800 flex flex-col items-center gap-1">
                    <span className="text-white font-bold text-sm truncate w-full text-center">{config?.currentUser?.name || 'User'}</span>
                    <span className="text-[10px] text-slate-500 truncate w-full text-center font-bold tracking-widest">{config?.currentUser?.email}</span>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => {
                        localStorage.removeItem('google_access_token');
                        setIsAuthenticated(false);
                        navigate('/');
                      }}
                      className="w-full flex items-center justify-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors text-xs font-black uppercase tracking-widest"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-4">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Dashboard config={config} />} />
            <Route path="/inventory" element={<InventoryList config={config} />} />
            <Route path="/list" element={<ShoppingList config={config} />} />
            <Route path="/shop" element={<Checkout config={config} />} />
            <Route path="/settings" element={<Settings config={config} onSignOut={() => {
              localStorage.removeItem('google_access_token');
              setIsAuthenticated(false);
              navigate('/');
            }} />} />
            <Route
              path="/onboarding"
              element={
                <Onboarding
                  invitedHouseholds={config?.households || []}
                  onCreateHousehold={handleCreateHousehold}
                  onJoinHousehold={handleJoinHousehold}
                />
              }
            />
          </Routes>
        </AnimatePresence>
      </main>

      {/* Futuristic Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 px-6 pb-8 pointer-events-none">
        <div className="max-w-md mx-auto h-20 glass rounded-[2.5rem] flex items-center justify-around pointer-events-auto border-white/10 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.5)]">
          <NavLink to="/" icon={Home} label="Home" />
          <NavLink to="/inventory" icon={Package} label="Stock" />
          <NavLink to="/list" icon={ListIcon} label="Wish List" />
          <NavLink to="/shop" icon={ShoppingCart} label="Shop" />
          <NavLink to="/settings" icon={SettingsIcon} label="More" />
        </div>
      </nav>
    </div>
  );
}

const NavLink = ({ to, icon: Icon, label }: any) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <button
      onClick={() => navigate(to)}
      className={`relative flex flex-col items-center gap-1.5 transition-all duration-500 group ${isActive ? 'text-primary-400' : 'text-slate-500 hover:text-slate-300'}`}
    >
      <div className={`
        p-2 rounded-2xl transition-all duration-500 
        ${isActive ? 'bg-primary-500/15 scale-110 shadow-lg shadow-primary-500/10' : 'group-hover:bg-slate-800'}
      `}>
        <Icon size={isActive ? 20 : 22} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
      </div>
      <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}>
        {label}
      </span>
      {isActive && (
        <motion.div
          layoutId="nav-active"
          className="absolute -top-1 w-8 h-1 bg-primary-500 rounded-full blur-[2px]"
        />
      )}
    </button>
  );
};

export default App;
