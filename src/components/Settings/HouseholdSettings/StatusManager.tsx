import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Plus, X, Loader2, CheckCircle2 } from 'lucide-react';
import { googleApiService } from '../../../services/googleApiService';
import type { SharedSettingsProps } from '../types';

export const StatusManager = ({ config, setDeleteConfig }: Pick<SharedSettingsProps, 'config' | 'setDeleteConfig'>) => {
    const DEFAULT_STATUSES = ['Stocked', 'Expired', 'Low', 'Out of stock', 'Use now'];
    const [showModal, setShowModal] = useState(false);
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
    const [loading, setLoading] = useState(false);

    const handleAdd = async () => {
        if (!newName.trim()) return;
        setLoading(true);
        try {
            await googleApiService.addStatus(newName.trim(), newColor);
            setNewName('');
            setNewColor('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
            window.location.reload();
        } catch (e: any) {
            alert(e.message || 'Failed to add status');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass p-5 rounded-3xl border-slate-700/50 space-y-4">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3 text-blue-400">
                    <Activity size={18} />
                    <span className="text-xs font-black uppercase tracking-widest">Statuses</span>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {config?.statuses.map(status => (
                    <div key={status.name} className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 pl-3 pr-1 py-1.5 rounded-xl group/status w-fit">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full border border-slate-700" style={{ backgroundColor: status.color }} />
                            <span className="text-xs font-bold text-slate-300 tracking-wider">{status.name}</span>
                        </div>
                        {!DEFAULT_STATUSES.includes(status.name) && (
                            <button
                                onClick={() => setDeleteConfig({ type: 'Status', id: status.name, name: status.name })}
                                className="p-1 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <button onClick={() => setShowModal(true)} className="w-full py-3 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:text-primary-400 hover:border-primary-500/50 hover:bg-primary-500/5 transition-all text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2">
                <Plus size={14} /> Add New Status
            </button>

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
                                <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-4">
                                    <Activity size={32} />
                                </div>
                                <h3 className="text-xl font-black text-white tracking-tight">Add Status</h3>
                                <p className="text-xs text-slate-400 font-medium">Add a new item status level.</p>
                            </div>

                            <div className="flex gap-4 items-center">
                                <div className="relative">
                                    <input
                                        type="color"
                                        value={newColor}
                                        onChange={(e) => setNewColor(e.target.value)}
                                        className="w-14 h-14 rounded-2xl bg-slate-900 border-2 border-slate-800 p-1 cursor-pointer absolute opacity-0 z-10"
                                        title="Choose Status Color"
                                    />
                                    <div className="w-14 h-14 rounded-2xl border-2 border-slate-700 shadow-inner flex items-center justify-center pointer-events-none" style={{ backgroundColor: newColor }} />
                                </div>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Status Name"
                                    className="flex-1 bg-slate-900 border-2 border-slate-800 rounded-2xl h-14 px-4 text-white focus:outline-none focus:border-primary-500 transition-all text-sm font-bold w-full"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 h-14 rounded-2xl bg-slate-800 text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-700 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={!newName.trim() || loading}
                                    onClick={handleAdd}
                                    className="flex-1 h-14 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 size={16} /> Save</>}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
