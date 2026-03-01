import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Share2, Loader2, CheckCircle2, X, Settings, Search, ChevronDown, DollarSign } from 'lucide-react';
import { SettingItem } from './SettingItem';
import { googleApiService } from '../../services/googleApiService';
import type { SharedSettingsProps } from './types';
import type { Member } from '../../types';
import { getCurrencySymbol, getCurrencyName } from '../../utils/currency';
import { fetchAndCacheCurrencies } from '../../services/initService';

export interface CurrencyData {
    code: string;
    name: string;
    symbol: string;
    countryName: string;
    flag: string;
}

export const MembersSection = ({ config, isOwner, setDeleteConfig }: SharedSettingsProps) => {
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);

    // Member Details Modal
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [currencyInput, setCurrencyInput] = useState('');
    const [currencies, setCurrencies] = useState<CurrencyData[]>([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [updateLoading, setUpdateLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close Dropdown explicitly on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [dropdownOpen]);

    // Load available currencies when modal opens
    useEffect(() => {
        const loadCurrencies = async () => {
            if (!selectedMember) return;
            const data = await fetchAndCacheCurrencies();
            if (data) setCurrencies(data);
        };
        loadCurrencies();
    }, [selectedMember]);

    // Sync input when a member is selected
    useEffect(() => {
        if (selectedMember) {
            setCurrencyInput(selectedMember.preferredCurrency || config?.currency || '');
        }
    }, [selectedMember, config?.currency]);

    const filteredCurrencies = currencies.filter(c =>
        c.countryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleUpdateCurrency = async () => {
        if (!currencyInput.trim() || !selectedMember) return;
        setUpdateLoading(true);
        try {
            await googleApiService.updateMemberProfile(selectedMember.email, { preferredCurrency: currencyInput.trim() });
            setSelectedMember(null);
            window.location.reload();
        } catch (e: any) {
            alert(e.message || 'Failed to update preferred currency');
        } finally {
            setUpdateLoading(false);
        }
    };

    const handleInvite = async () => {
        if (!inviteEmail || !inviteName) return;
        setInviteLoading(true);
        try {
            await googleApiService.addMember(inviteEmail, inviteName, config?.currency || '');
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
                                            <span className="text-[10px] text-slate-500 font-bold tracking-widest flex items-center gap-1.5 mt-0.5">
                                                {member.email} •
                                                <span className="uppercase text-primary-400 font-black">
                                                    {member.isOwner ? (member.email === config?.currentUser?.email ? 'Owner (You)' : 'Owner') : (member.email === config?.currentUser?.email ? 'Member (You)' : 'Member')}
                                                </span>
                                                {member.preferredCurrency && member.preferredCurrency !== config?.currency && (
                                                    <>
                                                        • <span className="text-yellow-500 font-black px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20">{getCurrencySymbol(member.preferredCurrency)}</span>
                                                    </>
                                                )}
                                                {(!member.preferredCurrency || member.preferredCurrency === config?.currency) && (
                                                    <>
                                                        • <span className="text-slate-400 font-black px-1.5 py-0.5 rounded bg-slate-800/50 border border-slate-700/50">{getCurrencySymbol(config?.currency || 'INR_India')}</span>
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => setSelectedMember(member)}
                                            className="p-1.5 hover:bg-slate-700/50 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
                                        >
                                            <Settings size={16} />
                                        </button>
                                        {isOwner && member.email !== config?.currentUser?.email && (
                                            <button
                                                onClick={() => setDeleteConfig({ type: 'Member', id: member.email, name: member.email })}
                                                className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
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

            <AnimatePresence>
                {selectedMember && (
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
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-20 h-20 rounded-full shadow-lg flex items-center justify-center font-bold text-white text-3xl border-4 border-slate-700 p-1 bg-slate-800">
                                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedMember.name)}&background=${selectedMember.color.replace('#', '')}&color=fff&size=128`} className="w-full h-full rounded-full" alt="Profile" />
                                </div>
                                <h3 className="text-2xl font-black text-white tracking-tight text-center">{selectedMember.name}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">{selectedMember.email}</p>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-700/50">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 block">Preferred Currency</span>
                                    {(selectedMember.email === config?.currentUser?.email || isOwner) ? (
                                        <div className="relative" ref={dropdownRef}>
                                            <button
                                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                                className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl h-14 px-4 text-white flex items-center justify-between hover:border-primary-500/50 transition-all font-bold"
                                            >
                                                {currencyInput ? (() => {
                                                    const selected = currencies.find(c => `${c.code}_${c.countryName}` === currencyInput) || currencies.find(c => c.code === currencyInput);
                                                    return selected ? (
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <img src={selected.flag} alt="flag" className="w-5 h-3.5 object-cover rounded-sm shadow-sm shrink-0" />
                                                            <span className="text-sm font-bold truncate">{selected.countryName} ({selected.symbol}) {selected.code}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm">{currencyInput}</span>
                                                    )
                                                })() : (
                                                    <span className="text-slate-500 flex items-center gap-2"><DollarSign size={16} /> Select Currency</span>
                                                )}
                                                <ChevronDown size={18} className="text-slate-500" />
                                            </button>

                                            <AnimatePresence>
                                                {dropdownOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        className="absolute top-full left-0 w-full mt-2 bg-slate-900 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl z-20 flex flex-col"
                                                    >
                                                        <div className="p-2 border-b border-slate-800">
                                                            <div className="relative">
                                                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                                                <input
                                                                    autoFocus
                                                                    type="text"
                                                                    placeholder="Search country..."
                                                                    value={searchQuery}
                                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                                    className="w-full bg-slate-800 rounded-xl h-10 pl-9 pr-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="max-h-52 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                                            {filteredCurrencies.map((c, i) => (
                                                                <button
                                                                    key={`${c.code}-${i}`}
                                                                    onClick={() => {
                                                                        setCurrencyInput(`${c.code}_${c.countryName}`);
                                                                        setDropdownOpen(false);
                                                                        setSearchQuery('');
                                                                    }}
                                                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 transition-colors text-left ${currencyInput === `${c.code}_${c.countryName}` || currencyInput === c.code ? 'bg-primary-500/10 text-primary-400' : 'text-slate-300'}`}
                                                                >
                                                                    <img src={c.flag} alt="flag" className="w-5 h-3.5 object-cover rounded-sm shadow-sm shrink-0" />
                                                                    <span className="text-xs font-bold truncate leading-none flex-1">{c.countryName} ({c.symbol}) {c.code}</span>
                                                                </button>
                                                            ))}
                                                            {filteredCurrencies.length === 0 && (
                                                                <div className="text-center py-4 text-xs text-slate-500">No results found</div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ) : (
                                        <div className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl h-14 px-4 text-slate-300 flex items-center font-bold">
                                            {(() => {
                                                const lookup = selectedMember.preferredCurrency || config?.currency || '';
                                                const found = currencies.find(c => `${c.code}_${c.countryName}` === lookup) || currencies.find(c => c.code === lookup);
                                                return found ? `${found.countryName} (${found.symbol}) ${found.code}` : `${getCurrencySymbol(lookup)} - ${getCurrencyName(lookup)}`;
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSelectedMember(null)}
                                    className="flex-1 h-14 rounded-2xl bg-slate-800 text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-700 transition-all"
                                >
                                    Close
                                </button>
                                {(selectedMember.email === config?.currentUser?.email || isOwner) && (
                                    <button
                                        disabled={!currencyInput || updateLoading}
                                        onClick={handleUpdateCurrency}
                                        className="flex-1 h-14 rounded-2xl bg-primary-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary-500/20 hover:bg-primary-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {updateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 size={16} /> Save</>}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section >
    );
};
