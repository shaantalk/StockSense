import { useState } from 'react';
import { UserPlus, Shield, HelpCircle, Share2, LogOut, ChevronRight, Users, Loader2, Home, CheckCircle2, X, Store, DollarSign, Plus, Tags, Scale, Activity } from 'lucide-react';
import { googleApiService } from '../services/googleApiService';
import type { UserConfig } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsProps {
    config: UserConfig | null;
    onSignOut: () => void;
}

const Settings = ({ config, onSignOut }: SettingsProps) => {
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);

    const [newShop, setNewShop] = useState('');
    const [newShopColor, setNewShopColor] = useState('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
    const [addingShop, setAddingShop] = useState(false);

    const [newCategory, setNewCategory] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
    const [addingCategory, setAddingCategory] = useState(false);

    const [newUnit, setNewUnit] = useState('');
    const [addingUnit, setAddingUnit] = useState(false);

    const [newStatus, setNewStatus] = useState('');
    const [newStatusColor, setNewStatusColor] = useState('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
    const [addingStatus, setAddingStatus] = useState(false);

    const [showCurrencyModal, setShowCurrencyModal] = useState(false);
    const [currencyInput, setCurrencyInput] = useState(config?.currency || '₹');
    const [currencyLoading, setCurrencyLoading] = useState(false);

    const activeHouseholdId = localStorage.getItem('activeHouseholdId');
    const activeHousehold = config?.households.find(h => h.id === activeHouseholdId);
    const isOwner = activeHousehold?.role === 'Owner';

    const handleSwitchHousehold = (id: string) => {
        localStorage.setItem('activeHouseholdId', id);
        window.location.reload();
    };

    const handleInvite = async () => {
        if (!inviteEmail) return;
        setInviteLoading(true);
        try {
            await googleApiService.addMember(inviteEmail);
            setShowInviteModal(false);
            setInviteEmail('');
            alert('Member added and shared successfully!');
            window.location.reload();
        } catch (e: any) {
            alert(e.message || 'Failed to add member');
        } finally {
            setInviteLoading(false);
        }
    };

    const handleRemoveMember = async (email: string) => {
        if (!confirm(`Are you sure you want to remove ${email}?`)) return;
        try {
            await googleApiService.removeMember(email);
            window.location.reload();
        } catch (e: any) {
            alert(e.message || 'Failed to remove member');
        }
    };

    const handleAddShop = async () => {
        if (!newShop.trim()) return;
        setAddingShop(true);
        try {
            await googleApiService.addShop(newShop.trim(), newShopColor);
            setNewShop('');
            setNewShopColor('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
            window.location.reload();
        } catch (e: any) {
            alert(e.message || 'Failed to add shop');
        } finally {
            setAddingShop(false);
        }
    };

    const handleRemoveShop = async (shop: string) => {
        if (!confirm(`Remove shop ${shop}?`)) return;
        try {
            await googleApiService.removeShop(shop);
            window.location.reload();
        } catch (e: any) {
            alert(e.message || 'Failed to remove shop');
        }
    };

    const handleAddCategory = async () => {
        if (!newCategory.trim()) return;
        setAddingCategory(true);
        try {
            await googleApiService.addCategory(newCategory.trim(), newCategoryColor);
            setNewCategory('');
            setNewCategoryColor('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
            window.location.reload();
        } catch (e: any) {
            alert(e.message || 'Failed to add category');
        } finally {
            setAddingCategory(false);
        }
    };

    const handleRemoveCategory = async (catName: string) => {
        if (!confirm(`Remove category ${catName}? Items referring to this will still keep the text value.`)) return;
        try {
            await googleApiService.removeCategory(catName);
            window.location.reload();
        } catch (e: any) {
            alert(e.message || 'Failed to remove category');
        }
    };

    const handleAddUnit = async () => {
        if (!newUnit.trim()) return;
        setAddingUnit(true);
        try {
            await googleApiService.addUnit(newUnit.trim());
            setNewUnit('');
            window.location.reload();
        } catch (e: any) {
            alert(e.message || 'Failed to add unit');
        } finally {
            setAddingUnit(false);
        }
    };

    const handleRemoveUnit = async (unit: string) => {
        if (!confirm(`Remove unit ${unit}?`)) return;
        try {
            await googleApiService.removeUnit(unit);
            window.location.reload();
        } catch (e: any) {
            alert(e.message || 'Failed to remove unit');
        }
    };

    const handleAddStatus = async () => {
        if (!newStatus.trim()) return;
        setAddingStatus(true);
        try {
            await googleApiService.addStatus(newStatus.trim(), newStatusColor);
            setNewStatus('');
            setNewStatusColor('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
            window.location.reload();
        } catch (e: any) {
            alert(e.message || 'Failed to add status');
        } finally {
            setAddingStatus(false);
        }
    };

    const handleRemoveStatus = async (status: string) => {
        if (!confirm(`Remove status ${status}?`)) return;
        try {
            await googleApiService.removeStatus(status);
            window.location.reload();
        } catch (e: any) {
            alert(e.message || 'Failed to remove status');
        }
    };

    const handleUpdateCurrency = async () => {
        if (!currencyInput.trim()) return;
        setCurrencyLoading(true);
        try {
            await googleApiService.updateCurrency(currencyInput.trim());
            setShowCurrencyModal(false);
            window.location.reload();
        } catch (e: any) {
            alert(e.message || 'Failed to update currency');
        } finally {
            setCurrencyLoading(false);
        }
    };

    const SettingItem = ({ icon: Icon, label, value, color, onClick, delay }: any) => (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay }}
            onClick={onClick}
            className="glass p-5 rounded-3xl flex items-center justify-between group cursor-pointer hover:border-slate-600 transition-all border-slate-700/50"
        >
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} shadow-inner`}>
                    <Icon size={20} />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-white uppercase tracking-wider">{label}</span>
                    {value && <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">{value}</span>}
                </div>
            </div>
            <ChevronRight size={18} className="text-slate-700 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
        </motion.div>
    );

    return (
        <div className="space-y-10 pb-32 animate-fade-in relative">
            {/* Profile Section */}
            <section className="relative px-2">
                <div className="absolute inset-0 bg-primary-600/5 blur-3xl rounded-full" />
                <div className="relative glass p-6 rounded-[2.5rem] border-slate-700/50 flex flex-col items-center gap-4 overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl" />
                    <div className="w-24 h-24 rounded-full border-4 border-slate-800 p-1 shadow-2xl">
                        <img
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(config?.currentUser?.name || 'U')}&background=0ea5e9&color=fff&size=128`}
                            alt="Profile"
                            className="w-full h-full rounded-full shadow-inner"
                        />
                    </div>
                    <div className="text-center space-y-1">
                        <h2 className="text-2xl font-black text-white tracking-tight">{config?.currentUser?.name}</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">{config?.currentUser?.email}</p>
                    </div>
                </div>
            </section>

            {/* Household Switcher */}
            <section className="space-y-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-4">Switch Household</h2>
                <div className="grid gap-3">
                    {config?.households.map((household) => (
                        <div
                            key={household.id}
                            onClick={() => handleSwitchHousehold(household.id)}
                            className={`glass p-5 rounded-3xl flex items-center justify-between group cursor-pointer transition-all border-2 ${activeHouseholdId === household.id ? 'border-primary-500/50 bg-primary-500/5' : 'border-slate-700/50'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${activeHouseholdId === household.id ? 'bg-primary-500/20 text-primary-400' : 'bg-slate-800 text-slate-400'}`}>
                                    <Home size={20} />
                                </div>
                                <div className="flex flex-col">
                                    <span className={`text-sm font-bold uppercase tracking-wider ${activeHouseholdId === household.id ? 'text-white' : 'text-slate-400'}`}>{household.name}</span>
                                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">{household.role}</span>
                                </div>
                            </div>
                            {activeHouseholdId === household.id && (
                                <div className="w-2 h-2 rounded-full bg-primary-500 shadow-lg shadow-primary-500/50 animate-pulse" />
                            )}
                        </div>
                    ))}
                    <button
                        onClick={() => window.location.hash = '/onboarding'}
                        className="w-full p-5 rounded-3xl border-2 border-dashed border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-400 flex items-center justify-center gap-2 transition-all font-bold text-xs uppercase tracking-widest"
                    >
                        <UserPlus size={16} />
                        Add or Join New Household
                    </button>
                </div>
            </section>

            {/* Household Config */}
            {isOwner && (
                <section className="space-y-4">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-4">Configuration</h2>
                    <div className="grid gap-4">
                        <SettingItem
                            icon={DollarSign}
                            label="Currency"
                            value={config?.currency || 'Not Set'}
                            color="bg-yellow-500/20 text-yellow-500"
                            onClick={() => setShowCurrencyModal(true)}
                            delay={0.1}
                        />

                        {/* Categories Manager */}
                        <div className="glass p-5 rounded-3xl border-slate-700/50 space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-3 text-emerald-400">
                                    <Tags size={18} />
                                    <span className="text-xs font-black uppercase tracking-widest">Categories</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {config?.categories.map(cat => (
                                    <div key={cat.name} className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 pl-2 pr-2 py-1 rounded-full group/cat">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{cat.name}</span>
                                        <button
                                            onClick={() => handleRemoveCategory(cat.name)}
                                            className="p-1 hover:bg-red-500/20 rounded-full text-slate-500 hover:text-red-400 transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={newCategoryColor}
                                    onChange={(e) => setNewCategoryColor(e.target.value)}
                                    className="w-10 h-10 rounded-xl bg-slate-900 border-2 border-slate-800 p-0.5 cursor-pointer flex-shrink-0"
                                    title="Choose Category Color"
                                />
                                <input
                                    type="text"
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    placeholder="New category..."
                                    className="flex-1 bg-slate-900 border-2 border-slate-800 rounded-xl h-10 px-4 text-white focus:outline-none focus:border-primary-500 transition-all text-xs font-bold w-full"
                                />
                                <button
                                    disabled={!newCategory.trim() || addingCategory}
                                    onClick={handleAddCategory}
                                    className="h-10 px-4 rounded-xl bg-slate-800 text-white font-bold text-xs uppercase hover:bg-slate-700 transition-all disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
                                >
                                    {addingCategory ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                    Add
                                </button>
                            </div>
                        </div>

                        {/* Shops Manager */}
                        <div className="glass p-5 rounded-3xl border-slate-700/50 space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-3 text-orange-400">
                                    <Store size={18} />
                                    <span className="text-xs font-black uppercase tracking-widest">Shops</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {config?.shops.map(shop => (
                                    <div key={shop.name} className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 pl-2 pr-2 py-1 rounded-full group/shop">
                                        <div className="w-3 h-3 rounded-full border border-slate-700" style={{ backgroundColor: shop.color }} />
                                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{shop.name}</span>
                                        <button
                                            onClick={() => handleRemoveShop(shop.name)}
                                            className="p-1 hover:bg-red-500/20 rounded-full text-slate-500 hover:text-red-400 transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={newShopColor}
                                    onChange={(e) => setNewShopColor(e.target.value)}
                                    className="w-10 h-10 rounded-xl bg-slate-900 border-2 border-slate-800 p-0.5 cursor-pointer flex-shrink-0"
                                    title="Choose Shop Color"
                                />
                                <input
                                    type="text"
                                    value={newShop}
                                    onChange={(e) => setNewShop(e.target.value)}
                                    placeholder="Add new shop..."
                                    className="flex-1 bg-slate-900 border-2 border-slate-800 rounded-xl h-10 px-4 text-white focus:outline-none focus:border-primary-500 transition-all text-xs font-bold min-w-0"
                                />
                                <button
                                    disabled={!newShop.trim() || addingShop}
                                    onClick={handleAddShop}
                                    className="h-10 px-4 rounded-xl bg-slate-800 text-white font-bold text-xs uppercase hover:bg-slate-700 transition-all disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
                                >
                                    {addingShop ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                    Add
                                </button>
                            </div>
                        </div>

                        {/* Units Manager */}
                        <div className="glass p-5 rounded-3xl border-slate-700/50 space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-3 text-purple-400">
                                    <Scale size={18} />
                                    <span className="text-xs font-black uppercase tracking-widest">Units</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {config?.units.map(unit => (
                                    <div key={unit} className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 pl-3 pr-2 py-1 rounded-full group/unit">
                                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{unit}</span>
                                        <button
                                            onClick={() => handleRemoveUnit(unit)}
                                            className="p-1 hover:bg-red-500/20 rounded-full text-slate-500 hover:text-red-400 transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newUnit}
                                    onChange={(e) => setNewUnit(e.target.value)}
                                    placeholder="Add new unit (e.g. Boxes)..."
                                    className="flex-1 bg-slate-900 border-2 border-slate-800 rounded-xl h-10 px-4 text-white focus:outline-none focus:border-primary-500 transition-all text-xs font-bold min-w-0"
                                />
                                <button
                                    disabled={!newUnit.trim() || addingUnit}
                                    onClick={handleAddUnit}
                                    className="h-10 px-4 rounded-xl bg-slate-800 text-white font-bold text-xs uppercase hover:bg-slate-700 transition-all disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
                                >
                                    {addingUnit ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                    Add
                                </button>
                            </div>
                        </div>

                        {/* Statuses Manager */}
                        <div className="glass p-5 rounded-3xl border-slate-700/50 space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-3 text-blue-400">
                                    <Activity size={18} />
                                    <span className="text-xs font-black uppercase tracking-widest">Statuses</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {config?.statuses.map(status => (
                                    <div key={status.name} className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 pl-2 pr-2 py-1 rounded-full group/status">
                                        <div className="w-3 h-3 rounded-full border border-slate-700" style={{ backgroundColor: status.color }} />
                                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{status.name}</span>
                                        <button
                                            onClick={() => handleRemoveStatus(status.name)}
                                            className="p-1 hover:bg-red-500/20 rounded-full text-slate-500 hover:text-red-400 transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={newStatusColor}
                                    onChange={(e) => setNewStatusColor(e.target.value)}
                                    className="w-10 h-10 rounded-xl bg-slate-900 border-2 border-slate-800 p-0.5 cursor-pointer flex-shrink-0"
                                    title="Choose Status Color"
                                />
                                <input
                                    type="text"
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    placeholder="Add new status..."
                                    className="flex-1 bg-slate-900 border-2 border-slate-800 rounded-xl h-10 px-4 text-white focus:outline-none focus:border-primary-500 transition-all text-xs font-bold min-w-0"
                                />
                                <button
                                    disabled={!newStatus.trim() || addingStatus}
                                    onClick={handleAddStatus}
                                    className="h-10 px-4 rounded-xl bg-slate-800 text-white font-bold text-xs uppercase hover:bg-slate-700 transition-all disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
                                >
                                    {addingStatus ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            <section className="space-y-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-4">Household Circle</h2>
                <div className="grid gap-3">
                    <div className="glass p-5 rounded-3xl border-slate-700/50 space-y-4">
                        <div className="flex items-center gap-3 text-primary-400 px-1">
                            <Users size={18} />
                            <span className="text-xs font-black uppercase tracking-widest">Active Members</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {config?.members.map(member => (
                                <div key={member.email} className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 pl-1 pr-3 py-1 rounded-full group/member">
                                    <img
                                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.email)}&background=${member.color.substring(1)}&color=fff&size=64`}
                                        alt={member.email}
                                        className="w-6 h-6 rounded-full"
                                    />
                                    <span className="text-[10px] font-bold text-slate-300">{member.email.split('@')[0]}</span>
                                    {isOwner && member.email !== config?.currentUser?.email && (
                                        <button
                                            onClick={() => handleRemoveMember(member.email)}
                                            className="p-0.5 hover:bg-red-500/20 rounded-full text-slate-500 hover:text-red-400 transition-colors"
                                        >
                                            <X size={10} />
                                        </button>
                                    )}
                                </div>
                            ))}
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
            </section>

            <section className="space-y-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-4">System</h2>
                <div className="space-y-3">
                    <SettingItem
                        icon={Shield}
                        label="Privacy & Data"
                        color="bg-slate-800 text-slate-400"
                        delay={0.5}
                    />
                    <SettingItem
                        icon={HelpCircle}
                        label="StockSense Intel"
                        color="bg-slate-800 text-slate-400"
                        delay={0.6}
                    />
                </div>
            </section>

            <button
                onClick={onSignOut}
                className="w-full h-16 rounded-3xl glass text-red-400 font-bold uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-3 border-red-500/10 hover:bg-red-500/5 transition-all active:scale-95"
            >
                <LogOut size={18} />
                Sign Out Securely
            </button>

            {/* Invite Modal */}
            <AnimatePresence>
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
                                <p className="text-xs text-slate-400 font-medium">Enter their Google email to grant access to this household's sheet.</p>
                            </div>

                            <input
                                type="email"
                                placeholder="google-user@gmail.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl h-14 px-6 text-white focus:outline-none focus:border-primary-500 transition-all text-sm font-bold"
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowInviteModal(false)}
                                    className="flex-1 h-14 rounded-2xl bg-slate-800 text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-700 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={!inviteEmail || inviteLoading}
                                    onClick={handleInvite}
                                    className="flex-1 h-14 rounded-2xl bg-primary-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary-500/20 hover:bg-primary-500 transition-all flex items-center justify-center gap-2"
                                >
                                    {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 size={16} /> Send</>}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {showCurrencyModal && (
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
                                <div className="w-16 h-16 rounded-3xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center mx-auto mb-4">
                                    <DollarSign size={32} />
                                </div>
                                <h3 className="text-xl font-black text-white tracking-tight">Set Currency</h3>
                                <p className="text-xs text-slate-400 font-medium">Select your household's currency.</p>
                            </div>

                            <select
                                value={currencyInput}
                                onChange={(e) => setCurrencyInput(e.target.value)}
                                className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl h-14 px-6 text-white focus:outline-none focus:border-primary-500 transition-all text-xl font-bold text-center appearance-none cursor-pointer"
                            >
                                <option value="₹">₹ - Indian Rupee (INR)</option>
                                <option value="$">$ - US Dollar (USD)</option>
                                <option value="€">€ - Euro (EUR)</option>
                                <option value="£">£ - British Pound (GBP)</option>
                                <option value="¥">¥ - Japanese Yen (JPY)</option>
                                <option value="A$">A$ - Australian Dollar (AUD)</option>
                                <option value="C$">C$ - Canadian Dollar (CAD)</option>
                                <option value="CHF">CHF - Swiss Franc</option>
                                <option value="¥">¥ - Chinese Yuan (CNY)</option>
                                <option value="kr">kr - Swedish Krona (SEK)</option>
                                <option value="NZ$">NZ$ - New Zealand Dollar (NZD)</option>
                                <option value="₩">₩ - South Korean Won (KRW)</option>
                                <option value="S$">S$ - Singapore Dollar (SGD)</option>
                                <option value="kr">kr - Norwegian Krone (NOK)</option>
                                <option value="Mex$">Mex$ - Mexican Peso (MXN)</option>
                                <option value="kr">kr - Danish Krone (DKK)</option>
                                <option value="R">R - South African Rand (ZAR)</option>
                                <option value="R$">R$ - Brazilian Real (BRL)</option>
                                <option value="NT$">NT$ - New Taiwan Dollar (TWD)</option>
                                <option value="د.إ">د.إ - UAE Dirham (AED)</option>
                            </select>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowCurrencyModal(false)}
                                    className="flex-1 h-14 rounded-2xl bg-slate-800 text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-700 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={!currencyInput || currencyLoading}
                                    onClick={handleUpdateCurrency}
                                    className="flex-1 h-14 rounded-2xl bg-primary-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary-500/20 hover:bg-primary-500 transition-all flex items-center justify-center gap-2"
                                >
                                    {currencyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 size={16} /> Save</>}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Settings;
