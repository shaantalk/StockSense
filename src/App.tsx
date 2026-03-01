import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, ShoppingCart, Settings as SettingsIcon, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import Dashboard from './components/Dashboard';
import InventoryList from './components/InventoryList';
import ShoppingList from './components/ShoppingList';
import Settings from './components/Settings';
import Checkout from './components/Checkout';
import { gasService } from './services/gasService';
import type { UserConfig } from './types';
import { useEffect, useState } from 'react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={cn(
        "flex flex-col items-center justify-center gap-1 p-2 transition-all duration-300 relative group",
        isActive ? "text-primary-600 scale-110" : "text-slate-400 hover:text-slate-600"
      )}
    >
      <Icon size={24} className={cn("transition-all duration-300", isActive && "drop-shadow-[0_0_8px_rgba(14,165,233,0.5)]")} />
      <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      {isActive && (
        <motion.div
          layoutId="nav-glow"
          className="absolute -top-1 w-8 h-1 bg-primary-500 rounded-full blur-[2px]"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
    </Link>
  );
};

const App = () => {
  const [config, setConfig] = useState<UserConfig | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      const data = await gasService.getConfig();
      setConfig(data);
    };
    fetchConfig();
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col max-w-md mx-auto relative overflow-hidden shadow-2xl border-x border-slate-800/50">
        <header className="glass sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-slate-700/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-600 to-accent-500 flex items-center justify-center text-white shadow-lg">
              <Package size={18} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Stock<span className="text-primary-400">Sense</span></h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-700 shadow-sm overflow-hidden">
            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(config?.currentUser?.name || 'User')}&background=0ea5e9&color=fff`} alt={config?.currentUser?.name || 'User'} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-24 px-4 py-6 scroll-smooth">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/inventory" element={<InventoryList />} />
              <Route path="/shopping" element={<ShoppingList />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </AnimatePresence>
        </main>

        <nav className="glass sticky bottom-0 left-0 right-0 h-20 px-4 flex items-center justify-around z-50 rounded-t-3xl border-t border-slate-700/30">
          <NavItem to="/" icon={LayoutDashboard} label="Home" />
          <NavItem to="/inventory" icon={Package} label="Stock" />
          <NavItem to="/shopping" icon={ClipboardList} label="List" />
          <NavItem to="/checkout" icon={ShoppingCart} label="Shop" />
          <NavItem to="/settings" icon={SettingsIcon} label="More" />
        </nav>

        <div className="fixed top-20 -left-20 w-64 h-64 bg-primary-200/20 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-40 -right-20 w-48 h-48 bg-accent-200/20 rounded-full blur-3xl pointer-events-none" />
      </div>
    </Router>
  );
};

export default App;
