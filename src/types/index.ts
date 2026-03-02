export type Unit = string;
export type ItemStatus = 'STOCKED' | 'EXPIRED' | 'USE_NOW' | 'CONSUMED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type EventType = 'NORMAL' | 'OVER_BUYING';
export type StockType = 'MIXED' | 'SEPARATE';
export type InterestType = 'NO_COST' | 'INTEREST';

// 1. Catalog & Inventory Engine
export interface Item {
    itemId: string;
    itemName: string;
    category: string;
    stockType: StockType;
    unit: Unit;
    threshold: number;
    useNowDaysPrior: number;
    stepQty: number;
    notes?: string;
}

export interface InventoryBatch {
    batchId: string;
    itemId: string;
    qtyAdded: number;
    qtyRemaining: number;
    pricePerUnit: number;
    expiryDate?: string;
    addedDate: string;
    status: ItemStatus;
}

// 2. Shopping & Checkout Flow
export interface ShoppingListItem {
    listId: string;
    itemId: string;
    qtyNeeded: number;
    priority: Priority;
    addedDate: string;
}

export interface ShopEvent {
    eventId: string;
    date: string;
    shopSource: string;
    totalAmount: number;
    buyer: string;
    eventType: EventType;
}

export interface PurchasedBatch {
    eventId: string;
    batchId: string;
    itemId: string;
    qtyBought: number;
    pricePerUnit: number;
    totalPrice: number;
}

// 3. Tracking (Consumption & Wastage)
export interface ConsumeEvent {
    eventId: string;
    date: string;
    itemId: string;
    batchId?: string; // Blank if MIXED
    qtyConsumed: number;
    consumer: string;
}

export interface WastageEvent {
    eventId: string;
    date: string;
    itemId: string;
    batchId?: string; // Can be blank if calculating moving average for MIXED
    qtyWasted: number;
    valueLost: number;
    reason: string;
}

// 4. Financial Tracking & Goals
export interface Goal {
    goalId: string;
    goalName: string;
    targetAmount: number;
    status: string;
    spendRatios: string; // JSON string
}

export interface OneTimeExpense {
    expenseId: string;
    date: string;
    category: string;
    amount: number;
    spender: string;
    goalId?: string;
}

export interface RecurringExpense {
    emiId: string;
    goalId: string;
    expenseName: string;
    amount: number;
    frequency: string;
    interestType: InterestType;
    interestRate: number;
    startDate: string;
    endDate: string;
    dueDate: string;
}

export interface EMIPayment {
    paymentId: string;
    emiId: string;
    datePaid: string;
    amountPaid: number;
    lateFee: number;
    status: string;
}

// 5. Configurations & State
export interface Household {
    id: string; // Spreadsheet ID
    name: string;
    role: 'Owner' | 'Member';
}

export interface Category {
    categoryId: string;
    name: string;
    color: string;
    type: 'INVENTORY' | 'EXPENSE';
}

export interface Shop {
    shopId: string;
    name: string;
    color: string;
}

export interface Member {
    memberId: string;
    email: string;
    name: string;
    color: string;
    picture?: string;
    preferredCurrency?: string;
    isOwner?: boolean;
    defaultSpendRatio?: number;
}

export interface Status {
    statusId: string;
    name: string;
    color: string;
}

export interface UnitObj {
    unitId: string;
    name: string;
}

export interface UserConfig {
    categories: Category[];
    shops: Shop[];
    members: Member[];
    units: UnitObj[];
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
