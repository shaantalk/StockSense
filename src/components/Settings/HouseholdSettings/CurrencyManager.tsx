import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Loader2, CheckCircle2 } from 'lucide-react';
import { SettingItem } from '../SettingItem';
import { googleApiService } from '../../../services/googleApiService';
import type { SharedSettingsProps } from '../types';

export const CurrencyManager = ({ config }: Pick<SharedSettingsProps, 'config'>) => {
    const [showModal, setShowModal] = useState(false);
    const [currencyInput, setCurrencyInput] = useState(config?.currency || '₹');
    const [loading, setLoading] = useState(false);

    const handleUpdate = async () => {
        if (!currencyInput.trim()) return;
        setLoading(true);
        try {
            await googleApiService.updateCurrency(currencyInput.trim());
            setShowModal(false);
            window.location.reload();
        } catch (e: any) {
            alert(e.message || 'Failed to update currency');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <SettingItem
                icon={DollarSign}
                label="Currency"
                value={config?.currency || 'Not Set'}
                color="bg-yellow-500/20 text-yellow-500"
                onClick={() => setShowModal(true)}
                delay={0.1}
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
                            className="w-full max-w-sm glass p-8 rounded-[2.5rem] border-primary-500/30 space-y-6"
                        >
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 rounded-3xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center mx-auto mb-4">
                                    <DollarSign size={32} />
                                </div>
                                <h3 className="text-xl font-black text-white tracking-tight">Set Currency</h3>
                                <p className="text-xs text-slate-400 font-medium">Select your household's currency.</p>
                            </div>

                            <select
                                value={currencyInput}
                                onChange={(e) => setCurrencyInput(e.target.value)}
                                className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl h-14 px-6 text-white focus:outline-none focus:border-primary-500 transition-all text-xl font-bold text-center appearance-none cursor-pointer"
                            >
                                <option value="₹">₹ - Indian Rupee (INR)</option>
                                <option value="$">$ - US Dollar (USD)</option>
                                <option value="€">€ - Euro (EUR)</option>
                                <option value="£">£ - British Pound (GBP)</option>
                                <option value="¥">¥ - Japanese Yen (JPY)</option>
                                <option value="A$">A$ - Australian Dollar (AUD)</option>
                                <option value="C$">C$ - Canadian Dollar (CAD)</option>
                                <option value="CHF">CHF - Swiss Franc</option>
                                <option value="¥">¥ - Chinese Yuan (CNY)</option>
                                <option value="kr">kr - Swedish Krona (SEK)</option>
                                <option value="NZ$">NZ$ - New Zealand Dollar (NZD)</option>
                                <option value="₩">₩ - South Korean Won (KRW)</option>
                                <option value="S$">S$ - Singapore Dollar (SGD)</option>
                                <option value="kr">kr - Norwegian Krone (NOK)</option>
                                <option value="Mex$">Mex$ - Mexican Peso (MXN)</option>
                                <option value="kr">kr - Danish Krone (DKK)</option>
                                <option value="R">R - South African Rand (ZAR)</option>
                                <option value="R$">R$ - Brazilian Real (BRL)</option>
                                <option value="NT$">NT$ - New Taiwan Dollar (TWD)</option>
                                <option value="د.إ">د.إ - UAE Dirham (AED)</option>
                            </select>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 h-14 rounded-2xl bg-slate-800 text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-700 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={!currencyInput || loading}
                                    onClick={handleUpdate}
                                    className="flex-1 h-14 rounded-2xl bg-primary-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary-500/20 hover:bg-primary-500 transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 size={16} /> Save</>}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
