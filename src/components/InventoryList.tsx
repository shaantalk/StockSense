import { useState } from 'react';
import { Search, Filter, Package, Loader2, Plus, Minus, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import type { UserConfig } from '../types';
import { AddItemModal } from './Inventory/AddItemModal';
import { StatusChangeModal } from './Inventory/StatusChangeModal';
import { useInventory, useUpdateInventoryBatch, useAddShoppingItem, useLogWastageEvent, useLogConsumeEvent, useUpdateItem, type CombinedInventoryItem } from '../hooks/useInventory';

interface InventoryListProps {
    config: UserConfig | null;
}

const InventoryList = ({ config }: InventoryListProps) => {
    const [search, setSearch] = useState('');
    const [searchParams] = useSearchParams();
    const [filter, setFilter] = useState<'All' | 'Low' | 'USE_NOW' | 'EXPIRED' | 'Out of stock'>(searchParams.get('filter') as any || 'All');

    const [showAddModal, setShowAddModal] = useState(false);
    const [newItem, setNewItem] = useState<Partial<CombinedInventoryItem>>({
        itemName: '',
        category: 'Grocery',
        currentQty: 1,
        unit: 'Numbers',
        threshold: 1,
        status: 'STOCKED',
        expiryDate: '',
        useNowDaysPrior: 1,
        stepQty: 1,
        notes: ''
    });
    const [adding, setAdding] = useState(false);
    const [statusActionItem, setStatusActionItem] = useState<CombinedInventoryItem | null>(null);

    const { data: items = [], isLoading: loading } = useInventory(config?.activeHouseholdId);
    const updateInventoryBatch = useUpdateInventoryBatch();
    const updateItem = useUpdateItem();
    const addShoppingItem = useAddShoppingItem();
    const logWastage = useLogWastageEvent();
    const logConsume = useLogConsumeEvent();

    const handleAddToWishlist = async (item: CombinedInventoryItem) => {
        try {
            // First log wastage if item is Expired
            if (item.status === 'EXPIRED' && item.currentQty > 0) {
                logWastage.mutate({
                    eventId: `WST-${Date.now()}`,
                    date: new Date().toISOString(),
                    itemId: item.itemId,
                    batchId: item.batchId,
                    qtyWasted: item.currentQty,
                    valueLost: 0,
                    reason: "Expired"
                });
            }

            // Add to Shopping List
            addShoppingItem.mutate({
                itemId: item.itemId,
                qtyNeeded: item.stepQty || 1, // Add minimum step qty instead of 1
                priority: 'MEDIUM'
            });

            // Update item: set currentQty to 0 and status to "CONSUMED"
            updateInventoryBatch.mutate({
                batchId: item.batchId,
                itemId: item.itemId,
                qtyRemaining: 0,
                status: 'CONSUMED'
            });
        } catch (e) {
            console.error("Failed to add to wish list:", e);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!statusActionItem) return;

        if (newStatus === 'EXPIRED' && statusActionItem.status !== 'EXPIRED' && statusActionItem.currentQty > 0) {
            logWastage.mutate({
                eventId: `WST-${Date.now()}`,
                date: new Date().toISOString(),
                itemId: statusActionItem.itemId,
                batchId: statusActionItem.batchId,
                qtyWasted: statusActionItem.currentQty,
                valueLost: statusActionItem.currentQty * (statusActionItem.pricePerUnit || 0),
                reason: "Marked as Expired"
            });
        }

        updateInventoryBatch.mutate({
            batchId: statusActionItem.batchId,
            itemId: statusActionItem.itemId,
            status: newStatus as any
        });
        setStatusActionItem(null);
    };

    const handleAddItem = async () => {
        if (!newItem.itemName) return;
        setAdding(true);
        try {
            const todayStr = new Date().toISOString().split('T')[0];

            // 1. Create/Update Item
            const itemId = await updateItem.mutateAsync({
                itemName: newItem.itemName,
                category: newItem.category || 'Grocery',
                stockType: newItem.stockType || 'MIXED',
                unit: newItem.unit || 'Numbers',
                threshold: newItem.threshold || 1,
                useNowDaysPrior: newItem.useNowDaysPrior || 1,
                stepQty: newItem.stepQty || 1,
                notes: newItem.notes || ''
            });

            // 2. Create Batch
            updateInventoryBatch.mutate({
                batchId: '', // Will be generated in service
                itemId,
                qtyAdded: newItem.currentQty || 1,
                qtyRemaining: newItem.currentQty || 1,
                pricePerUnit: newItem.pricePerUnit || 0,
                expiryDate: newItem.expiryDate || '',
                addedDate: newItem.addedDate || todayStr,
                status: newItem.status as any || 'STOCKED'
            });

            setShowAddModal(false);
            setNewItem({
                itemName: '',
                category: config?.categories?.[0]?.name || 'Grocery',
                currentQty: 1,
                unit: config?.units?.[0]?.name || 'Numbers',
                threshold: 1,
                status: 'STOCKED',
                expiryDate: '',
                useNowDaysPrior: 1,
                stepQty: 1,
                notes: ''
            });
        } catch (e: any) {
            alert(e.message || "Failed to add item");
        } finally {
            setAdding(false);
        }
    };

    const handleQtyChange = (item: CombinedInventoryItem, delta: number) => {
        const step = item.stepQty || 1;
        const newQty = Math.max(0, item.currentQty + (delta * step));

        if (delta < 0 && item.currentQty > newQty) {
            logConsume.mutate({
                eventId: `CNS-${Date.now()}`,
                date: new Date().toISOString(),
                itemId: item.itemId,
                batchId: item.batchId,
                qtyConsumed: item.currentQty - newQty,
                consumer: "Household Member"
            });

            if (newQty <= item.threshold && item.currentQty > item.threshold) {
                addShoppingItem.mutate({
                    itemId: item.itemId,
                    qtyNeeded: item.stepQty || 1,
                    priority: 'MEDIUM'
                });
            }
        }

        const newStatus = newQty === 0 ? 'CONSUMED' : (newQty <= item.threshold ? 'STOCKED' : item.status === 'CONSUMED' ? 'STOCKED' : item.status);

        updateInventoryBatch.mutate({
            batchId: item.batchId,
            itemId: item.itemId,
            qtyRemaining: newQty,
            status: newStatus as any
        });
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
        if (filter === 'Low') return item.currentQty <= item.threshold && item.currentQty > 0;
        if (filter === 'EXPIRED') return item.status === 'EXPIRED' || (!!item.expiryDate && item.expiryDate < todayStr);
        return item.status === filter || (item.status === 'CONSUMED' && filter === 'Out of stock');
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
                    {['All', 'Low', 'USE_NOW', 'EXPIRED', 'Out of stock'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${filter === f
                                ? 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-500/20'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                                }`}
                        >
                            {f === 'USE_NOW' ? 'Use now' : f === 'EXPIRED' ? 'Expired' : f}
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
                                key={item.batchId}
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
                                        {(item.addedDate || item.stepQty || item.notes) && (
                                            <div className="text-[10px] text-slate-500 font-medium mt-1">
                                                <div className="flex items-center gap-2">
                                                    {item.addedDate && <span>Added: {item.addedDate}</span>}
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
                                    <div className="flex items-center bg-slate-800 rounded-xl border border-slate-700 p-0.5">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleQtyChange(item, -1); }}
                                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                            title="Reduce quantity (Consume)"
                                        >
                                            <Minus size={16} />
                                        </button>
                                        <span className="text-white font-bold text-sm min-w-[1.5rem] text-center">{item.currentQty}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleQtyChange(item, 1); }}
                                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                            title="Increase quantity"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>

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
