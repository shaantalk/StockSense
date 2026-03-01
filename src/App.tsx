import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Package, List as ListIcon, ShoppingCart, Settings as SettingsIcon, Loader2 } from 'lucide-react';
import Dashboard from './components/Dashboard';
import InventoryList from './components/InventoryList';
import ShoppingList from './components/ShoppingList';
import Settings from './components/Settings';
import Checkout from './components/Checkout';
import Login from './components/Login';
import Onboarding from './components/Onboarding';
import { gasService } from './services/gasService';
import type { UserConfig } from './types';

function App() {
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const initAuth = async () => {
      const savedAuth = localStorage.getItem('isActive');
      if (savedAuth === 'true') {
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
      const cfg = await gasService.getConfig();
      setConfig(cfg);

      if (cfg.families.length === 0) {
        navigate('/onboarding');
      } else if (!localStorage.getItem('activeFamilyId')) {
        // Default to first family if none selected
        localStorage.setItem('activeFamilyId', cfg.families[0].id);
        // Refresh config with active family items
        const updatedCfg = await gasService.getConfig();
        setConfig(updatedCfg);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    localStorage.setItem('isActive', 'true');
    setIsAuthenticated(true);
    loadConfig();
    navigate('/');
  };

  const handleCreateFamily = async (name: string) => {
    const result = await gasService.createFamily(name);
    localStorage.setItem('activeFamilyId', result.familyId);
    await loadConfig();
    navigate('/');
  };

  const handleJoinFamily = (id: string) => {
    localStorage.setItem('activeFamilyId', id);
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
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
            <Package size={18} />
          </div>
          <span className="font-black text-xl tracking-tighter text-white">StockSense</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary-400">
              {config?.families.find(f => f.id === localStorage.getItem('activeFamilyId'))?.name || 'Loading...'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-primary-500/20 p-0.5 bg-slate-900 group cursor-pointer hover:border-primary-500 transition-all">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(config?.currentUser?.name || 'U')}&background=0ea5e9&color=fff`}
              alt="User"
              className="w-full h-full rounded-full"
            />
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-4">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inventory" element={<InventoryList />} />
            <Route path="/list" element={<ShoppingList />} />
            <Route path="/shop" element={<Checkout />} />
            <Route path="/settings" element={<Settings />} />
            <Route
              path="/onboarding"
              element={
                <Onboarding
                  invitedFamilies={config?.families || []}
                  onCreateFamily={handleCreateFamily}
                  onJoinFamily={handleJoinFamily}
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
          <NavLink to="/list" icon={ListIcon} label="List" />
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
