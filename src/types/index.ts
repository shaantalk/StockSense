export type Unit = string;
export type ItemStatus = string;
export type Priority = 'Low' | 'Medium' | 'High';
export type EntryType = 'Summary' | 'Itemized';

export interface InventoryItem {
    itemName: string;
    category: string;
    currentQty: number;
    unit: Unit;
    threshold: number;
    status: ItemStatus;
    expiryDate?: string;
    addedDate?: string;
    restockedDate?: string;
    useNowDaysPrior?: number;
    stepQty?: number;
    notes?: string;
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

export interface Household {
    id: string; // Spreadsheet ID
    name: string;
    role: 'Owner' | 'Member';
}

export interface Category {
    name: string;
    color: string;
}

export interface WastageEvent {
    eventId: string;
    date: string;
    itemName: string;
    qtyWasted: number;
    reason: string;
}

export interface Shop {
    name: string;
    color: string;
}

export interface Member {
    email: string;
    name: string;
    color: string;
    picture?: string;
    preferredCurrency?: string;
    isOwner?: boolean;
}

export interface Status {
    name: string;
    color: string;
}

export interface UserConfig {
    categories: Category[];
    shops: Shop[];
    members: Member[];
    units: string[];
    statuses: Status[];
    currency: string;
    currentUser: {
        email: string;
        name: string;
        picture?: string;
    };
    households: Household[];
    activeHouseholdId?: string;
}
