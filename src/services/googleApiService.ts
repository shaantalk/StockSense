import type { Item, InventoryBatch, ShoppingListItem, ShopEvent, PurchasedBatch, Household, Goal, OneTimeExpense, RecurringExpense, EMIPayment, ConsumeEvent, WastageEvent } from '../types';

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

/**
 * Google API Service (Option A)
 * Communicates directly with Google Drive V3 and Google Sheets V4 APIs
 */

const HOUSEHOLD_SUFFIX = "_household_expenses";

// Helper for Google API fetch
const googleFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('google_access_token');
    if (!token) throw new Error('No access token found. Please sign in again.');

    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
        if (response.status === 401) {
            localStorage.removeItem('google_access_token');
            throw new Error('Unauthorized: Please sign in again.');
        }
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        throw new Error(`Google API Error: ${error.error?.message || response.statusText}`);
    }
    return response.json();
};

export const googleApiService = {
    /**
     * Search for existing household spreadsheets in the user's Drive
     */
    async discoverHouseholds(): Promise<Household[]> {
        const q = `name contains '${HOUSEHOLD_SUFFIX}' and trashed = false and mimeType = 'application/vnd.google-apps.spreadsheet'`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,owners(emailAddress))`;

        try {
            const data = await googleFetch(url);
            const userEmail = localStorage.getItem('userEmail');

            return data.files.map((file: any) => ({
                id: file.id,
                name: file.name.replace(HOUSEHOLD_SUFFIX, ""),
                role: file.owners?.[0]?.emailAddress === userEmail ? 'Owner' : 'Member'
            }));
        } catch (error) {
            console.error('Failed to discover households:', error);
            return [];
        }
    },

    /**
     * Create or find a folder in Google Drive
     */
    async getOrCreateFolder(folderName: string): Promise<string> {
        const q = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`;

        const data = await googleFetch(url);
        if (data.files && data.files.length > 0) {
            return data.files[0].id;
        }

        // Create it
        const createUrl = 'https://www.googleapis.com/drive/v3/files';
        const folder = await googleFetch(createUrl, {
            method: 'POST',
            body: JSON.stringify({
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder'
            })
        });
        return folder.id;
    },

    /**
     * Create a new household spreadsheet and initialize its structure
     */
    async createHousehold(name: string): Promise<string> {
        try {
            // 1. Get or create StockSense folder
            const folderId = await this.getOrCreateFolder('StockSense');

            // 2. Create Spreadsheet in that folder
            const driveUrl = 'https://www.googleapis.com/drive/v3/files';
            const file = await googleFetch(driveUrl, {
                method: 'POST',
                body: JSON.stringify({
                    name: name + HOUSEHOLD_SUFFIX,
                    mimeType: 'application/vnd.google-apps.spreadsheet',
                    parents: [folderId]
                })
            });
            const spreadsheetId = file.id;

            // 3. Get the spreadsheet to find the default sheet ID
            const ssUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
            const ss = await googleFetch(ssUrl);

            const sheets = [
                "Items", "InventoryBatches", "ShoppingList", "ShopEvents", "PurchasedBatches",
                "ConsumeEvents", "WastageEvents", "Goals", "OneTimeExpenses", "RecurringExpenses", "EMIPayments",
                "Categories", "Shops", "Members", "Units", "Statuses", "Settings"
            ];
            const requests = sheets.map(s => ({ addSheet: { properties: { title: s } } }));

            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
                method: 'POST',
                body: JSON.stringify({
                    requests: [
                        ...requests,
                        { deleteSheet: { sheetId: ss.sheets[0].properties.sheetId } }
                    ]
                })
            });

            const initialData = [
                { range: "Items!A1", values: [["ItemID", "ItemName", "Category", "StockType", "Unit", "Threshold", "UseNowDaysPrior", "StepQty", "Notes"]] },
                { range: "InventoryBatches!A1", values: [["BatchID", "ItemID", "QtyAdded", "QtyRemaining", "PricePerUnit", "ExpiryDate", "AddedDate", "Status"]] },
                { range: "ShoppingList!A1", values: [["ListID", "ItemID", "QtyNeeded", "Priority", "AddedDate"]] },
                { range: "ShopEvents!A1", values: [["EventID", "Date", "ShopSource", "TotalAmount", "Buyer", "EventType"]] },
                { range: "PurchasedBatches!A1", values: [["EventID", "BatchID", "ItemID", "QtyBought", "PricePerUnit", "TotalPrice"]] },
                { range: "ConsumeEvents!A1", values: [["EventID", "Date", "ItemID", "BatchID", "QtyConsumed", "Consumer"]] },
                { range: "WastageEvents!A1", values: [["EventID", "Date", "ItemID", "BatchID", "QtyWasted", "ValueLost", "Reason"]] },
                { range: "Goals!A1", values: [["GoalID", "GoalName", "TargetAmount", "Status", "SpendRatios"]] },
                { range: "OneTimeExpenses!A1", values: [["ExpenseID", "Date", "Category", "Amount", "Spender", "GoalID"]] },
                { range: "RecurringExpenses!A1", values: [["EMI_ID", "GoalID", "ExpenseName", "Amount", "Frequency", "InterestType", "InterestRate", "StartDate", "EndDate", "DueDate"]] },
                { range: "EMIPayments!A1", values: [["PaymentID", "EMI_ID", "DatePaid", "AmountPaid", "LateFee", "Status"]] },
                { range: "Categories!A1", values: [["CategoryID", "Name", "Color", "Type"], ["CAT-1", "Grocery", "#10b981", "INVENTORY"], ["CAT-2", "Medical", "#ef4444", "INVENTORY"], ["CAT-3", "Electronics", "#3b82f6", "EXPENSE"], ["CAT-4", "Household", "#f59e0b", "EXPENSE"], ["CAT-5", "Personal", "#8b5cf6", "EXPENSE"]] },
                { range: "Shops!A1", values: [["ShopID", "Name", "Color"], ["SHOP-1", "Amazon", "#f97316"], ["SHOP-2", "Blinkit", "#facc15"], ["SHOP-3", "Instamart", "#fb923c"], ["SHOP-4", "BigBasket", "#84cc16"]] },
                { range: "Members!A1", values: [["MemberID", "Email", "Name", "Color", "Picture", "PreferredCurrency", "IsOwner", "DefaultSpendRatio"]] },
                { range: "Units!A1", values: [["UnitID", "Name"], ["UNIT-1", "Kilos"], ["UNIT-2", "Liters"], ["UNIT-3", "ML"], ["UNIT-4", "Grams"], ["UNIT-5", "Numbers"], ["UNIT-6", "Packets"], ["UNIT-7", "Pieces"], ["UNIT-8", "Bottles"], ["UNIT-9", "Boxes"], ["UNIT-10", "Cans"]] },
                { range: "Statuses!A1", values: [["StatusID", "Name", "Color"], ["STAT-1", "STOCKED", "#10b981"], ["STAT-2", "EXPIRED", "#a855f7"], ["STAT-3", "USE_NOW", "#f59e0b"], ["STAT-4", "CONSUMED", "#6b7280"]] },
                { range: "Settings!A1", values: [["Key", "Value"]] },
            ];

            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
                method: 'POST',
                body: JSON.stringify({
                    valueInputOption: 'RAW',
                    data: initialData
                })
            });

            const userInfo = await this.getUserInfo().catch(() => ({ email: localStorage.getItem('userEmail') || 'User', name: '', picture: '' }));
            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Members!A2:append?valueInputOption=RAW`, {
                method: 'POST',
                body: JSON.stringify({
                    values: [[`MEM-${Date.now()}`, userInfo.email, userInfo.name, "#3b82f6", userInfo.picture || '', "INR", "TRUE", "1"]]
                })
            });

            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Settings!A2:append?valueInputOption=RAW`, {
                method: 'POST',
                body: JSON.stringify({
                    values: [["Currency", "INR"]]
                })
            });

            // 4. Add Data Validations (Dropdowns)
            const ssFinalUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
            const ssFinal = await googleFetch(ssFinalUrl);
            const getSheetId = (title: string) => ssFinal.sheets.find((s: any) => s.properties.title === title)?.properties?.sheetId;

            const inventorySheetId = getSheetId('Items');
            const inventoryBatchesSheetId = getSheetId('InventoryBatches');
            const shopEventsSheetId = getSheetId('ShopEvents');

            const validationRequests = [];

            if (inventorySheetId !== undefined) {
                // Category (Col C, index 2)
                validationRequests.push({
                    setDataValidation: {
                        range: { sheetId: inventorySheetId, startRowIndex: 1, startColumnIndex: 2, endColumnIndex: 3 },
                        rule: { condition: { type: 'ONE_OF_RANGE', values: [{ userEnteredValue: '=Categories!$B$2:$B' }] }, showCustomUi: true, strict: true }
                    }
                });
                // Unit (Col E, index 4)
                validationRequests.push({
                    setDataValidation: {
                        range: { sheetId: inventorySheetId, startRowIndex: 1, startColumnIndex: 4, endColumnIndex: 5 },
                        rule: { condition: { type: 'ONE_OF_RANGE', values: [{ userEnteredValue: '=Units!$B$2:$B' }] }, showCustomUi: true, strict: true }
                    }
                });
            }

            if (inventoryBatchesSheetId !== undefined) {
                // Status (Col H, index 7)
                validationRequests.push({
                    setDataValidation: {
                        range: { sheetId: inventoryBatchesSheetId, startRowIndex: 1, startColumnIndex: 7, endColumnIndex: 8 },
                        rule: { condition: { type: 'ONE_OF_RANGE', values: [{ userEnteredValue: '=Statuses!$B$2:$B' }] }, showCustomUi: true, strict: true }
                    }
                });
            }

            if (shopEventsSheetId !== undefined) {
                // ShopSource (Col C, index 2)
                validationRequests.push({
                    setDataValidation: {
                        range: { sheetId: shopEventsSheetId, startRowIndex: 1, startColumnIndex: 2, endColumnIndex: 3 },
                        rule: { condition: { type: 'ONE_OF_RANGE', values: [{ userEnteredValue: '=Shops!$B$2:$B' }] }, showCustomUi: true, strict: true }
                    }
                });
                // Buyer (Col E, index 4)
                validationRequests.push({
                    setDataValidation: {
                        range: { sheetId: shopEventsSheetId, startRowIndex: 1, startColumnIndex: 4, endColumnIndex: 5 },
                        rule: { condition: { type: 'ONE_OF_RANGE', values: [{ userEnteredValue: '=Members!$C$2:$C' }] }, showCustomUi: true, strict: true }
                    }
                });
            }

            if (validationRequests.length > 0) {
                await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
                    method: 'POST',
                    body: JSON.stringify({ requests: validationRequests })
                });
            }

            return spreadsheetId;
        } catch (error) {
            console.error('Failed to create household:', error);
            throw error;
        }
    },

    async getUserInfo(): Promise<{ email: string; name: string; picture?: string }> {
        const url = 'https://www.googleapis.com/oauth2/v3/userinfo';
        try {
            const data = await googleFetch(url);
            return {
                email: data.email,
                name: data.name || data.given_name || data.email.split('@')[0],
                picture: data.picture || ''
            };
        } catch (error) {
            console.error('Failed to fetch user info:', error);
            throw error;
        }
    },

    async getTableData(sheetName: string): Promise<any[]> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return [];

        try {
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:Z`;
            const data = await googleFetch(url);
            if (!data.values || data.values.length < 1) return [];

            const headers = data.values[0];
            return data.values.slice(1).map((row: any) => {
                let obj: any = {};
                headers.forEach((h: string, i: number) => {
                    const key = h.charAt(0).toLowerCase() + h.slice(1);
                    obj[key] = row[i];
                });
                return obj;
            });
        } catch (error: any) {
            if (!error.message?.includes('Requested entity was not found')) {
                console.error(`Failed to fetch ${sheetName}:`, error);
            }
            return [];
        }
    },

    /**
     * Specific Getters
     */
    async getItems(): Promise<Item[]> {
        const data = await this.getTableData('Items');
        return data.map(item => ({
            ...item,
            threshold: Number(item.threshold),
            useNowDaysPrior: item.useNowDaysPrior ? Number(item.useNowDaysPrior) : 1,
            stepQty: item.stepQty ? Number(item.stepQty) : 1,
            notes: item.notes || ''
        }));
    },

    async getInventoryBatches(): Promise<InventoryBatch[]> {
        const data = await this.getTableData('InventoryBatches');
        return data.map(batch => ({
            ...batch,
            qtyAdded: Number(batch.qtyAdded),
            qtyRemaining: Number(batch.qtyRemaining),
            pricePerUnit: Number(batch.pricePerUnit),
            expiryDate: batch.expiryDate || ''
        }));
    },

    async getShoppingList(): Promise<ShoppingListItem[]> {
        const data = await this.getTableData('ShoppingList');
        return data.map(item => ({
            ...item,
            qtyNeeded: Number(item.qtyNeeded)
        }));
    },

    async getShopEvents(): Promise<ShopEvent[]> {
        const data = await this.getTableData('ShopEvents');
        return data.map(event => ({
            ...event,
            totalAmount: Number(event.totalAmount)
        }));
    },

    async getPurchasedBatches(): Promise<PurchasedBatch[]> {
        const data = await this.getTableData('PurchasedBatches');
        return data.map(b => ({
            ...b,
            qtyBought: Number(b.qtyBought),
            pricePerUnit: Number(b.pricePerUnit),
            totalPrice: Number(b.totalPrice)
        }));
    },

    async getWastageEvents(): Promise<WastageEvent[]> {
        const data = await this.getTableData('WastageEvents');
        return data.map(e => ({
            ...e,
            qtyWasted: Number(e.qtyWasted),
            valueLost: Number(e.valueLost)
        }));
    },

    async getConsumeEvents(): Promise<ConsumeEvent[]> {
        const data = await this.getTableData('ConsumeEvents');
        return data.map(e => ({
            ...e,
            qtyConsumed: Number(e.qtyConsumed)
        }));
    },

    async getGoals(): Promise<Goal[]> {
        const data = await this.getTableData('Goals');
        return data.map(g => ({
            ...g,
            targetAmount: Number(g.targetAmount)
        }));
    },

    async getOneTimeExpenses(): Promise<OneTimeExpense[]> {
        const data = await this.getTableData('OneTimeExpenses');
        return data.map(e => ({
            ...e,
            amount: Number(e.amount)
        }));
    },

    async getRecurringExpenses(): Promise<RecurringExpense[]> {
        const data = await this.getTableData('RecurringExpenses');
        return data.map(e => ({
            ...e,
            amount: Number(e.amount),
            interestRate: Number(e.interestRate)
        }));
    },

    async getEMIPayments(): Promise<EMIPayment[]> {
        const data = await this.getTableData('EMIPayments');
        return data.map(p => ({
            ...p,
            amountPaid: Number(p.amountPaid),
            lateFee: Number(p.lateFee)
        }));
    },

    /**
     * CRUD Operations
     */
    async updateItem(item: Partial<Item> & { itemId?: string; itemName: string }): Promise<string> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return '';

        let itemId = item.itemId;

        const data = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Items!A:A`);
        const rows = data.values || [];

        let rowIndex = -1;
        if (itemId) {
            rowIndex = rows.findIndex((r: any) => r[0] === itemId);
        } else {
            // Check by name if no ID
            const fullData = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Items!A:Z`);
            const nameIndex = fullData.values?.findIndex((r: any) => r[1] === item.itemName) ?? -1;
            if (nameIndex !== -1) {
                rowIndex = nameIndex;
                itemId = fullData.values[nameIndex][0];
            }
        }

        if (rowIndex === -1 || !itemId) {
            itemId = generateId('ITM');
            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Items!A1:append?valueInputOption=RAW`, {
                method: 'POST',
                body: JSON.stringify({
                    values: [[itemId, item.itemName, item.category || 'Grocery', item.stockType || 'MIXED', item.unit || 'Numbers', item.threshold || 1, item.useNowDaysPrior ?? 1, item.stepQty ?? 1, item.notes || '']]
                })
            });
        } else {
            const range = `Items!A${rowIndex + 1}:I${rowIndex + 1}`;
            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`, {
                method: 'PUT',
                body: JSON.stringify({
                    values: [[itemId, item.itemName, item.category || 'Grocery', item.stockType || 'MIXED', item.unit || 'Numbers', item.threshold || 1, item.useNowDaysPrior ?? 1, item.stepQty ?? 1, item.notes || '']]
                })
            });
        }
        return itemId;
    },

    async updateInventoryBatch(batch: Partial<InventoryBatch> & { batchId?: string, itemId: string }): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        let batchId = batch.batchId;

        const data = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/InventoryBatches!A:A`);
        const rows = data.values || [];
        const rowIndex = batchId ? rows.findIndex((r: any) => r[0] === batchId) : -1;

        if (rowIndex === -1 || !batchId) {
            batchId = generateId('BAT');
            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/InventoryBatches!A1:append?valueInputOption=RAW`, {
                method: 'POST',
                body: JSON.stringify({
                    values: [[batchId, batch.itemId, batch.qtyAdded ?? batch.qtyRemaining, batch.qtyRemaining, batch.pricePerUnit || 0, batch.expiryDate || '', batch.addedDate || new Date().toISOString().split('T')[0], batch.status || 'STOCKED']]
                })
            });
        } else {
            const range = `InventoryBatches!A${rowIndex + 1}:H${rowIndex + 1}`;
            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`, {
                method: 'PUT',
                body: JSON.stringify({
                    values: [[batchId, batch.itemId, batch.qtyAdded ?? batch.qtyRemaining, batch.qtyRemaining, batch.pricePerUnit || 0, batch.expiryDate || '', batch.addedDate || new Date().toISOString().split('T')[0], batch.status || 'STOCKED']]
                })
            });
        }
    },

    async addShoppingItem(item: { itemId: string, qtyNeeded: number, priority: string }): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/ShoppingList!A1:append?valueInputOption=RAW`, {
            method: 'POST',
            body: JSON.stringify({
                values: [[generateId('LST'), item.itemId, item.qtyNeeded, item.priority, new Date().toISOString().split('T')[0]]]
            })
        });
    },

    async updateShoppingItem(listId: string, qtyNeeded: number): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        const data = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/ShoppingList!A:A`);
        const rows = data.values || [];
        const rowIndex = rows.findIndex((r: any) => r[0] === listId);

        if (rowIndex !== -1) {
            const range = `ShoppingList!C${rowIndex + 1}`;
            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`, {
                method: 'PUT',
                body: JSON.stringify({
                    values: [[qtyNeeded]]
                })
            });
        }
    },

    async removeShoppingItem(listId: string): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        const data = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/ShoppingList!A:A`);
        const rows = data.values || [];
        const rowIndex = rows.findIndex((r: any) => r[0] === listId);

        if (rowIndex !== -1) {
            const sheetInfo = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties)`);
            const sheetId = sheetInfo.sheets.find((s: any) => s.properties.title === 'ShoppingList').properties.sheetId;

            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
                method: 'POST',
                body: JSON.stringify({
                    requests: [{
                        deleteDimension: {
                            range: {
                                sheetId,
                                dimension: 'ROWS',
                                startIndex: rowIndex,
                                endIndex: rowIndex + 1
                            }
                        }
                    }]
                })
            });
        }
    },

    async logPurchase(event: ShopEvent, batches: PurchasedBatch[]): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        // 1. Log Event
        await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/ShopEvents!A1:append?valueInputOption=RAW`, {
            method: 'POST',
            body: JSON.stringify({
                values: [[event.eventId, event.date, event.shopSource, event.totalAmount, event.buyer, event.eventType]]
            })
        });

        // 2. Log Line Items
        if (batches.length > 0) {
            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/PurchasedBatches!A1:append?valueInputOption=RAW`, {
                method: 'POST',
                body: JSON.stringify({
                    values: batches.map(b => [b.eventId, b.batchId, b.itemId, b.qtyBought, b.pricePerUnit, b.totalPrice])
                })
            });
        }
    },

    async logWastageEvent(event: { eventId: string; date: string; itemId: string; batchId?: string; qtyWasted: number; valueLost: number; reason: string }): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        // Ensure the sheet exists, if not, it will fail silently here, but we can attempt to add the row.
        try {
            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/WastageEvents!A1:append?valueInputOption=RAW`, {
                method: 'POST',
                body: JSON.stringify({
                    values: [[event.eventId, event.date, event.itemId, event.batchId || '', event.qtyWasted, event.valueLost, event.reason]]
                })
            });
        } catch (e: any) {
            console.warn("Could not log wastage event.", e);
        }
    },

    async logConsumeEvent(event: { eventId: string; date: string; itemId: string; batchId?: string; qtyConsumed: number; consumer: string }): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        try {
            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/ConsumeEvents!A1:append?valueInputOption=RAW`, {
                method: 'POST',
                body: JSON.stringify({
                    values: [[event.eventId, event.date, event.itemId, event.batchId || '', event.qtyConsumed, event.consumer]]
                })
            });
        } catch (e: any) {
            console.warn("Could not log consume event.", e);
        }
    },

    /**
     * Financials
     */
    async addGoal(goal: Partial<Goal> & { goalName: string; targetAmount: number }): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Goals!A1:append?valueInputOption=RAW`, {
            method: 'POST',
            body: JSON.stringify({
                values: [[generateId('GOL'), goal.goalName, goal.targetAmount, goal.status || 'ACTIVE', goal.spendRatios || '{}']]
            })
        });
    },

    async addOneTimeExpense(expense: Partial<OneTimeExpense> & { category: string; amount: number; spender: string }): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/OneTimeExpenses!A1:append?valueInputOption=RAW`, {
            method: 'POST',
            body: JSON.stringify({
                values: [[generateId('EXP'), expense.date || new Date().toISOString().split('T')[0], expense.category, expense.amount, expense.spender, expense.goalId || '']]
            })
        });
    },

    async updateRecurringExpense(expense: Partial<RecurringExpense> & { expenseName: string; amount: number; frequency: string; startDate: string }): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        let emiId = expense.emiId || generateId('EMI');

        const data = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/RecurringExpenses!A:A`);
        const rows = data.values || [];
        const rowIndex = rows.findIndex((r: any) => r[0] === expense.emiId);

        const rowData = [emiId, expense.goalId || '', expense.expenseName, expense.amount, expense.frequency, expense.interestType || 'NO_COST', expense.interestRate || 0, expense.startDate, expense.endDate || '', expense.dueDate || ''];

        if (rowIndex === -1) {
            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/RecurringExpenses!A1:append?valueInputOption=RAW`, {
                method: 'POST',
                body: JSON.stringify({ values: [rowData] })
            });
        } else {
            const range = `RecurringExpenses!A${rowIndex + 1}:J${rowIndex + 1}`;
            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`, {
                method: 'PUT',
                body: JSON.stringify({ values: [rowData] })
            });
        }
    },

    async logEmiPayment(payment: Partial<EMIPayment> & { emiId: string; amountPaid: number }): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/EMIPayments!A1:append?valueInputOption=RAW`, {
            method: 'POST',
            body: JSON.stringify({
                values: [[generateId('PAY'), payment.emiId, payment.datePaid || new Date().toISOString().split('T')[0], payment.amountPaid, payment.lateFee || 0, payment.status || 'PAID']]
            })
        });
    },

    async addMember(email: string, name: string = '', defaultCurrency: string = '', color: string = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        // 1. Add Drive Permission
        await googleFetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`, {
            method: 'POST',
            body: JSON.stringify({
                role: 'writer',
                type: 'user',
                emailAddress: email
            })
        });

        await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Members!A1:append?valueInputOption=RAW`, {
            method: 'POST',
            body: JSON.stringify({
                values: [[email, color, name, "", defaultCurrency, "FALSE"]]
            })
        });
    },

    async updateMemberProfile(email: string, updates: Partial<import('../types').Member>): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        const data = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Members!A:F`);
        const rows = data.values || [];
        const rowIndex = rows.findIndex((r: any) => r[0] === email);

        if (rowIndex !== -1) {
            const row = rows[rowIndex];
            const updatedRow = [
                row[0] || email,
                updates.color || row[1] || '',
                updates.name !== undefined ? updates.name : (row[2] || ''),
                updates.picture !== undefined ? updates.picture : (row[3] || ''),
                updates.preferredCurrency !== undefined ? updates.preferredCurrency : (row[4] || ''),
                updates.isOwner !== undefined ? (updates.isOwner ? "TRUE" : "FALSE") : (row[5] || 'FALSE')
            ];
            const range = `Members!A${rowIndex + 1}:F${rowIndex + 1}`;
            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`, {
                method: 'PUT',
                body: JSON.stringify({ values: [updatedRow] })
            });
        }
    },

    async removeMember(email: string): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        // 1. Find Permission ID
        const permData = await googleFetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions?fields=permissions(id,emailAddress)`);
        const perm = permData.permissions.find((p: any) => p.emailAddress === email);

        if (perm) {
            await googleFetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions/${perm.id}`, {
                method: 'DELETE'
            });
        }

        // 2. Remove from Members sheet
        const configData = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Members!A:A`);
        const rows = configData.values || [];
        const rowIndex = rows.findIndex((r: any) => r[0] === email);

        if (rowIndex !== -1) {
            const sheetInfo = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties)`);
            const sheetId = sheetInfo.sheets.find((s: any) => s.properties.title === 'Members').properties.sheetId;

            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
                method: 'POST',
                body: JSON.stringify({
                    requests: [{
                        deleteDimension: {
                            range: {
                                sheetId,
                                dimension: 'ROWS',
                                startIndex: rowIndex,
                                endIndex: rowIndex + 1
                            }
                        }
                    }]
                })
            });
        }
    },

    /**
     * Config Management
     */
    async addShop(shopName: string, color: string = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Shops!A1:append?valueInputOption=RAW`, {
            method: 'POST',
            body: JSON.stringify({
                values: [[shopName, color]]
            })
        });
    },

    async removeShop(shopName: string): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        const shopData = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Shops!A:A`);
        const rows = shopData.values || [];
        const rowIndex = rows.findIndex((r: any) => r[0] === shopName);

        if (rowIndex !== -1) {
            const sheetInfo = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties)`);
            const sheetId = sheetInfo.sheets.find((s: any) => s.properties.title === 'Shops').properties.sheetId;

            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
                method: 'POST',
                body: JSON.stringify({
                    requests: [{
                        deleteDimension: {
                            range: {
                                sheetId,
                                dimension: 'ROWS',
                                startIndex: rowIndex,
                                endIndex: rowIndex + 1
                            }
                        }
                    }]
                })
            });
        }
    },

    async addCategory(name: string, color: string): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Categories!A1:append?valueInputOption=RAW`, {
            method: 'POST',
            body: JSON.stringify({
                values: [[name, color]]
            })
        });
    },

    async removeCategory(name: string): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        const catData = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Categories!A:A`);
        const rows = catData.values || [];
        const rowIndex = rows.findIndex((r: any) => r[0] === name);

        if (rowIndex !== -1) {
            const sheetInfo = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties)`);
            const sheetId = sheetInfo.sheets.find((s: any) => s.properties.title === 'Categories').properties.sheetId;

            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
                method: 'POST',
                body: JSON.stringify({
                    requests: [{
                        deleteDimension: {
                            range: {
                                sheetId,
                                dimension: 'ROWS',
                                startIndex: rowIndex,
                                endIndex: rowIndex + 1
                            }
                        }
                    }]
                })
            });
        }
    },

    async updateCurrency(currency: string): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        const configData = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Settings!A:B`);
        const rows = configData.values || [];
        const rowIndex = rows.findIndex((r: any) => r[0] === 'Currency');

        if (rowIndex !== -1) {
            const range = `Settings!B${rowIndex + 1}`;
            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`, {
                method: 'PUT',
                body: JSON.stringify({
                    values: [[currency]]
                })
            });
        } else {
            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Settings!A1:append?valueInputOption=RAW`, {
                method: 'POST',
                body: JSON.stringify({
                    values: [["Currency", currency]]
                })
            });
        }
    },

    async addUnit(name: string): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Units!A1:append?valueInputOption=RAW`, {
            method: 'POST',
            body: JSON.stringify({ values: [[name]] })
        });
    },

    async removeUnit(name: string): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        const data = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Units!A:A`);
        const rows = data.values || [];
        const rowIndex = rows.findIndex((r: any) => r[0] === name);

        if (rowIndex !== -1) {
            const sheetInfo = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties)`);
            const sheetId = sheetInfo.sheets.find((s: any) => s.properties.title === 'Units').properties.sheetId;

            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
                method: 'POST',
                body: JSON.stringify({
                    requests: [{
                        deleteDimension: {
                            range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 }
                        }
                    }]
                })
            });
        }
    },

    async addStatus(name: string, color: string = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Statuses!A1:append?valueInputOption=RAW`, {
            method: 'POST',
            body: JSON.stringify({ values: [[name, color]] })
        });
    },

    async removeStatus(name: string): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        const data = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Statuses!A:A`);
        const rows = data.values || [];
        const rowIndex = rows.findIndex((r: any) => r[0] === name);

        if (rowIndex !== -1) {
            const sheetInfo = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties)`);
            const sheetId = sheetInfo.sheets.find((s: any) => s.properties.title === 'Statuses').properties.sheetId;

            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
                method: 'POST',
                body: JSON.stringify({
                    requests: [{
                        deleteDimension: {
                            range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 }
                        }
                    }]
                })
            });
        }
    }
};
