import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Share2, Loader2, CheckCircle2, X } from 'lucide-react';
import { SettingItem } from './SettingItem';
import { googleApiService } from '../../services/googleApiService';
import type { SharedSettingsProps } from './types';

export const MembersSection = ({ config, isOwner, setDeleteConfig }: SharedSettingsProps) => {
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);

    const handleInvite = async () => {
        if (!inviteEmail || !inviteName) return;
        setInviteLoading(true);
        try {
            await googleApiService.addMember(inviteEmail, inviteName);
            setShowInviteModal(false);
            setInviteEmail('');
            setInviteName('');
            window.location.reload();
        } catch (e: any) {
            alert(e.message || 'Failed to invite member');
        } finally {
            setInviteLoading(false);
        }
    };

    return (
        <section className="space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-4">Household Circle</h2>
            <div className="grid gap-3">
                <div className="glass p-5 rounded-3xl border-slate-700/50 space-y-4">
                    <div className="flex items-center gap-3 text-primary-400 px-1">
                        <Users size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">Active Members</span>
                    </div>
                    <div className="flex flex-col gap-2">
                        {(() => {
                            const sortedMembers = config?.members ? [...config.members].sort((a, b) => {
                                if (a.email === config?.currentUser?.email) return -1;
                                if (b.email === config?.currentUser?.email) return 1;
                                return 0;
                            }) : [];

                            return sortedMembers.map((member, index) => (
                                <div key={member.email} className={`flex items-center justify-between bg-slate-800/50 border border-slate-700 pl-2 pr-2 py-2 rounded-xl group/member ${index === 0 ? 'ring-1 ring-primary-500/50 bg-primary-500/5' : ''}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full shadow-lg flex items-center justify-center font-bold text-white text-lg border-2 border-slate-700" style={{ backgroundColor: member.color, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                            {member.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-200">{member.name}</span>
                                            <span className="text-[10px] text-slate-500 font-bold tracking-widest">{member.email} • <span className="uppercase text-primary-400 font-black">{index === 0 ? 'Owner (You)' : 'Member'}</span></span>
                                        </div>
                                    </div>
                                    {isOwner && member.email !== config?.currentUser?.email && (
                                        <button
                                            onClick={() => setDeleteConfig({ type: 'Member', id: member.email, name: member.email })}
                                            className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            ));
                        })()}
                    </div>
                </div>

                {isOwner && (
                    <SettingItem
                        icon={Share2}
                        label="Invite to Household"
                        color="bg-accent-500/20 text-accent-400"
                        onClick={() => setShowInviteModal(true)}
                        delay={0.2}
                    />
                )}
            </div>

            <AnimatePresence>
                {/* Invite Modal */}
                {showInviteModal && (
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
                                <div className="w-16 h-16 rounded-3xl bg-primary-500/10 text-primary-400 flex items-center justify-center mx-auto mb-4">
                                    <Share2 size={32} />
                                </div>
                                <h3 className="text-xl font-black text-white tracking-tight">Invite Member</h3>
                                <p className="text-xs text-slate-400 font-medium">Add a new member to this household.</p>
                            </div>

                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Display Name"
                                    value={inviteName}
                                    onChange={(e) => setInviteName(e.target.value)}
                                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl h-14 px-6 text-white focus:outline-none focus:border-primary-500 transition-all text-sm font-bold"
                                />
                                <input
                                    type="email"
                                    placeholder="google-user@gmail.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl h-14 px-6 text-white focus:outline-none focus:border-primary-500 transition-all text-sm font-bold"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowInviteModal(false)}
                                    className="flex-1 h-14 rounded-2xl bg-slate-800 text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-700 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={!inviteEmail || !inviteName || inviteLoading}
                                    onClick={handleInvite}
                                    className="flex-1 h-14 rounded-2xl bg-primary-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary-500/20 hover:bg-primary-500 transition-all flex items-center justify-center gap-2"
                                >
                                    {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 size={16} /> Send</>}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};
