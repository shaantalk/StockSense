import { useState } from 'react';
import { LogOut, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { googleApiService } from '../../services/googleApiService';
import type { UserConfig } from '../../types';

import { ProfileSection } from './ProfileSection';
import { HouseholdSection } from './HouseholdSection';
import { MembersSection } from './MembersSection';
import { SystemSection } from './SystemSection';
import type { DeleteConfig } from './types';

interface SettingsProps {
    config: UserConfig | null;
    onSignOut: () => void;
}

export default function Settings({ config, onSignOut }: SettingsProps) {
    const activeHouseholdId = localStorage.getItem('activeHouseholdId');
    const activeHousehold = config?.households.find(h => h.id === activeHouseholdId);
    const isOwner = activeHousehold?.role === 'Owner';

    const [deleteConfig, setDeleteConfig] = useState<DeleteConfig | null>(null);
    const [deleting, setDeleting] = useState(false);

    const confirmDelete = async () => {
        if (!deleteConfig) return;
        setDeleting(true);
        try {
            switch (deleteConfig.type) {
                case 'Category':
                    await googleApiService.removeCategory(deleteConfig.id);
                    break;
                case 'Shop':
                    await googleApiService.removeShop(deleteConfig.id);
                    break;
                case 'Unit':
                    await googleApiService.removeUnit(deleteConfig.id);
                    break;
                case 'Status':
                    await googleApiService.removeStatus(deleteConfig.id);
                    break;
                case 'Member':
                    await googleApiService.removeMember(deleteConfig.id);
                    break;
            }
            window.location.reload();
        } catch (e: any) {
            alert(e.message || `Failed to remove ${deleteConfig.type.toLowerCase()}`);
        } finally {
            setDeleting(false);
            setDeleteConfig(null);
        }
    };

    const sharedProps = { config, isOwner, setDeleteConfig };

    return (
        <div className="space-y-6 pb-24 max-w-lg mx-auto w-full pt-6">
            <ProfileSection config={config} />
            <HouseholdSection {...sharedProps} />
            <MembersSection {...sharedProps} />
            <SystemSection />

            <button
                onClick={onSignOut}
                className="w-full h-16 rounded-3xl glass text-red-400 font-bold uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-3 border-red-500/10 hover:bg-red-500/5 transition-all active:scale-95"
            >
                <LogOut size={18} />
                Sign Out Securely
            </button>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteConfig && (
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
                            className="w-full max-w-sm glass p-8 rounded-[2.5rem] border-red-500/30 space-y-6"
                        >
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 rounded-3xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-2">
                                    <X size={32} />
                                </div>
                                <h3 className="text-2xl font-black text-white tracking-tight">Remove {deleteConfig.type}?</h3>
                                <p className="text-sm text-slate-300 font-medium">
                                    Are you sure you want to remove <span className="text-white font-bold">{deleteConfig.name}</span>?
                                    {deleteConfig.type === 'Category' || deleteConfig.type === 'Shop' || deleteConfig.type === 'Unit' || deleteConfig.type === 'Status' ? " Items referring to this will still keep the text value, but it won't appear in dropdowns." : " They will lose access to the current household."}
                                </p>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setDeleteConfig(null)}
                                    disabled={deleting}
                                    className="flex-1 h-14 rounded-2xl bg-slate-800 text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-700 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={deleting}
                                    className="flex-1 h-14 rounded-2xl bg-red-500/10 text-red-500 font-black uppercase tracking-widest text-[10px] hover:bg-red-500 hover:text-white border border-red-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
