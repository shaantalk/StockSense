import { useEffect, useState } from 'react';
import { UserPlus, Shield, HelpCircle, Share2, LogOut, ChevronRight, Users, Loader2 } from 'lucide-react';
import { gasService } from '../services/gasService';
import type { UserConfig } from '../types';
import { motion } from 'framer-motion';

const Settings = () => {
    const [config, setConfig] = useState<UserConfig | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchConfig = async () => {
            setLoading(true);
            const data = await gasService.getConfig();
            setConfig(data);
            setLoading(false);
        };
        fetchConfig();
    }, []);

    const SettingItem = ({ icon: Icon, label, value, color, delay }: any) => (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: -0 }}
            transition={{ delay }}
            className="glass p-5 rounded-[1.5rem] flex items-center justify-between group active:scale-95 transition-all cursor-pointer border-slate-700/50"
        >
            <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${color} shadow-lg shadow-black/20`}>
                    <Icon size={22} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">{label}</h3>
                    {value && <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.1em] mt-0.5">{value}</p>}
                </div>
            </div>
            <ChevronRight size={18} className="text-slate-600 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
        </motion.div>
    );

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-slate-500 font-medium text-sm">Manage your household and account.</p>
            </div>

            {/* User Info */}
            <section className="glass p-8 rounded-[3rem] flex flex-col items-center text-center gap-4 relative overflow-hidden border-slate-700/50">
                <div className="w-24 h-24 rounded-full border-4 border-slate-800 shadow-2xl overflow-hidden relative z-10 transition-transform hover:scale-105 duration-500">
                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(config?.currentUser?.name || 'User')}&background=0ea5e9&color=fff&size=128`} alt={config?.currentUser?.name} />
                </div>
                <div className="relative z-10">
                    <h2 className="text-2xl font-black text-white tracking-tight">{config?.currentUser?.name || 'Loading...'}</h2>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Household Member • {config?.currentUser?.email}</p>
                </div>
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary-600/10 rounded-full blur-[80px]" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent-600/5 rounded-full blur-[60px]" />
            </section>

            {/* Family Section */}
            <section className="space-y-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-4">Household</h2>
                {loading ? (
                    <div className="glass p-6 rounded-[2rem] flex items-center justify-center border-slate-700/50">
                        <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-3">
                        <SettingItem
                            icon={Users}
                            label="Family Members"
                            value={config?.members.join(', ')}
                            color="bg-primary-500/20 text-primary-400"
                            delay={0.1}
                        />
                        <SettingItem
                            icon={UserPlus}
                            label="Invite Member"
                            value="Add via email"
                            color="bg-accent-500/20 text-accent-400"
                            delay={0.2}
                        />
                        <SettingItem
                            icon={Share2}
                            label="Google Sheet"
                            value="Synced:熊猫_Expenses"
                            color="bg-emerald-500/20 text-emerald-400"
                            delay={0.3}
                        />
                    </div>
                )}
            </section>

            {/* General Section */}
            <section className="space-y-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-4">System</h2>
                <div className="space-y-3">
                    <SettingItem
                        icon={Shield}
                        label="Privacy & Data"
                        color="bg-slate-800 text-slate-400"
                        delay={0.5}
                    />
                    <SettingItem
                        icon={HelpCircle}
                        label="Support Center"
                        color="bg-blue-500/20 text-blue-400"
                        delay={0.6}
                    />
                </div>
            </section>

            {/* Logout */}
            <button className="w-full p-5 rounded-[1.5rem] bg-red-500/10 text-red-500 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-red-500/20 transition-all active:scale-95 border border-red-500/20">
                <LogOut size={18} />
                Sign Out Securely
            </button>
        </div>
    );
};

export default Settings;
