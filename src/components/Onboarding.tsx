import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, ChevronRight, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import type { Household } from '../types';

interface OnboardingProps {
    invitedHouseholds: Household[];
    onCreateHousehold: (name: string) => Promise<void>;
    onJoinHousehold: (id: string) => void;
}

const Onboarding = ({ invitedHouseholds, onCreateHousehold, onJoinHousehold }: OnboardingProps) => {
    const [step, setStep] = useState<'main' | 'create'>('main');
    const [householdName, setHouseholdName] = useState('');
    const [loading, setLoading] = useState(false);

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col p-6 max-w-md mx-auto relative overflow-hidden">
            <AnimatePresence mode="wait">
                {step === 'main' ? (
                    <motion.div
                        key="main"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-8 py-10"
                    >
                        <div className="space-y-2">
                            <h1 className="text-3xl font-black text-white tracking-tight leading-tight">Welcome to the<br />Household.</h1>
                            <p className="text-slate-400 font-medium">To get started, join an existing household or create a new one for your home.</p>
                        </div>

                        {/* Invited Households */}
                        {invitedHouseholds.length > 0 && (
                            <section className="space-y-4">
                                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Invitations Found</h2>
                                <div className="grid gap-3">
                                    {invitedHouseholds.map((household) => (
                                        <button
                                            key={household.id}
                                            onClick={() => onJoinHousehold(household.id)}
                                            className="glass p-5 rounded-3xl flex items-center justify-between group hover:border-primary-500/50 transition-all text-left"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                                                    <Users size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-white">{household.name}</h3>
                                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mt-0.5">Invite from Member</p>
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-slate-700 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Actions */}
                        <div className="grid gap-4">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Actions</h2>
                            <button
                                onClick={() => setStep('create')}
                                className="w-full glass p-6 rounded-[2.5rem] flex flex-col items-center gap-3 border-dashed border-2 border-slate-700 hover:border-primary-500/50 hover:bg-primary-500/5 transition-all group"
                            >
                                <div className="w-14 h-14 rounded-full bg-primary-500/10 text-primary-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Plus size={32} />
                                </div>
                                <div className="text-center">
                                    <h3 className="font-black text-white uppercase tracking-widest text-xs">Create New Household</h3>
                                    <p className="text-[10px] text-slate-500 font-medium mt-1 italic">Start a fresh sheet for your home</p>
                                </div>
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="create"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-10 py-10"
                    >
                        <div className="space-y-2">
                            <button
                                onClick={() => setStep('main')}
                                className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 hover:text-white transition-colors"
                            >
                                ← Back to selection
                            </button>
                            <h1 className="text-3xl font-black text-white tracking-tight">Name your Household</h1>
                            <p className="text-slate-400 font-medium text-sm">This will be the name of your private Google Sheet.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="e.g. Panda Household"
                                    value={householdName}
                                    onChange={(e) => setHouseholdName(e.target.value)}
                                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-3xl h-20 px-8 text-xl font-bold text-white focus:outline-none focus:border-primary-500 transition-all placeholder:text-slate-700 shadow-inner"
                                    autoFocus
                                />
                                {householdName.length >= 3 && (
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-primary-500">
                                        <CheckCircle2 size={24} />
                                    </div>
                                )}
                            </div>

                            <div className="glass p-5 rounded-3xl border-slate-700/30 flex items-start gap-4">
                                <div className="mt-1 text-primary-400">
                                    <Sparkles size={20} />
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                    This will automatically setup all required sheets (Stock, Wish List, Config) in your Google Drive.
                                </p>
                            </div>

                            <button
                                disabled={householdName.length < 3 || loading}
                                onClick={async () => {
                                    setLoading(true);
                                    await onCreateHousehold(householdName);
                                    setLoading(false);
                                }}
                                className="w-full h-20 bg-primary-600 rounded-3xl font-black uppercase tracking-[0.3em] text-white shadow-2xl shadow-primary-500/20 hover:bg-primary-500 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-3"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : 'Confirm & Create'}
                                {!loading && <ChevronRight size={20} />}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Onboarding;
