import { useEffect, useState } from 'react';
import { ClipboardList, CheckCircle2, ShoppingBag, User, Store, ChevronRight, PackageCheck, Trash2, Loader2, Eye, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { googleApiService } from '../services/googleApiService';
import type { ShoppingListItem, UserConfig, ShopEvent, PurchasedItem, InventoryItem } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { getCurrencySymbol, convertCurrency, extractCode } from '../utils/currency';
import { fetchAndCacheExchangeRates } from '../services/initService';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ShoppingListProps {
    config: UserConfig | null;
}

const ShoppingList = ({ config }: ShoppingListProps) => {
    const [list, setList] = useState<ShoppingListItem[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [showCheckout, setShowCheckout] = useState(false);
    const [detailsItem, setDetailsItem] = useState<InventoryItem | null>(null);

    // Checkout Form State
    const [shop, setShop] = useState('');
    const [buyer, setBuyer] = useState('');
    const [totalAmount, setTotalAmount] = useState<number>(0);
    const [convertedTotal, setConvertedTotal] = useState<number | null>(null);
    const [converting, setConverting] = useState(false);

    const buyerObj = config?.members.find(m => m.email === buyer);
    const buyerPrefCurrency = buyerObj?.preferredCurrency || config?.currency || 'INR';
    const isDifferentCurrency = extractCode(buyerPrefCurrency) !== extractCode(config?.currency || 'INR');

    useEffect(() => {
        let mounted = true;
        if (isDifferentCurrency && totalAmount > 0) {
            setConverting(true);
            fetchAndCacheExchangeRates().then(() => {
                convertCurrency(totalAmount, buyerPrefCurrency, config?.currency || 'INR').then(res => {
                    if (mounted) {
                        setConvertedTotal(res);
                        setConverting(false);
                    }
                });
            });
        } else {
            setConvertedTotal(null);
        }
        return () => { mounted = false; };
    }, [totalAmount, buyerPrefCurrency, config?.currency, isDifferentCurrency]);

    useEffect(() => {
        if (config?.activeHouseholdId) {
            fetchData();
        }
    }, [config?.activeHouseholdId]);

    useEffect(() => {
        if (config?.shops?.[0]) setShop(config.shops[0].name);
        if (config?.members?.[0]) setBuyer(config.members[0].email);
    }, [config]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [shopData, invData] = await Promise.all([
                googleApiService.getShoppingList(),
                googleApiService.getInventory()
            ]);
            setList(shopData);
            setInventory(invData);
        } catch (e) {
            console.error("Failed to fetch shopping list:", e);
        } finally {
            setLoading(false);
        }
    };

    const toggleItem = (itemName: string) => {
        setSelectedItems(prev =>
            prev.includes(itemName)
                ? prev.filter(i => i !== itemName)
                : [...prev, itemName]
        );
    };

    const handleUpdateQty = async (e: React.MouseEvent, item: ShoppingListItem, change: number) => {
        e.stopPropagation();
        const invItem = inventory.find(i => i.itemName === item.itemName);
        const step = invItem?.stepQty || 1;

        let newQty = item.qtyNeeded + (change * step);
        if (newQty < step) newQty = step;

        if (newQty === item.qtyNeeded) return;

        // Optimistic update
        setList(prev => prev.map(i => i.itemName === item.itemName ? { ...i, qtyNeeded: newQty } : i));

        try {
            await googleApiService.updateShoppingItem(item.itemName, newQty);
        } catch (err) {
            console.error("Failed to update quantity:", err);
            fetchData(); // Revert on failure
        }
    };

    const handleRemoveItem = async (e: React.MouseEvent, itemName: string) => {
        e.stopPropagation();
        setList(prev => prev.filter(i => i.itemName !== itemName));
        setSelectedItems(prev => prev.filter(i => i !== itemName));
        try {
            await googleApiService.removeShoppingItem(itemName);
        } catch (err) {
            fetchData();
        }
    };

    const handleCheckout = async () => {
        if (!shop || !buyer || selectedItems.length === 0) return;

        const finalAmount = (isDifferentCurrency && convertedTotal !== null) ? convertedTotal : totalAmount;

        const event: ShopEvent = {
            eventId: `EVT-${Date.now()}`,
            date: new Date().toISOString(),
            shopSource: shop,
            totalAmount: finalAmount,
            buyer: buyer,
            entryType: 'Summary'
        };

        const items: PurchasedItem[] = selectedItems.map(name => ({
            eventId: event.eventId,
            itemName: name,
            qtyBought: list.find(l => l.itemName === name)?.qtyNeeded || 1,
            pricePerUnit: 0
        }));

        try {
            await googleApiService.logPurchase(event, items);

            // Remove items from shopping list
            for (const name of selectedItems) {
                await googleApiService.removeShoppingItem(name);
            }

            setSelectedItems([]);
            setShowCheckout(false);
            setTotalAmount(0);
            fetchData();
        } catch (e) {
            console.error("Checkout failed:", e);
            alert("Failed to complete purchase logging");
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Wish List</h1>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-primary-400 bg-primary-500/10 px-3 py-1.5 rounded-xl uppercase tracking-wider">
                        {list.length} Items
                    </span>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
                    <p className="text-slate-500 font-medium">Updating list...</p>
                </div>
            ) : (
                <>
                    <div className="grid gap-3">
                        <AnimatePresence mode="popLayout">
                            {list.map((item, idx) => {
                                const invItem = inventory.find(i => i.itemName === item.itemName);
                                const step = invItem?.stepQty || 1;

                                return (
                                    <motion.div
                                        key={item.itemName}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: idx * 0.05 }}
                                        onClick={() => toggleItem(item.itemName)}
                                        className={cn(
                                            "glass p-4 rounded-[2rem] flex items-center justify-between group cursor-pointer transition-all duration-300 border-2",
                                            selectedItems.includes(item.itemName)
                                                ? "border-primary-500/50 bg-primary-500/10 shadow-[0_0_20px_rgba(14,165,233,0.1)]"
                                                : "border-slate-800/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-11 h-11 rounded-2xl flex items-center justify-center transition-all",
                                                selectedItems.includes(item.itemName)
                                                    ? "bg-primary-600 text-white rotate-6 scale-110 shadow-lg shadow-primary-500/30"
                                                    : "bg-slate-800 text-slate-500 group-hover:bg-slate-700"
                                            )}>
                                                {selectedItems.includes(item.itemName) ? <CheckCircle2 size={22} /> : <ClipboardList size={22} />}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white text-base flex items-center gap-2">
                                                    {item.itemName}
                                                    {invItem && (
                                                        <button onClick={(e) => { e.stopPropagation(); setDetailsItem(invItem); }} className="text-slate-500 hover:text-primary-400">
                                                            <Eye size={16} />
                                                        </button>
                                                    )}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <button
                                                        onClick={(e) => handleUpdateQty(e, item, -1)}
                                                        className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700 hover:text-white transition-colors"
                                                        disabled={item.qtyNeeded <= step}
                                                        title="Decrease Qty"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="text-xs font-black text-slate-300 w-auto min-w-[20px] text-center">{item.qtyNeeded} <span className="text-slate-500 uppercase font-bold text-[10px]">{invItem?.unit || ''}</span></span>
                                                    <button
                                                        onClick={(e) => handleUpdateQty(e, item, 1)}
                                                        className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700 hover:text-white transition-colors"
                                                        title="Increase Qty"
                                                    >
                                                        +
                                                    </button>
                                                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1 hidden sm:inline">• {item.priority}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {selectedItems.includes(item.itemName) && (
                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                                    <PackageCheck className="text-primary-400" size={24} />
                                                </motion.div>
                                            )}
                                            <button
                                                onClick={(e) => handleRemoveItem(e, item.itemName)}
                                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                                                title="Remove from Wish List"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {list.length === 0 && (
                            <div className="text-center py-20 glass rounded-[2.5rem] border-dashed border-2 border-slate-800">
                                <div className="w-16 h-16 bg-slate-900 text-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
                                    <ShoppingBag size={32} />
                                </div>
                                <p className="text-slate-500 font-medium italic">Empty list. Fresh start!</p>
                            </div>
                        )}
                    </div>

                    {/* Action Bar */}
                    <AnimatePresence>
                        {selectedItems.length > 0 && (
                            <motion.div
                                initial={{ y: 100, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 100, opacity: 0 }}
                                className="fixed bottom-24 left-4 right-4 z-[60] max-w-[calc(448px-2rem)] mx-auto"
                            >
                                <button
                                    onClick={() => setShowCheckout(true)}
                                    className="w-full btn-primary h-16 rounded-[2rem] flex items-center justify-between px-8 text-lg font-black shadow-2xl shadow-primary-500/20 active:scale-95 transition-all"
                                >
                                    <span className="flex items-center gap-3">
                                        <CheckCircle2 size={24} />
                                        Restocked {selectedItems.length} items
                                    </span>
                                    <ChevronRight size={24} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}

            {/* Checkout Modal */}
            <AnimatePresence>
                {showCheckout && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCheckout(false)}
                            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[70] flex items-end justify-center"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900 rounded-t-[3rem] p-8 z-[80] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] border-t border-slate-700/50"
                        >
                            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-8" />
                            <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary-500/20 text-primary-400 flex items-center justify-center">
                                    <PackageCheck size={28} />
                                </div>
                                Complete Purchase
                            </h2>

                            <div className="space-y-8">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 block">Store Location</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {config?.shops.map(s => (
                                            <button
                                                key={s.name}
                                                onClick={() => setShop(s.name)}
                                                className={cn(
                                                    "px-4 py-4 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all border",
                                                    shop === s.name ? "bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-500/20" : "bg-slate-800/50 text-slate-400 border-slate-700/50 hover:border-slate-600"
                                                )}
                                                style={shop === s.name ? {} : { borderColor: `${s.color}50`, color: s.color }}
                                            >
                                                <Store size={18} />
                                                {s.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 block">Purchased By</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {config?.members.map(m => (
                                            <button
                                                key={m.email}
                                                onClick={() => setBuyer(m.email)}
                                                className={cn(
                                                    "px-4 py-4 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all border",
                                                    buyer === m.email ? "bg-accent-600 border-accent-500 text-white shadow-lg shadow-accent-500/20" : "bg-slate-800/50 text-slate-400 border-slate-700/50 hover:border-slate-600"
                                                )}
                                                style={buyer === m.email ? {} : { borderColor: `${m.color}50`, color: m.color }}
                                            >
                                                <User size={18} />
                                                {m.email.split('@')[0]}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 block">Total Bill Amount</label>
                                    <div className="relative group">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-500 text-xl group-focus-within:text-primary-400">{getCurrencySymbol(buyerPrefCurrency)}</span>
                                        <input
                                            type="number"
                                            value={totalAmount || ''}
                                            onChange={(e) => setTotalAmount(Number(e.target.value))}
                                            className="w-full bg-slate-800 border-2 border-slate-700/50 rounded-[1.5rem] py-5 pl-12 pr-6 font-black text-2xl text-white focus:outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition-all"
                                        />
                                    </div>
                                    {isDifferentCurrency && totalAmount > 0 && (
                                        <div className="mt-3 text-xs font-bold text-accent-400 bg-accent-500/10 p-4 rounded-2xl border border-accent-500/20 flex justify-between items-center">
                                            <span>Auto-converted to Household Currency ({extractCode(config?.currency || 'INR')})</span>
                                            {converting ? <Loader2 size={16} className="animate-spin" /> : <span className="text-sm">{getCurrencySymbol(config?.currency || 'INR')}{convertedTotal}</span>}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button onClick={() => setShowCheckout(false)} className="flex-1 bg-slate-800 text-slate-400 h-16 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors">
                                        <Trash2 size={20} />
                                        Cancel
                                    </button>
                                    <button onClick={handleCheckout} className="flex-[2] btn-primary h-16 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-primary-500/20 active:scale-95 transition-all">
                                        <ShoppingBag size={20} />
                                        Save Logging
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Details Modal */}
            <AnimatePresence>
                {detailsItem && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[90] flex items-center justify-center p-6 bg-[#0f172a]/90 backdrop-blur-sm"
                        onClick={() => setDetailsItem(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm glass p-6 rounded-[2.5rem] border-primary-500/30 space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                                    <Info className="text-primary-400" size={24} />
                                    Details
                                </h3>
                                <button onClick={() => setDetailsItem(null)} className="text-slate-500 hover:text-white bg-slate-800 rounded-full p-1.5">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-black text-slate-300">Item Name</h4>
                                    <p className="text-lg font-bold text-white">{detailsItem.itemName}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Stock Left</p>
                                        <p className="font-bold text-white">{detailsItem.currentQty} <span className="text-xs text-slate-400">{detailsItem.unit}</span></p>
                                    </div>
                                    <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Step Qty</p>
                                        <p className="font-bold text-white">{detailsItem.stepQty || 1} <span className="text-xs text-slate-400">{detailsItem.unit}</span></p>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Notes</h4>
                                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 min-h-[80px]">
                                        <p className="text-sm text-slate-300 whitespace-pre-wrap">{detailsItem.notes || <span className="italic text-slate-600">No notes provided.</span>}</p>
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <p className="text-xs text-slate-500 font-medium">Category: <span className="font-bold text-white">{detailsItem.category}</span></p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ShoppingList;
