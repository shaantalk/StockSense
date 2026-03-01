import { useEffect, useState } from 'react';
import { Search, Filter, Package, Loader2, Plus, X, CheckCircle2, ShoppingCart } from 'lucide-react';
import { googleApiService } from '../services/googleApiService';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import type { InventoryItem, UserConfig } from '../types';

interface InventoryListProps {
    config: UserConfig | null;
}

const InventoryList = ({ config }: InventoryListProps) => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [searchParams] = useSearchParams();
    const [filter, setFilter] = useState<'All' | 'Low' | 'Use now' | 'Expired' | 'Out of stock'>(searchParams.get('filter') as any || 'All');

    const [showAddModal, setShowAddModal] = useState(false);
    const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
        itemName: '',
        category: 'Grocery',
        currentQty: 1,
        unit: 'Numbers',
        threshold: 1,
        status: 'Stocked',
        expiryDate: '',
        useNowDaysPrior: 1
    });
    const [adding, setAdding] = useState(false);
    const [statusActionItem, setStatusActionItem] = useState<InventoryItem | null>(null);

    useEffect(() => {
        if (config?.activeHouseholdId) {
            fetchInventory();
        }
    }, [config?.activeHouseholdId]);

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const data = await googleApiService.getInventory();

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const processedData = await Promise.all(data.map(async (item) => {
                if (item.expiryDate && item.status !== 'Use now' && item.status !== 'Expired' && item.status !== 'Out of stock') {
                    const expDate = new Date(item.expiryDate);
                    expDate.setHours(0, 0, 0, 0);
                    const diffTime = expDate.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const thresholdDays = item.useNowDaysPrior ?? 1;

                    if (diffDays <= thresholdDays && diffDays >= 0) {
                        const updatedItem = { ...item, status: 'Use now' };
                        // Update in background silently
                        await googleApiService.updateInventoryItem(updatedItem).catch(console.error);
                        return updatedItem;
                    }
                }
                return item;
            }));

            setItems(processedData);
        } catch (e) {
            console.error("Failed to fetch stock:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToWishlist = async (item: InventoryItem) => {
        let updatedItem = item;
        let requiresInventoryUpdate = false;

        if (item.status === 'Expired') {
            updatedItem = { ...item, currentQty: 0, status: 'Out of stock' };
            requiresInventoryUpdate = true;
        }

        // Optimistic update
        setItems(prev => prev.map(i =>
            i.itemName === item.itemName ? updatedItem : i
        ));

        try {
            if (requiresInventoryUpdate) {
                await googleApiService.updateInventoryItem(updatedItem);
            }

            // Add to Shopping List
            await googleApiService.addShoppingItem({
                itemName: item.itemName,
                qtyNeeded: 1, // Default or prompt user
                priority: 'Medium'
            });

            fetchInventory();
        } catch (e) {
            console.error("Failed to add to wish list:", e);
            alert("Failed to add to wish list");
            fetchInventory(); // Revert
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!statusActionItem) return;

        const updatedItem = { ...statusActionItem, status: newStatus };
        if (newStatus === 'Stocked' && statusActionItem.status !== 'Stocked') {
            const todayStr = new Date().toISOString().split('T')[0];
            updatedItem.restockedDate = todayStr;
        }

        setItems(prev => prev.map(i => i.itemName === statusActionItem.itemName ? updatedItem : i));
        setStatusActionItem(null);

        try {
            await googleApiService.updateInventoryItem(updatedItem);
        } catch (e) {
            console.error("Failed to update status:", e);
            alert("Failed to update status");
            fetchInventory(); // Revert
        }
    };

    const handleAddItem = async () => {
        if (!newItem.itemName) return;
        setAdding(true);
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const itemToSave = {
                ...newItem,
                addedDate: newItem.addedDate || todayStr
            };
            await googleApiService.updateInventoryItem(itemToSave as InventoryItem);
            setShowAddModal(false);
            setNewItem({
                itemName: '',
                category: config?.categories?.[0]?.name || 'Grocery',
                currentQty: 1,
                unit: config?.units?.[0] || 'Numbers',
                threshold: 1,
                status: 'Stocked',
                expiryDate: '',
                useNowDaysPrior: 1
            });
            fetchInventory();
        } catch (e: any) {
            alert(e.message || "Failed to add item");
        } finally {
            setAdding(false);
        }
    };

    const filteredItems = items.filter(item => {
        const matchesSearch = item.itemName.toLowerCase().includes(search.toLowerCase());
        if (!matchesSearch) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Use local timezone string formatting (YYYY-MM-DD)
        const formatYMD = (d: Date) => {
            const z = (n: number) => ('0' + n).slice(-2);
            return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
        };
        const todayStr = formatYMD(today);

        if (filter === 'All') return true;
        if (filter === 'Low') return item.status === 'Low' || (item.currentQty <= item.threshold && item.currentQty > 0);
        if (filter === 'Expired') return item.status === 'Expired' || (!!item.expiryDate && item.expiryDate < todayStr);
        return item.status === filter;
    });

    return (
        <div className="space-y-6 animate-fade-in ">
            <header className="space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-white">Stock</h1>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="p-3 bg-primary-600 text-white rounded-2xl hover:bg-primary-500 transition-colors shadow-lg shadow-primary-500/20"
                    >
                        <Plus size={20} />
                    </button>
                </div>

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
                    {['All', 'Low', 'Use now', 'Expired', 'Out of stock'].map((f) => (
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
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors`}
                                        style={{ backgroundColor: `${config?.statuses?.find(s => s.name === item.status)?.color || '#3b82f6'}20`, color: config?.statuses?.find(s => s.name === item.status)?.color || '#3b82f6' }}>
                                        <Package size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-base leading-tight">{item.itemName}</h3>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1.5">
                                            {item.currentQty} {item.unit} •
                                            <span
                                                className="w-2 h-2 rounded-full inline-block"
                                                style={{ backgroundColor: config?.categories?.find(c => c.name === item.category)?.color || '#94a3b8' }}
                                            />
                                            {item.category}
                                            {item.expiryDate && (
                                                <>
                                                    <span className="opacity-50 mx-1">•</span>
                                                    <span className={`${item.expiryDate < new Date().toISOString().split('T')[0] ? 'text-red-400' : 'text-orange-400'} flex items-center gap-1`}>
                                                        Exp: {item.expiryDate}
                                                    </span>
                                                </>
                                            )}
                                        </p>
                                        {(item.addedDate || item.restockedDate) && (
                                            <p className="text-[10px] text-slate-500 font-medium mt-1 flex items-center gap-2">
                                                {item.addedDate && <span>Added: {item.addedDate}</span>}
                                                {item.restockedDate && <span>Restocked: {item.restockedDate}</span>}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleAddToWishlist(item)}
                                        className="p-2 bg-slate-800 text-slate-400 rounded-xl hover:bg-blue-500/20 hover:text-blue-400 transition-all border border-slate-700"
                                        title="Add to Wish List"
                                    >
                                        <ShoppingCart size={18} />
                                    </button>

                                    <button
                                        onClick={() => setStatusActionItem(item)}
                                        className="p-2 bg-slate-800 text-slate-400 rounded-xl hover:bg-primary-500/20 hover:text-primary-400 transition-all border border-slate-700"
                                        title="Change Status"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
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

            <AnimatePresence>
                {showAddModal && (
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
                            className="w-full max-w-md glass p-6 rounded-[2.5rem] border-primary-500/30 space-y-6 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-black text-white tracking-tight">Add to Stock</h3>
                                <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 block">Item Name</label>
                                    <input
                                        type="text"
                                        value={newItem.itemName}
                                        onChange={(e) => setNewItem({ ...newItem, itemName: e.target.value })}
                                        placeholder="e.g. Milk"
                                        className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl h-12 px-4 text-white focus:outline-none focus:border-primary-500 transition-all text-sm font-bold"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 block">Category</label>
                                        <select
                                            value={newItem.category}
                                            onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                                            className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl h-12 px-4 text-white focus:outline-none focus:border-primary-500 transition-all text-sm font-bold appearance-none"
                                        >
                                            {config?.categories?.map(c => (
                                                <option key={c.name} value={c.name}>{c.name}</option>
                                            ))}
                                            {(!config?.categories || config.categories.length === 0) && (
                                                <option value="Grocery">Grocery</option>
                                            )}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 block">Unit</label>
                                        <select
                                            value={newItem.unit}
                                            onChange={(e) => setNewItem({ ...newItem, unit: e.target.value as any })}
                                            className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl h-12 px-4 text-white focus:outline-none focus:border-primary-500 transition-all text-sm font-bold appearance-none"
                                        >
                                            {config?.units?.map(u => (
                                                <option key={u} value={u}>{u}</option>
                                            ))}
                                            {(!config?.units || config.units.length === 0) && (
                                                <option value="Numbers">Numbers</option>
                                            )}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 block">Initial Qty</label>
                                        <input
                                            type="number"
                                            value={newItem.currentQty}
                                            onChange={(e) => setNewItem({ ...newItem, currentQty: Number(e.target.value) })}
                                            className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl h-12 px-4 text-white focus:outline-none focus:border-primary-500 transition-all text-sm font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 block">Min Threshold</label>
                                        <input
                                            type="number"
                                            value={newItem.threshold}
                                            onChange={(e) => setNewItem({ ...newItem, threshold: Number(e.target.value) })}
                                            className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl h-12 px-4 text-white focus:outline-none focus:border-primary-500 transition-all text-sm font-bold"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 block">Status</label>
                                    <select
                                        value={newItem.status}
                                        onChange={(e) => setNewItem({ ...newItem, status: e.target.value as any })}
                                        className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl h-12 px-4 text-white focus:outline-none focus:border-primary-500 transition-all text-sm font-bold appearance-none"
                                    >
                                        {config?.statuses?.map(s => (
                                            <option key={s.name} value={s.name}>{s.name}</option>
                                        ))}
                                        {(!config?.statuses || config.statuses.length === 0) && (
                                            <option value="Normal">Normal</option>
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 block">Expiry Date (Optional)</label>
                                    <input
                                        type="date"
                                        value={newItem.expiryDate || ''}
                                        onChange={(e) => setNewItem({ ...newItem, expiryDate: e.target.value })}
                                        className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl h-12 px-4 text-white focus:outline-none focus:border-primary-500 transition-all text-sm font-bold"
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 block">Mark 'Use Now' before (Days) (Optional)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newItem.useNowDaysPrior}
                                        onChange={(e) => setNewItem({ ...newItem, useNowDaysPrior: Number(e.target.value) })}
                                        className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl h-12 px-4 text-white focus:outline-none focus:border-primary-500 transition-all text-sm font-bold"
                                    />
                                </div>
                            </div>

                            <button
                                disabled={!newItem.itemName || adding}
                                onClick={handleAddItem}
                                className="w-full h-14 rounded-2xl bg-primary-600 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-primary-500/20 hover:bg-primary-500 transition-all flex items-center justify-center gap-2"
                            >
                                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 size={16} /> Save Item</>}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Status Change Modal */}
            <AnimatePresence>
                {statusActionItem && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0f172a]/90 backdrop-blur-sm"
                        onClick={() => setStatusActionItem(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm glass p-6 rounded-[2.5rem] border-primary-500/30 space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-black text-white tracking-tight">Change Status</h3>
                                <button onClick={() => setStatusActionItem(null)} className="text-slate-500 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <p className="text-sm font-bold text-slate-300">Set status for <span className="text-white">{statusActionItem.itemName}</span></p>

                            <div className="flex flex-col gap-2">
                                {config?.statuses?.map(s => (
                                    <button
                                        key={s.name}
                                        onClick={() => handleStatusChange(s.name)}
                                        className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-700/50 hover:bg-slate-800/50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                                            <span className="font-bold text-slate-200 group-hover:text-white transition-colors">{s.name}</span>
                                        </div>
                                        {statusActionItem.status === s.name && <CheckCircle2 size={18} className="text-primary-500" />}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default InventoryList;
