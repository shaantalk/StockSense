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

// Helper for Family-scoped requests
const activeFamilyId = () => localStorage.getItem('activeFamilyId');
const userEmail = () => localStorage.getItem('userEmail') || 'Guest@ecosystem.com';

export const gasService = {
    /**
     * Fetch user configuration (shops, members, families)
     */
    async getConfig(): Promise<UserConfig> {
        try {
            const familyId = activeFamilyId();
            const email = userEmail();
            let url = `${BASE_URL}?action=getConfig&userEmail=${encodeURIComponent(email)}`;
            if (familyId) url += `&familyId=${familyId}`;

            const response = await fetch(url);
            return await handleResponse(response);
        } catch (error) {
            console.error('Failed to fetch config:', error);
            return { shops: [], members: [], currentUser: { email: '', name: 'Guest' }, families: [] };
        }
    },

    /**
     * Create a new family sheet
     */
    async createFamily(name: string): Promise<{ familyId: string }> {
        try {
            const response = await fetch(BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'createFamily', name, userEmail: userEmail() })
            });
            return await handleResponse(response);
        } catch (error) {
            console.error('Failed to create family:', error);
            throw error;
        }
    },

    /**
     * Invite a member to the active family
     */
    async addMember(email: string): Promise<void> {
        const familyId = activeFamilyId();
        if (!familyId) return;
        try {
            const response = await fetch(BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'addMember', email, familyId, userEmail: userEmail() })
            });
            await handleResponse(response);
        } catch (error) {
            console.error('Failed to add member:', error);
            throw error;
        }
    },

    /**
     * Remove a member from the active family
     */
    async removeMember(email: string): Promise<void> {
        const familyId = activeFamilyId();
        if (!familyId) return;
        try {
            const response = await fetch(BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'removeMember', email, familyId, userEmail: userEmail() })
            });
            await handleResponse(response);
        } catch (error) {
            console.error('Failed to remove member:', error);
            throw error;
        }
    },

    /**
     * Fetch current inventory levels
     */
    async getInventory(): Promise<InventoryItem[]> {
        const familyId = activeFamilyId();
        if (!familyId) return [];
        try {
            const response = await fetch(`${BASE_URL}?action=getInventory&familyId=${familyId}&userEmail=${encodeURIComponent(userEmail())}`);
            return await handleResponse(response);
        } catch (error) {
            console.error('Failed to fetch inventory:', error);
            return [];
        }
    },

    /**
     * Fetch items currently in the shopping list
     */
    async getShoppingList(): Promise<ShoppingListItem[]> {
        const familyId = activeFamilyId();
        if (!familyId) return [];
        try {
            const response = await fetch(`${BASE_URL}?action=getShoppingList&familyId=${familyId}&userEmail=${encodeURIComponent(userEmail())}`);
            return await handleResponse(response);
        } catch (error) {
            console.error('Failed to fetch shopping list:', error);
            return [];
        }
    },

    /**
     * Fetch dashboard stats (spend, etc)
     */
    async getDashboardStats(): Promise<{ weeklySpend: number }> {
        const familyId = activeFamilyId();
        if (!familyId) return { weeklySpend: 0 };
        try {
            const response = await fetch(`${BASE_URL}?action=getDashboardStats&familyId=${familyId}&userEmail=${encodeURIComponent(userEmail())}`);
            return await handleResponse(response);
        } catch (error) {
            console.error('Failed to fetch dashboard stats:', error);
            return { weeklySpend: 0 };
        }
    },

    /**
     * Flag an item as "Near Finish" and add to shopping list
     */
    async setNearFinish(itemName: string): Promise<void> {
        const familyId = activeFamilyId();
        if (!familyId) return;
        try {
            const response = await fetch(BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'setNearFinish', itemName, familyId, userEmail: userEmail() })
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
        const familyId = activeFamilyId();
        if (!familyId) return;
        try {
            const response = await fetch(BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'logPurchase', event, items, familyId, userEmail: userEmail() })
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
        const familyId = activeFamilyId();
        if (!familyId) return [];
        try {
            const response = await fetch(`${BASE_URL}?action=getShopEvents&familyId=${familyId}&userEmail=${encodeURIComponent(userEmail())}`);
            return await handleResponse(response);
        } catch (error) {
            console.error('Failed to fetch shop events:', error);
            return [];
        }
    }
};
