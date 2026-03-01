import type { InventoryItem, ShoppingListItem, ShopEvent, PurchasedItem, UserConfig } from '../types';

/**
 * StockSense API Service
 * Handles communication with Google Apps Script Web App
 */

// IMPORTANT: Replace this with your actual Web App URL after deployment
const BASE_URL = 'https://script.google.com/macros/s/AKfycbyjsMUTEwf-dkYrPwb0ypebO4fS7YhtA8awIa91lsmioqmFBFGsAiZqyQ--Upz8MQkNOA/exec';

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.status === 'error') {
        throw new Error(data.message);
    }
    return data;
};

export const gasService = {
    /**
     * Fetch current inventory levels
     */
    async getInventory(): Promise<InventoryItem[]> {
        try {
            const response = await fetch(`${BASE_URL}?action=getInventory`);
            return await handleResponse(response);
        } catch (error) {
            console.error('Failed to fetch inventory:', error);
            return []; // Return empty on error
        }
    },

    /**
     * Fetch items currently in the shopping list
     */
    async getShoppingList(): Promise<ShoppingListItem[]> {
        try {
            const response = await fetch(`${BASE_URL}?action=getShoppingList`);
            return await handleResponse(response);
        } catch (error) {
            console.error('Failed to fetch shopping list:', error);
            return [];
        }
    },

    /**
     * Fetch user configuration (shops, members)
     */
    async getConfig(): Promise<UserConfig> {
        try {
            const response = await fetch(`${BASE_URL}?action=getConfig`);
            return await handleResponse(response);
        } catch (error) {
            console.error('Failed to fetch config:', error);
            return { shops: [], members: [], currentUser: { email: '', name: 'Guest' } };
        }
    },

    /**
     * Flag an item as "Near Finish" and add to shopping list
     */
    async setNearFinish(itemName: string): Promise<void> {
        try {
            const response = await fetch(BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' }, // Using text/plain to avoid CORS preflight if possible with GAS
                body: JSON.stringify({ action: 'setNearFinish', itemName })
            });
            await handleResponse(response);
        } catch (error) {
            console.error('Failed to set near finish:', error);
        }
    },

    /**
     * Log a purchase event and update inventory
     */
    async logPurchase(event: ShopEvent, items: PurchasedItem[]): Promise<void> {
        try {
            const response = await fetch(BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'logPurchase', event, items })
            });
            await handleResponse(response);
        } catch (error) {
            console.error('Failed to log purchase:', error);
        }
    },

    /**
     * Fetch shop history events
     */
    async getShopEvents(): Promise<ShopEvent[]> {
        try {
            const response = await fetch(`${BASE_URL}?action=getShopEvents`);
            return await handleResponse(response);
        } catch (error) {
            console.error('Failed to fetch shop events:', error);
            return [];
        }
    }
};
