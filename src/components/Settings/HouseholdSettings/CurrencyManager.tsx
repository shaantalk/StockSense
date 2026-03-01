import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Loader2, CheckCircle2, Search, ChevronDown } from 'lucide-react';
import { SettingItem } from '../SettingItem';
import { googleApiService } from '../../../services/googleApiService';
import type { SharedSettingsProps } from '../types';
import { getCurrencySymbol, getCurrencyName } from '../../../utils/currency';
import { fetchAndCacheCurrencies } from '../../../services/initService';

export interface CurrencyData {
    code: string;
    name: string;
    symbol: string;
    countryName: string;
    flag: string;
}

export const CurrencyManager = ({ config }: Pick<SharedSettingsProps, 'config'>) => {
    const [showModal, setShowModal] = useState(false);
    const [currencyInput, setCurrencyInput] = useState(config?.currency || 'INR');
    const [loading, setLoading] = useState(false);
    const [currencies, setCurrencies] = useState<CurrencyData[]>([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };

        if (dropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownOpen]);

    const filteredCurrencies = currencies.filter(c =>
        c.countryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        const loadCurrencies = async () => {
            if (!showModal) return;
            const data = await fetchAndCacheCurrencies();
            if (data) {
                setCurrencies(data);
            }
        };
        loadCurrencies();
    }, [showModal]);

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
                value={(() => {
                    if (!config?.currency) return 'Not Set';
                    // Try to find the detailed info from our loaded currencies
                    const selected = currencies.find(c => `${c.code}_${c.countryName}` === config.currency) || currencies.find(c => c.code === config.currency);
                    if (selected) {
                        return `${selected.countryName} (${selected.symbol}) ${selected.code}`;
                    }
                    // Fallback to static formatting if data isn't loaded yet
                    return `${getCurrencySymbol(config.currency)} - ${getCurrencyName(config.currency)}`;
                })()}
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

                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl h-14 px-4 text-white flex items-center justify-between hover:border-primary-500/50 transition-all font-bold"
                                >
                                    {currencyInput ? (() => {
                                        const selected = currencies.find(c => `${c.code}_${c.countryName}` === currencyInput) || currencies.find(c => c.code === currencyInput);
                                        return selected ? (
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <img src={selected.flag} alt="flag" className="w-5 h-3.5 object-cover rounded-sm shadow-sm shrink-0" />
                                                <span className="text-sm font-bold truncate">{selected.countryName} ({selected.symbol}) {selected.code}</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm">{currencyInput}</span>
                                        )
                                    })() : (
                                        <span className="text-slate-500">Select Currency</span>
                                    )}
                                    <ChevronDown size={18} className="text-slate-500" />
                                </button>

                                <AnimatePresence>
                                    {dropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute top-full left-0 w-full mt-2 bg-slate-900 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl z-20 flex flex-col"
                                        >
                                            <div className="p-2 border-b border-slate-800">
                                                <div className="relative">
                                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        placeholder="Search country or currency..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        className="w-full bg-slate-800 rounded-xl h-10 pl-9 pr-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-60 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                                {filteredCurrencies.map((c, i) => (
                                                    <button
                                                        key={`${c.code}-${i}`}
                                                        onClick={() => {
                                                            setCurrencyInput(`${c.code}_${c.countryName}`);
                                                            setDropdownOpen(false);
                                                            setSearchQuery('');
                                                        }}
                                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 transition-colors text-left ${currencyInput === `${c.code}_${c.countryName}` || currencyInput === c.code ? 'bg-primary-500/10 text-primary-400' : 'text-slate-300'}`}
                                                    >
                                                        <img src={c.flag} alt="flag" className="w-5 h-3.5 object-cover rounded-sm shadow-sm shrink-0" />
                                                        <span className="text-xs font-bold truncate leading-none flex-1">{c.countryName} ({c.symbol}) {c.code}</span>
                                                    </button>
                                                ))}
                                                {filteredCurrencies.length === 0 && (
                                                    <div className="text-center py-4 text-xs text-slate-500">No results found</div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

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
