import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, HelpCircle } from 'lucide-react';
import { SettingItem } from './SettingItem';

export const SystemSection = () => {
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showIntelModal, setShowIntelModal] = useState(false);

    return (
        <section className="space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-4">System</h2>
            <div className="space-y-3">
                <SettingItem
                    icon={Shield}
                    label="Privacy & Data"
                    color="bg-slate-800 text-slate-400"
                    onClick={() => setShowPrivacyModal(true)}
                    delay={0.5}
                />
                <SettingItem
                    icon={HelpCircle}
                    label="StockSense Intel"
                    color="bg-slate-800 text-slate-400"
                    onClick={() => setShowIntelModal(true)}
                    delay={0.6}
                />
            </div>

            <AnimatePresence>
                {/* Privacy Modal */}
                {showPrivacyModal && (
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
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                                    <Shield size={32} />
                                </div>
                                <h3 className="text-2xl font-black text-white tracking-tight">Your Data is Yours</h3>
                                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                    StockSense operates directly with your Google Drive.
                                    <br /><br />
                                    <span className="text-emerald-400 font-bold">100% Private.</span> We do not have servers, databases, or analytics tracking your inventory.
                                    <br /><br />
                                    Your household configuration, shopping lists, and items are stored exclusively in <span className="text-white font-bold">your own Google Sheets</span>.
                                    No one else can access them unless you explicitly invite them.
                                </p>
                            </div>

                            <button
                                onClick={() => setShowPrivacyModal(false)}
                                className="w-full h-14 rounded-2xl bg-slate-800 text-slate-300 font-bold uppercase tracking-widest text-xs hover:bg-slate-700 transition-all flex items-center justify-center"
                            >
                                I Understand
                            </button>
                        </motion.div>
                    </motion.div>
                )}

                {/* Intel / About Modal */}
                {showIntelModal && (
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
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-2">
                                    <HelpCircle size={32} />
                                </div>
                                <h3 className="text-2xl font-black text-white tracking-tight">StockSense</h3>
                                <div className="flex justify-center gap-2">
                                    <span className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-black uppercase tracking-widest text-primary-400">Version 1.0.0</span>
                                </div>
                                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                    A futuristic, privacy-first inventory manager for your household.
                                    <br /><br />
                                    Built to streamline your physical goods tracking using the power of Google Sheets API underneath a sleek, app-like interface.
                                </p>
                            </div>

                            <button
                                onClick={() => setShowIntelModal(false)}
                                className="w-full h-14 rounded-2xl bg-slate-800 text-slate-300 font-bold uppercase tracking-widest text-xs hover:bg-slate-700 transition-all flex items-center justify-center"
                            >
                                Close
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};
