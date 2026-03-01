import { useEffect, useState } from 'react';
import { Calendar, Store, User, ArrowUpRight, History, Package, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { googleApiService } from '../services/googleApiService';
import type { ShopEvent, UserConfig } from '../types';
import { getCurrencySymbol } from '../utils/currency';

interface CheckoutProps {
    config: UserConfig | null;
}

const Checkout = ({ config }: CheckoutProps) => {
    const [events, setEvents] = useState<ShopEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (config?.activeHouseholdId) {
            fetchHistory();
        }
    }, [config?.activeHouseholdId]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const history = await googleApiService.getShopEvents();
            setEvents(history);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-white">Shop History</h1>
                <p className="text-slate-500 font-medium text-sm">Review your past grocery trips.</p>
            </div>

            <div className="grid gap-5">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
                        <p className="text-slate-500 font-medium">Loading records...</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {events.map((event, idx) => (
                            <motion.div
                                key={event.eventId}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="glass p-6 rounded-[2.5rem] border-slate-700/50 card-hover group"
                            >
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-primary-500/10 text-primary-400 flex items-center justify-center border border-primary-500/20">
                                            <Store size={28} />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-white text-xl tracking-tight leading-tight">{event.shopSource}</h3>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">
                                                <Calendar size={12} className="text-slate-600" />
                                                {new Date(event.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-white tracking-tighter">{getCurrencySymbol(config?.currency || 'INR')}{event.totalAmount}</div>
                                        <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 font-black uppercase tracking-wider mt-1">
                                            <User size={10} className="text-slate-600" />
                                            {event.buyer}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-5 border-t border-slate-800/50 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex -space-x-3">
                                            {[1, 2, 3].map((i) => (
                                                <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center shadow-lg">
                                                    <Package size={14} className="text-slate-600" />
                                                </div>
                                            ))}
                                        </div>
                                        {/* In a real app we'd fetch actual item counts, for now keeping placeholder logic consistent */}
                                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Items purchased</span>
                                    </div>
                                    <button className="text-[10px] font-black text-primary-400 uppercase tracking-[0.2em] flex items-center gap-2 group-hover:gap-3 transition-all px-4 py-2 bg-primary-500/5 rounded-xl border border-primary-500/10 group-hover:bg-primary-500/10 group-hover:border-primary-500/30 font-bold">
                                        View Details
                                        <ArrowUpRight size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}

                {!loading && events.length === 0 && (
                    <div className="text-center py-20 glass rounded-[3rem] border-dashed border-2 border-slate-800">
                        <History size={48} className="mx-auto text-slate-800 mb-4" />
                        <p className="text-slate-500 font-medium italic uppercase tracking-widest text-xs">No records found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Checkout;
