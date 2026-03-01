import { useEffect, useState } from 'react';
import { Search, Filter, AlertTriangle, ChevronRight, Package, Loader2 } from 'lucide-react';
import { gasService } from '../services/gasService';
import type { InventoryItem } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const InventoryList = () => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'All' | 'Low Stock' | 'Near Finish'>('All');

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        setLoading(true);
        const data = await gasService.getInventory();
        setItems(data);
        setLoading(false);
    };

    const handleNearFinish = async (itemName: string) => {
        setItems(prev => prev.map(item =>
            item.itemName === itemName ? { ...item, status: 'Near Finish' } : item
        ));
        await gasService.setNearFinish(itemName);
        fetchInventory();
    };

    const filteredItems = items.filter(item => {
        const matchesSearch = item.itemName.toLowerCase().includes(search.toLowerCase());
        if (filter === 'All') return matchesSearch;
        return matchesSearch && item.status === filter;
    });

    return (
        <div className="space-y-6 animate-fade-in ">
            <header className="space-y-4">
                <h1 className="text-2xl font-bold text-white">Inventory</h1>

                <div className="flex gap-2">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-400 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search items..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all font-medium placeholder:text-slate-600"
                        />
                    </div>
                    <button className="p-3 glass rounded-2xl text-slate-400 hover:text-primary-400 transition-colors border-slate-700/50">
                        <Filter size={20} />
                    </button>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {['All', 'Low Stock', 'Near Finish'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${filter === f
                                    ? 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-500/20'
                                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
                    <p className="text-slate-500 font-medium">Loading stock...</p>
                </div>
            ) : (
                <div className="grid gap-3 pb-4">
                    <AnimatePresence>
                        {filteredItems.map((item, idx) => (
                            <motion.div
                                key={item.itemName}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="glass p-4 rounded-3xl flex items-center justify-between group border-slate-700/50"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${item.status === 'Near Finish' ? 'bg-red-500/20 text-red-400' : 'bg-primary-500/10 text-primary-400'
                                        }`}>
                                        <Package size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-base leading-tight">{item.itemName}</h3>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                                            {item.currentQty} {item.unit} • {item.category}
                                        </p>
                                    </div>
                                </div>

                                {item.status !== 'Near Finish' ? (
                                    <button
                                        onClick={() => handleNearFinish(item.itemName)}
                                        className="p-2 bg-slate-800 text-slate-400 rounded-xl hover:bg-red-500/20 hover:text-red-400 transition-all border border-slate-700"
                                    >
                                        <AlertTriangle size={18} />
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black bg-red-500/20 text-red-500 px-2 py-1 rounded-lg uppercase tracking-tighter">Listed</span>
                                        <ChevronRight size={16} className="text-slate-600" />
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {filteredItems.length === 0 && (
                        <div className="text-center py-20 glass rounded-3xl border-dashed border-slate-700 border-2">
                            <p className="text-slate-500 font-medium">No items found.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default InventoryList;
