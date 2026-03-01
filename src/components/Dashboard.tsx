import { useEffect, useState } from 'react';
import { TrendingDown, ShoppingBag, ChevronRight, ArrowUpRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { googleApiService } from '../services/googleApiService';
import type { InventoryItem, ShoppingListItem, UserConfig } from '../types';
import { Link } from 'react-router-dom';

interface DashboardProps {
    config: UserConfig | null;
}

const Dashboard = ({ config }: DashboardProps) => {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
    const [weeklySpend, setWeeklySpend] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!config?.activeHouseholdId) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const [inv, shop, events] = await Promise.all([
                    googleApiService.getInventory(),
                    googleApiService.getShoppingList(),
                    googleApiService.getShopEvents()
                ]);
                setInventory(inv);
                setShoppingList(shop);

                // Calculate weekly spend (Sunday to Saturday or last 7 days)
                const now = new Date();
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                const spend = events
                    .filter(e => new Date(e.date) >= oneWeekAgo)
                    .reduce((acc, curr) => acc + curr.totalAmount, 0);
                setWeeklySpend(spend);

            } catch (e) {
                console.error("Dashboard fetch error:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [config?.activeHouseholdId]);

    const nearFinishCount = inventory.filter(i => i.status === 'Near Finish').length;

    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
                <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Synchronizing Kitchen</p>
            </div>
        );
    }

    const StatCard = ({ title, value, icon: Icon, color, delay }: any) => (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay }}
            className="glass p-4 rounded-3xl flex flex-col gap-2 relative overflow-hidden group border-slate-700/50"
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

            <div className="grid grid-cols-2 gap-4">
                <StatCard
                    title="Items to Buy"
                    value={shoppingList.length}
                    icon={ShoppingBag}
                    color="bg-primary-500/20 text-primary-400"
                    delay={0.1}
                />
                <StatCard
                    title="Near Finish"
                    value={nearFinishCount}
                    icon={TrendingDown}
                    color="bg-red-500/20 text-red-400"
                    delay={0.2}
                />
            </div>

            <section className="space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    Critical Items
                    <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                </h2>
                <div className="grid gap-3">
                    {inventory.filter(i => i.status === 'Near Finish').slice(0, 3).map((item) => (
                        <Link
                            key={item.itemName}
                            to="/inventory"
                            className="glass p-4 rounded-2xl flex items-center justify-between group hover:border-red-500/50 transition-colors border-slate-700/50"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
                                    <TrendingDown size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">{item.itemName}</h3>
                                    <p className="text-xs text-slate-400 font-medium">{item.currentQty} {item.unit} left</p>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-slate-500 group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
                        </Link>
                    ))}
                    {nearFinishCount === 0 && (
                        <div className="glass p-6 rounded-2xl text-center border-slate-700/50">
                            <p className="text-slate-500 text-sm font-medium italic">All systems go! Everything in stock.</p>
                        </div>
                    )}
                </div>
            </section>

            <section className="glass p-6 rounded-3xl bg-slate-900 border-slate-700 shadow-2xl relative overflow-hidden group">
                <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-white font-bold text-lg">Household Expenses</h2>
                        <ArrowUpRight className="text-slate-500 group-hover:text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" size={20} />
                    </div>
                    <div className="flex items-end justify-between">
                        <div className="flex flex-col">
                            <span className="text-3xl font-black text-white tracking-tighter">{config?.currency || '₹'}{weeklySpend.toLocaleString()}</span>
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
        </div>
    );
};

export default Dashboard;
