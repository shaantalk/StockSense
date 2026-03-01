import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, CheckCircle2, UserPlus, X } from 'lucide-react';
import { SettingItem } from '../SettingItem';
import type { SharedSettingsProps } from '../types';

export const HouseholdSwitcher = ({ config }: Pick<SharedSettingsProps, 'config'>) => {
    const activeHouseholdId = localStorage.getItem('activeHouseholdId');
    const activeHousehold = config?.households.find(h => h.id === activeHouseholdId);

    const [showModal, setShowModal] = useState(false);

    const handleSwitchHousehold = (id: string) => {
        localStorage.setItem('activeHouseholdId', id);
        window.location.reload();
    };

    return (
        <section className="space-y-4 px-2">
            <SettingItem
                icon={Home}
                label="Switch Household"
                value={activeHousehold?.name || 'Loading...'}
                color="bg-primary-500/20 text-primary-400"
                onClick={() => setShowModal(true)}
                delay={0.05}
            />

            <AnimatePresence>
                {showModal && (
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
                            className="w-full max-w-sm glass p-6 rounded-[2.5rem] border-primary-500/30 space-y-6 max-h-[80vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                                    <Home size={24} className="text-primary-400" /> Switch Household
                                </h3>
                                <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="grid gap-3">
                                {config?.households.map((household) => (
                                    <div
                                        key={household.id}
                                        onClick={() => handleSwitchHousehold(household.id)}
                                        className={`p-4 rounded-2xl flex items-center justify-between group cursor-pointer transition-all border-2 ${activeHouseholdId === household.id ? 'border-primary-500 bg-primary-500/10' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-800'}`}
                                    >
                                        <div className="flex flex-col">
                                            <span className={`text-sm font-bold uppercase tracking-wider ${activeHouseholdId === household.id ? 'text-white' : 'text-slate-300'}`}>{household.name}</span>
                                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">{household.role}</span>
                                        </div>
                                        {activeHouseholdId === household.id && (
                                            <CheckCircle2 size={18} className="text-primary-500" />
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    window.location.hash = '/onboarding';
                                }}
                                className="w-full p-4 rounded-2xl border-2 border-dashed border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-400 flex items-center justify-center gap-2 transition-all font-bold text-xs uppercase tracking-widest"
                            >
                                <UserPlus size={16} /> Add / Join Household
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};
