import { useQuery } from '@tanstack/react-query';
import { googleApiService } from '../services/googleApiService';
import type { UserConfig } from '../types';

export const WASTAGE_QUERY_KEY = ['wastageEvents'];
export const CONSUME_QUERY_KEY = ['consumeEvents'];

export function useWastageEvents(activeHouseholdId: string | undefined) {
    return useQuery({
        queryKey: WASTAGE_QUERY_KEY,
        queryFn: async () => {
            if (!activeHouseholdId) return [];
            return await googleApiService.getWastageEvents();
        },
        enabled: !!activeHouseholdId,
    });
}

export function useConsumeEvents(activeHouseholdId: string | undefined) {
    return useQuery({
        queryKey: CONSUME_QUERY_KEY,
        queryFn: async () => {
            if (!activeHouseholdId) return [];
            return await googleApiService.getConsumeEvents();
        },
        enabled: !!activeHouseholdId,
    });
}

export function useDashboardAnalytics(config: UserConfig | null) {
    const activeHouseholdId = config?.activeHouseholdId;

    const { data: events = [], isLoading: isEventsLoading } = useQuery({
        queryKey: ['shopEvents'],
        queryFn: googleApiService.getShopEvents,
        enabled: !!activeHouseholdId
    });

    const { data: wastage = [], isLoading: isWastageLoading } = useWastageEvents(activeHouseholdId);

    const isLoading = isEventsLoading || isWastageLoading;

    // Process data for the current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Total Monthly Spend
    const currentMonthEvents = events.filter(e => new Date(e.date) >= startOfMonth);
    const totalMonthlySpend = currentMonthEvents.reduce((acc, curr) => acc + curr.totalAmount, 0);

    // 2. Spend by Member (Current Month)
    const spendByMemberRaw = currentMonthEvents.reduce((acc, curr) => {
        const buyer = curr.buyer || 'Unknown';
        acc[buyer] = (acc[buyer] || 0) + curr.totalAmount;
        return acc;
    }, {} as Record<string, number>);

    const monthlySpendByMember = Object.entries(spendByMemberRaw).map(([buyerEmail, amount]) => {
        const member = config?.members.find(m => m.email === buyerEmail);
        return {
            name: member?.name || buyerEmail,
            amount,
            fill: member?.color || '#94a3b8'
        };
    }).sort((a, b) => b.amount - a.amount);

    // 3. Spend by Category
    // Since ShopEvents don't directly have categories, we might need PurchasedBatches to get Item -> Category.
    // For now, if we don't have that joined easily, we can skip category spend or just derive from shop source if needed.
    // Actually, ShopSources are like Amazon, Blinkit. Let's do Spend by Shop Source.
    const spendByShopRaw = currentMonthEvents.reduce((acc, curr) => {
        const shop = curr.shopSource || 'Other';
        acc[shop] = (acc[shop] || 0) + curr.totalAmount;
        return acc;
    }, {} as Record<string, number>);

    const monthlySpendByShop = Object.entries(spendByShopRaw).map(([shopName, amount]) => {
        const shop = config?.shops.find(s => s.name === shopName);
        return {
            name: shopName,
            amount,
            fill: shop?.color || '#64748b'
        };
    }).sort((a, b) => b.amount - a.amount);

    // 4. Wastage this month
    const currentMonthWastage = wastage.filter(w => new Date(w.date) >= startOfMonth);
    const totalMonthlyWastageValue = currentMonthWastage.reduce((acc, curr) => acc + curr.valueLost, 0);

    // Group Wastage by Date for a trend line (Last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentWastage = wastage.filter(w => new Date(w.date) >= thirtyDaysAgo);

    const wastageTrendRaw = recentWastage.reduce((acc, curr) => {
        const d = curr.date.split('T')[0];
        acc[d] = (acc[d] || 0) + curr.valueLost;
        return acc;
    }, {} as Record<string, number>);

    const wastageTrend = Object.entries(wastageTrendRaw)
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
        isLoading,
        totalMonthlySpend,
        monthlySpendByMember,
        monthlySpendByShop,
        totalMonthlyWastageValue,
        wastageTrend
    };
}
