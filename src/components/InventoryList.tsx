import { useEffect, useState } from 'react';
import { Search, Filter, Package, Loader2, Plus, ShoppingCart } from 'lucide-react';
import { googleApiService } from '../services/googleApiService';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import type { InventoryItem, UserConfig } from '../types';
import { AddItemModal } from './Inventory/AddItemModal';
import { StatusChangeModal } from './Inventory/StatusChangeModal';

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
        useNowDaysPrior: 1,
        stepQty: 1,
        notes: ''
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
        try {
            // First log wastage if item is Expired
            if (item.status === 'Expired' && item.currentQty > 0) {
                await googleApiService.logWastageEvent({
                    eventId: `WST-${Date.now()}`,
                    date: new Date().toISOString(),
                    itemName: item.itemName,
                    qtyWasted: item.currentQty,
                    reason: "Expired"
                });
            }

            // Add to Shopping List
            await googleApiService.addShoppingItem({
                itemName: item.itemName,
                qtyNeeded: item.stepQty || 1, // Add minimum step qty instead of 1
                priority: 'Medium'
            });

            // Update item: set currentQty to 0 and status to "Out of stock"
            const updatedItem = {
                ...item,
                currentQty: 0,
                status: 'Out of stock' as const
            };

            // Optimistic update
            setItems(prev => prev.map(i =>
                i.itemName === item.itemName ? updatedItem : i
            ));

            await googleApiService.updateInventoryItem(updatedItem);
            fetchInventory();
        } catch (e) {
            console.error("Failed to add to wish list:", e);
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
                useNowDaysPrior: 1,
                stepQty: 1,
                notes: ''
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
                                        {(item.addedDate || item.restockedDate || item.stepQty || item.notes) && (
                                            <div className="text-[10px] text-slate-500 font-medium mt-1">
                                                <div className="flex items-center gap-2">
                                                    {item.addedDate && <span>Added: {item.addedDate}</span>}
                                                    {item.restockedDate && <span>Restocked: {item.restockedDate}</span>}
                                                </div>
                                                {(item.stepQty !== undefined && item.stepQty > 1) && (
                                                    <div className="mt-0.5"><span className="text-slate-400">Step Qty:</span> {item.stepQty}</div>
                                                )}
                                                {item.notes && (
                                                    <div className="mt-0.5 line-clamp-1"><span className="text-slate-400">Notes:</span> {item.notes}</div>
                                                )}
                                            </div>
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

            <AddItemModal
                show={showAddModal}
                onClose={() => setShowAddModal(false)}
                newItem={newItem}
                setNewItem={setNewItem}
                onAdd={handleAddItem}
                adding={adding}
                config={config}
                existingItems={items}
            />

            <StatusChangeModal
                item={statusActionItem}
                onClose={() => setStatusActionItem(null)}
                onChangeStatus={handleStatusChange}
                config={config}
            />
        </div>
    );
};

export default InventoryList;
