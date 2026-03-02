import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, CreditCard, Wallet, Plus, RefreshCw, Loader2 } from 'lucide-react';
import { useGoals, useOneTimeExpenses, useRecurringExpenses, useEMIPayments, useLogEmiPayment } from '../hooks/useFinancials';
import type { UserConfig } from '../types';

export default function Financials({ config }: { config: UserConfig | null }) {
    const activeHouseholdId = config?.activeHouseholdId;
    const [activeTab, setActiveTab] = useState<'GOALS' | 'EXPENSES' | 'EMIS'>('GOALS');

    const { data: goals, isLoading: gLoad } = useGoals(activeHouseholdId);
    const { data: otExpenses, isLoading: otLoad } = useOneTimeExpenses(activeHouseholdId);
    const { data: recExpenses, isLoading: recLoad } = useRecurringExpenses(activeHouseholdId);
    const { data: emiPayments, isLoading: emiLoad } = useEMIPayments(activeHouseholdId);

    const isLoading = gLoad || otLoad || recLoad || emiLoad;

    const payMutate = useLogEmiPayment();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24">
            <header>
                <h1 className="text-3xl font-black text-white tracking-tight">Financials</h1>
                <p className="text-slate-400 text-sm mt-1">Track goals, expenses, and EMIs</p>
            </header>

            {/* Tabs */}
            <div className="flex space-x-2 bg-slate-800/50 p-1.5 rounded-2xl border border-white/5">
                {['GOALS', 'EXPENSES', 'EMIS'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${activeTab === tab
                            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                            : 'text-slate-400 hover:bg-white/5'
                            }`}
                    >
                        {tab === 'GOALS' && <Target size={16} />}
                        {tab === 'EXPENSES' && <Wallet size={16} />}
                        {tab === 'EMIS' && <CreditCard size={16} />}
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="mt-6">
                <AnimatePresence mode="wait">
                    {activeTab === 'GOALS' && (
                        <motion.div key="goals" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-white">Your Goals</h2>
                                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500/20 text-primary-400 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-primary-500 hover:text-white transition-all">
                                    <Plus size={14} /> Add
                                </button>
                            </div>
                            {goals?.length === 0 ? (
                                <div className="p-8 border-2 border-dashed border-slate-700 rounded-3xl text-center">
                                    <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-400 text-sm">No active goals found.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {goals?.map(goal => {
                                        const relatedExpenses = otExpenses?.filter(e => e.goalId === goal.goalId) || [];
                                        const totalSpent = relatedExpenses.reduce((sum, e) => sum + e.amount, 0);
                                        const progress = goal.targetAmount > 0 ? (totalSpent / goal.targetAmount) * 100 : 0;

                                        return (
                                            <div key={goal.goalId} className="glass p-5 rounded-3xl border border-white/5 relative overflow-hidden group">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="font-bold text-white text-lg">{goal.goalName}</h3>
                                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${goal.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                            {goal.status}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-slate-400 font-medium">Target</p>
                                                        <p className="font-black text-white">{config?.currency} {goal.targetAmount.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-xs font-medium">
                                                        <span className="text-slate-400">Spent: {config?.currency} {totalSpent.toLocaleString()}</span>
                                                        <span className="text-primary-400">{progress.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-primary-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(progress, 100)}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'EXPENSES' && (
                        <motion.div key="expenses" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-white">One-Time Expenses</h2>
                                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500/20 text-primary-400 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-primary-500 hover:text-white transition-all">
                                    <Plus size={14} /> Add
                                </button>
                            </div>
                            {otExpenses?.length === 0 ? (
                                <div className="p-8 border-2 border-dashed border-slate-700 rounded-3xl text-center">
                                    <Wallet className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-400 text-sm">No expenses logged yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {otExpenses?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
                                        <div key={exp.expenseId} className="glass p-4 rounded-2xl flex items-center justify-between border border-white/5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                                                    <Wallet size={18} className="text-red-400" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-sm">{exp.category}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">{new Date(exp.date).toLocaleDateString()} • By {config?.members.find(m => m.email === exp.spender)?.name || 'Unknown'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-red-400">-{config?.currency} {exp.amount.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'EMIS' && (
                        <motion.div key="emis" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-white">Recurring / EMIs</h2>
                                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500/20 text-primary-400 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-primary-500 hover:text-white transition-all">
                                    <Plus size={14} /> Add
                                </button>
                            </div>
                            {recExpenses?.length === 0 ? (
                                <div className="p-8 border-2 border-dashed border-slate-700 rounded-3xl text-center">
                                    <RefreshCw className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-400 text-sm">No active EMIs or Subscriptions.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {recExpenses?.map(emi => {
                                        const payments = emiPayments?.filter(p => p.emiId === emi.emiId) || [];
                                        const paidAmount = payments.reduce((sum, p) => sum + p.amountPaid, 0);

                                        return (
                                            <div key={emi.emiId} className="glass p-5 rounded-3xl border border-white/5 relative overflow-hidden group">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="font-bold text-white text-lg">{emi.expenseName}</h3>
                                                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border border-white/10 text-slate-300 rounded-full">
                                                            {emi.frequency}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-slate-400 font-medium">Installment</p>
                                                        <p className="font-black text-rose-400">{config?.currency} {emi.amount.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs text-slate-400 font-medium">Paid so far</p>
                                                        <p className="text-sm font-bold text-white">{config?.currency} {paidAmount.toLocaleString()}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            payMutate.mutate({ emiId: emi.emiId, amountPaid: emi.amount });
                                                        }}
                                                        disabled={payMutate.isPending}
                                                        className="px-3 py-1.5 bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                                                    >
                                                        Pay Now
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Minimal Modals could go here (omitted for brevity, but you get the idea) */}
        </div>
    );
}
