import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { googleApiService } from '../services/googleApiService';
import type { Item, InventoryBatch, Priority } from '../types';

export const INVENTORY_QUERY_KEY = ['inventory'];
export const ITEMS_QUERY_KEY = ['items'];

export type CombinedInventoryItem = Item & InventoryBatch & { currentQty: number };

export function useInventory(activeHouseholdId: string | undefined) {
    return useQuery({
        queryKey: INVENTORY_QUERY_KEY,
        queryFn: async (): Promise<CombinedInventoryItem[]> => {
            if (!activeHouseholdId) return [];
            const [items, batches] = await Promise.all([
                googleApiService.getItems(),
                googleApiService.getInventoryBatches()
            ]);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const itemMap = new Map(items.map(i => [i.itemId, i]));

            const combined = await Promise.all(batches.map(async (batch) => {
                const item = itemMap.get(batch.itemId);
                if (!item) return null;

                const combinedItem: CombinedInventoryItem = {
                    ...item,
                    ...batch,
                    currentQty: batch.qtyRemaining
                };

                if (batch.expiryDate && batch.status !== 'USE_NOW' && batch.status !== 'EXPIRED' && batch.status !== 'CONSUMED') {
                    const expDate = new Date(batch.expiryDate);
                    expDate.setHours(0, 0, 0, 0);
                    const diffTime = expDate.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const thresholdDays = item.useNowDaysPrior ?? 1;

                    if (diffDays <= thresholdDays && diffDays >= 0) {
                        combinedItem.status = 'USE_NOW';
                        // Update in background silently
                        await googleApiService.updateInventoryBatch({ ...batch, status: 'USE_NOW' }).catch(console.error);
                    }
                }
                return combinedItem;
            }));

            return combined.filter(Boolean) as CombinedInventoryItem[];
        },
        enabled: !!activeHouseholdId,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });
}

export function useItems(activeHouseholdId: string | undefined) {
    return useQuery({
        queryKey: ITEMS_QUERY_KEY,
        queryFn: async () => {
            if (!activeHouseholdId) return [];
            return await googleApiService.getItems();
        },
        enabled: !!activeHouseholdId,
    });
}

export function useUpdateItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (updatedItem: Partial<Item> & { itemId?: string; itemName: string }) => {
            return await googleApiService.updateItem(updatedItem);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ITEMS_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
        }
    });
}

export function useUpdateInventoryBatch() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (updatedBatch: Partial<InventoryBatch> & { batchId: string, itemId: string }) => {
            await googleApiService.updateInventoryBatch(updatedBatch);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
        }
    });
}

export function useAddShoppingItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { itemId: string, qtyNeeded: number, priority: Priority }) => {
            await googleApiService.addShoppingItem({
                itemId: params.itemId,
                qtyNeeded: params.qtyNeeded,
                priority: params.priority
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shoppingList'] });
        }
    });
}

export function useLogWastageEvent() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (event: { eventId: string; date: string; itemId: string; batchId?: string; qtyWasted: number; valueLost: number; reason: string }) => {
            await googleApiService.logWastageEvent(event);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
        }
    });
}

export function useLogConsumeEvent() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (event: { eventId: string; date: string; itemId: string; batchId?: string; qtyConsumed: number; consumer: string }) => {
            await googleApiService.logConsumeEvent(event);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
        }
    });
}
