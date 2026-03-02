import { useEffect, useState } from 'react';
import { ShoppingBag, ChevronRight, ArrowUpRight, Loader2, AlertCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { googleApiService } from '../services/googleApiService';
import { useInventory, type CombinedInventoryItem } from '../hooks/useInventory';
import { useDashboardAnalytics } from '../hooks/useAnalytics';
import type { UserConfig } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrencySymbol } from '../utils/currency';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';

interface DashboardProps {
    config: UserConfig | null;
}

const Dashboard = ({ config }: DashboardProps) => {
    const navigate = useNavigate();
    const [weeklySpend, setWeeklySpend] = useState(0);
    const { data: inventory = [], isLoading: isLoadingInventory } = useInventory(config?.activeHouseholdId);

    const { data: shoppingList = [], isLoading: isLoadingShoppingList } = useQuery({
        queryKey: ['shoppingList'],
        queryFn: googleApiService.getShoppingList,
        enabled: !!config?.activeHouseholdId
    });

    const { data: events = [], isLoading: isLoadingEvents } = useQuery({
        queryKey: ['shopEvents'],
        queryFn: googleApiService.getShopEvents,
        enabled: !!config?.activeHouseholdId
    });

    useEffect(() => {
        if (!isLoadingEvents && events.length > 0) {
            // Calculate weekly spend (Sunday to Saturday or last 7 days)
            const now = new Date();
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const spend = events
                .filter(e => new Date(e.date) >= oneWeekAgo)
                .reduce((acc, curr) => acc + curr.totalAmount, 0);
            setWeeklySpend(spend);
        }
    }, [events, isLoadingEvents]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = `${today.getFullYear()}-${("0" + (today.getMonth() + 1)).slice(-2)}-${("0" + today.getDate()).slice(-2)}`;

    const {
        isLoading: isAnalyticsLoading,
        totalMonthlySpend,
        monthlySpendByMember,
        totalMonthlyWastageValue,
        wastageTrend
    } = useDashboardAnalytics(config);

    const useNowCount = inventory.filter((i: CombinedInventoryItem) => i.status === 'USE_NOW').length;
    const expiredCount = inventory.filter((i: CombinedInventoryItem) => i.status === 'EXPIRED' || (!!i.expiryDate && i.expiryDate < todayStr)).length;

    const loading = isLoadingInventory || isLoadingShoppingList || isLoadingEvents || isAnalyticsLoading;

    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
                <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Synchronizing Kitchen</p>
            </div>
        );
    }

    const StatCard = ({ title, value, icon: Icon, color, delay, onClick }: any) => (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay }}
            onClick={onClick}
            className="glass p-4 rounded-3xl flex flex-col gap-2 relative overflow-hidden group border-slate-700/50 cursor-pointer hover:border-slate-500 transition-colors"
        >
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${color}`}>
                <Icon size={20} />
            </div>
            <div className="flex flex-col">
                <span className="text-2xl font-bold text-white">{value}</span>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{title}</span>
            </div>
            <div className={`absolute -right-4 -bottom-4 w-16 h-16 rounded-full opacity-20 ${color.split(' ')[0]} blur-xl group-hover:scale-150 transition-transform duration-500`} />
        </motion.div>
    );

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-white">Hello, {config?.currentUser?.name || 'User'}! 👋</h1>
                <p className="text-slate-400 font-medium text-sm">Here's what's happening in your kitchen.</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <StatCard
                    title="To Buy"
                    value={shoppingList.length}
                    icon={ShoppingBag}
                    color="bg-primary-500/20 text-primary-400"
                    delay={0.1}
                    onClick={() => navigate('/list')}
                />
                <StatCard
                    title="Use Now"
                    value={useNowCount}
                    icon={Clock}
                    color="bg-orange-500/20 text-orange-400"
                    delay={0.2}
                    onClick={() => navigate('/inventory?filter=USE_NOW')}
                />
                <StatCard
                    title="Expired"
                    value={expiredCount}
                    icon={AlertCircle}
                    color="bg-purple-500/20 text-purple-400"
                    delay={0.3}
                    onClick={() => navigate('/inventory?filter=Expired')}
                />
            </div>

            <section className="space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    Critical Items
                    <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                </h2>
                <div className="grid gap-3">
                    {inventory.filter((i: CombinedInventoryItem) => i.status === 'USE_NOW' || i.status === 'EXPIRED' || (!!i.expiryDate && i.expiryDate < todayStr)).slice(0, 4).map((item: CombinedInventoryItem) => (
                        <Link
                            key={item.batchId}
                            to={`/inventory?filter=${item.status === 'EXPIRED' || (!!item.expiryDate && item.expiryDate < todayStr) ? 'EXPIRED' : 'USE_NOW'}`}
                            className="glass p-4 rounded-2xl flex items-center justify-between group hover:border-orange-500/50 transition-colors border-slate-700/50"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.status === 'EXPIRED' || (!!item.expiryDate && !!item.expiryDate && item.expiryDate < todayStr) ? 'bg-purple-500/10 text-purple-400' : 'bg-orange-500/10 text-orange-400'}`}>
                                    {item.status === 'EXPIRED' || (!!item.expiryDate && item.expiryDate < todayStr) ? <AlertCircle size={18} /> : <Clock size={18} />}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">{item.itemName}</h3>
                                    <p className="text-xs text-slate-400 font-medium">
                                        {item.status === 'EXPIRED' || (!!item.expiryDate && item.expiryDate < todayStr) ? <span className="text-purple-400">Expired</span> : <span className="text-orange-400">Use soon</span>}
                                        {' '}• {item.currentQty} {item.unit} left
                                    </p>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-slate-500 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
                        </Link>
                    ))}
                    {(useNowCount === 0 && expiredCount === 0) && (
                        <div className="glass p-6 rounded-2xl text-center border-slate-700/50">
                            <p className="text-slate-500 text-sm font-medium italic">All systems go! Everything in stock.</p>
                        </div>
                    )}
                </div>
            </section>

            <section onClick={() => navigate('/financials')} className="glass p-6 rounded-3xl bg-slate-900 border-slate-700 shadow-2xl relative overflow-hidden group cursor-pointer hover:border-slate-500 transition-colors">
                <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-white font-bold text-lg">Household Expenses</h2>
                        <ArrowUpRight className="text-slate-500 group-hover:text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" size={20} />
                    </div>
                    <div className="flex items-end justify-between">
                        <div className="flex flex-col">
                            <span className="text-3xl font-black text-white tracking-tighter">{getCurrencySymbol(config?.currency || 'INR')}{weeklySpend.toLocaleString()}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Spent this week</span>
                        </div>
                        <div className="flex -space-x-3">
                            {config?.members.map(member => (
                                <img
                                    key={member.email}
                                    className="w-10 h-10 rounded-full border-2 border-slate-900 shadow-xl"
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.email)}&background=${member.color.substring(1)}&color=fff`}
                                    alt={member.email}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent-600/5 rounded-full blur-2xl" />
            </section>

            {/* Analytics Section */}
            {(monthlySpendByMember.length > 0 || wastageTrend.length > 0) && (
                <section className="space-y-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        Monthly Overview
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Spend by Member */}
                        {monthlySpendByMember.length > 0 && (
                            <div className="glass p-5 rounded-3xl border-slate-700/50">
                                <h3 className="text-sm font-bold text-slate-300 mb-4 flex justify-between">
                                    <span>Spend by Member</span>
                                    <span className="text-white">{config?.currency} {totalMonthlySpend.toLocaleString()}</span>
                                </h3>
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={monthlySpendByMember} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={70} stroke="none">
                                                {monthlySpendByMember.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {monthlySpendByMember.map(m => (
                                        <div key={m.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.fill }} />
                                            {m.name}: {config?.currency} {m.amount.toLocaleString()}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Wastage Trend */}
                        {wastageTrend.length > 0 && (
                            <div className="glass p-5 rounded-3xl border-slate-700/50">
                                <h3 className="text-sm font-bold text-slate-300 mb-4 flex justify-between">
                                    <span>Wastage Trend (30 Days)</span>
                                    <span className="text-red-400">{config?.currency} {totalMonthlyWastageValue.toLocaleString()}</span>
                                </h3>
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={wastageTrend}>
                                            <defs>
                                                <linearGradient id="colorWastage" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }} itemStyle={{ color: '#ef4444' }} />
                                            <Area type="monotone" dataKey="amount" stroke="#ef4444" fillOpacity={1} fill="url(#colorWastage)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
};

export default Dashboard;
