import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Loader2 } from 'lucide-react';
import type { InventoryItem, UserConfig } from '../../types';

interface AddItemModalProps {
    show: boolean;
    onClose: () => void;
    newItem: Partial<InventoryItem>;
    setNewItem: (item: Partial<InventoryItem>) => void;
    onAdd: () => void;
    adding: boolean;
    config: UserConfig | null;
}

export const AddItemModal = ({ show, onClose, newItem, setNewItem, onAdd, adding, config }: AddItemModalProps) => {
    return (
        <AnimatePresence>
            {show && (
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
                            <button onClick={onClose} className="text-slate-500 hover:text-white">
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
                            onClick={onAdd}
                            className="w-full h-14 rounded-2xl bg-primary-600 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-primary-500/20 hover:bg-primary-500 transition-all flex items-center justify-center gap-2"
                        >
                            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 size={16} /> Save Item</>}
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
