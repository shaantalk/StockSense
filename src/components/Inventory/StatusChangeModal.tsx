import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2 } from 'lucide-react';
import type { InventoryItem, UserConfig } from '../../types';

interface StatusChangeModalProps {
    item: InventoryItem | null;
    onClose: () => void;
    onChangeStatus: (newStatus: string) => void;
    config: UserConfig | null;
}

export const StatusChangeModal = ({ item, onClose, onChangeStatus, config }: StatusChangeModalProps) => {
    return (
        <AnimatePresence>
            {item && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0f172a]/90 backdrop-blur-sm"
                    onClick={onClose}
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
                            <button onClick={onClose} className="text-slate-500 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <p className="text-sm font-bold text-slate-300">Set status for <span className="text-white">{item.itemName}</span></p>

                        <div className="flex flex-col gap-2">
                            {config?.statuses?.map(s => (
                                <button
                                    key={s.name}
                                    onClick={() => onChangeStatus(s.name)}
                                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-700/50 hover:bg-slate-800/50 transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                                        <span className="font-bold text-slate-200 group-hover:text-white transition-colors">{s.name}</span>
                                    </div>
                                    {item.status === s.name && <CheckCircle2 size={18} className="text-primary-500" />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
