export type Unit = 'Kilos' | 'Liters' | 'Grams' | 'Numbers' | 'Packets';
export type ItemStatus = 'Normal' | 'Near Finish';
export type Priority = 'Low' | 'Medium' | 'High';
export type EntryType = 'Summary' | 'Itemized';

export interface InventoryItem {
    itemName: string;
    category: string;
    currentQty: number;
    unit: Unit;
    threshold: number;
    status: ItemStatus;
}

export interface ShoppingListItem {
    itemName: string;
    qtyNeeded: number;
    priority: Priority;
}

export interface ShopEvent {
    eventId: string;
    date: string;
    shopSource: string;
    totalAmount: number;
    buyer: string;
    entryType: EntryType;
}

export interface PurchasedItem {
    eventId: string;
    itemName: string;
    qtyBought: number;
    pricePerUnit: number;
}

export interface Family {
    id: string; // Spreadsheet ID
    name: string;
    role: 'Owner' | 'Member';
}

export interface UserConfig {
    shops: string[];
    members: string[];
    currentUser: {
        email: string;
        name: string;
    };
    families: Family[];
    activeFamilyId?: string;
}
