import { useEffect, useState } from 'react';
import { UserPlus, Shield, HelpCircle, Share2, LogOut, ChevronRight, Users, Loader2, Home, CheckCircle2, X } from 'lucide-react';
import { gasService } from '../services/gasService';
import type { UserConfig } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const Settings = () => {
    const [config, setConfig] = useState<UserConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);

    const activeFamilyId = localStorage.getItem('activeFamilyId');
    const activeFamily = config?.families.find(f => f.id === activeFamilyId);
    const isOwner = activeFamily?.role === 'Owner';

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        setLoading(true);
        const data = await gasService.getConfig();
        setConfig(data);
        setLoading(false);
    };

    const handleSwitchFamily = (id: string) => {
        localStorage.setItem('activeFamilyId', id);
        window.location.reload();
    };

    const handleSignOut = () => {
        localStorage.removeItem('isActive');
        localStorage.removeItem('activeFamilyId');
        window.location.href = '/';
    };

    const handleInvite = async () => {
        if (!inviteEmail) return;
        setInviteLoading(true);
        try {
            await gasService.addMember(inviteEmail);
            setShowInviteModal(false);
            setInviteEmail('');
            alert('Invitation sent successfully!');
            fetchConfig(); // Refresh list
        } catch (e: any) {
            alert(e.message || 'Failed to send invitation');
        } finally {
            setInviteLoading(false);
        }
    };

    const handleRemoveMember = async (email: string) => {
        if (!confirm(`Are you sure you want to remove ${email}?`)) return;
        try {
            await gasService.removeMember(email);
            fetchConfig(); // Refresh list
        } catch (e: any) {
            alert(e.message || 'Failed to remove member');
        }
    };

    if (loading) {
        return (
            <div className="h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
        );
    }

    const SettingItem = ({ icon: Icon, label, value, color, onClick, delay }: any) => (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay }}
            onClick={onClick}
            className="glass p-5 rounded-3xl flex items-center justify-between group cursor-pointer hover:border-slate-600 transition-all border-slate-700/50"
        >
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} shadow-inner`}>
                    <Icon size={20} />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-white uppercase tracking-wider">{label}</span>
                    {value && <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">{value}</span>}
                </div>
            </div>
            <ChevronRight size={18} className="text-slate-700 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
        </motion.div>
    );

    return (
        <div className="space-y-10 pb-32 animate-fade-in relative">
            {/* Profile Section */}
            <section className="relative px-2">
                <div className="absolute inset-0 bg-primary-600/5 blur-3xl rounded-full" />
                <div className="relative glass p-6 rounded-[2.5rem] border-slate-700/50 flex flex-col items-center gap-4 overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl" />
                    <div className="w-24 h-24 rounded-full border-4 border-slate-800 p-1 shadow-2xl">
                        <img
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(config?.currentUser?.name || 'U')}&background=0ea5e9&color=fff&size=128`}
                            alt="Profile"
                            className="w-full h-full rounded-full shadow-inner"
                        />
                    </div>
                    <div className="text-center space-y-1">
                        <h2 className="text-2xl font-black text-white tracking-tight">{config?.currentUser?.name}</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">{config?.currentUser?.email}</p>
                    </div>
                </div>
            </section>

            {/* Family Switcher */}
            <section className="space-y-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-4">Switch Family</h2>
                <div className="grid gap-3">
                    {config?.families.map((family) => (
                        <div
                            key={family.id}
                            onClick={() => handleSwitchFamily(family.id)}
                            className={`glass p-5 rounded-3xl flex items-center justify-between group cursor-pointer transition-all border-2 ${activeFamilyId === family.id ? 'border-primary-500/50 bg-primary-500/5' : 'border-slate-700/50'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${activeFamilyId === family.id ? 'bg-primary-500/20 text-primary-400' : 'bg-slate-800 text-slate-400'}`}>
                                    <Home size={20} />
                                </div>
                                <div className="flex flex-col">
                                    <span className={`text-sm font-bold uppercase tracking-wider ${activeFamilyId === family.id ? 'text-white' : 'text-slate-400'}`}>{family.name}</span>
                                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">{family.role}</span>
                                </div>
                            </div>
                            {activeFamilyId === family.id && (
                                <div className="w-2 h-2 rounded-full bg-primary-500 shadow-lg shadow-primary-500/50 animate-pulse" />
                            )}
                        </div>
                    ))}
                    <button
                        onClick={() => window.location.href = '#/onboarding'}
                        className="w-full p-5 rounded-3xl border-2 border-dashed border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-400 flex items-center justify-center gap-2 transition-all font-bold text-xs uppercase tracking-widest"
                    >
                        <UserPlus size={16} />
                        Add or Join New Family
                    </button>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-4">Family Circle</h2>
                <div className="grid gap-3">
                    <div className="glass p-5 rounded-3xl border-slate-700/50 space-y-4">
                        <div className="flex items-center gap-3 text-primary-400 px-1">
                            <Users size={18} />
                            <span className="text-xs font-black uppercase tracking-widest">Active Members</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {config?.members.map(member => (
                                <div key={member} className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 pl-1 pr-3 py-1 rounded-full group/member">
                                    <img
                                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member)}&background=random&color=fff&size=64`}
                                        alt={member}
                                        className="w-6 h-6 rounded-full"
                                    />
                                    <span className="text-[10px] font-bold text-slate-300">{member.split('@')[0]}</span>
                                    {isOwner && member !== config?.currentUser?.email && (
                                        <button
                                            onClick={() => handleRemoveMember(member)}
                                            className="p-0.5 hover:bg-red-500/20 rounded-full text-slate-500 hover:text-red-400 transition-colors"
                                        >
                                            <X size={10} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {isOwner && (
                        <SettingItem
                            icon={Share2}
                            label="Invite to Household"
                            color="bg-accent-500/20 text-accent-400"
                            onClick={() => setShowInviteModal(true)}
                            delay={0.2}
                        />
                    )}
                </div>
            </section>

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
                        label="StockSense Intel"
                        color="bg-slate-800 text-slate-400"
                        delay={0.6}
                    />
                </div>
            </section>

            <button
                onClick={handleSignOut}
                className="w-full h-16 rounded-3xl glass text-red-400 font-bold uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-3 border-red-500/10 hover:bg-red-500/5 transition-all active:scale-95"
            >
                <LogOut size={18} />
                Sign Out Securely
            </button>

            {/* Invite Modal */}
            <AnimatePresence>
                {showInviteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0f172a]/90 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="w-full max-w-sm glass p-8 rounded-[2.5rem] border-primary-500/30 space-y-6"
                        >
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 rounded-3xl bg-primary-500/10 text-primary-400 flex items-center justify-center mx-auto mb-4">
                                    <Share2 size={32} />
                                </div>
                                <h3 className="text-xl font-black text-white tracking-tight">Invite Member</h3>
                                <p className="text-xs text-slate-400 font-medium">Enter their Google email to grant access to this family's sheet.</p>
                            </div>

                            <input
                                type="email"
                                placeholder="google-user@gmail.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl h-14 px-6 text-white focus:outline-none focus:border-primary-500 transition-all text-sm font-bold"
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowInviteModal(false)}
                                    className="flex-1 h-14 rounded-2xl bg-slate-800 text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-700 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={!inviteEmail || inviteLoading}
                                    onClick={handleInvite}
                                    className="flex-1 h-14 rounded-2xl bg-primary-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary-500/20 hover:bg-primary-500 transition-all flex items-center justify-center gap-2"
                                >
                                    {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 size={16} /> Send</>}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Settings;
