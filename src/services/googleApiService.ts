import type { InventoryItem, ShoppingListItem, ShopEvent, PurchasedItem, Household } from '../types';

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

            const sheets = ["Inventory", "ShoppingList", "ShopEvents", "PurchasedItems", "Categories", "Shops", "Members", "Units", "Statuses", "Settings"];
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
                { range: "Inventory!A1", values: [["ItemName", "Category", "CurrentQty", "Unit", "Threshold", "Status", "ExpiryDate", "AddedDate", "RestockedDate", "UseNowDaysPrior"]] },
                { range: "ShoppingList!A1", values: [["ItemName", "QtyNeeded", "Priority"]] },
                { range: "ShopEvents!A1", values: [["EventID", "Date", "ShopSource", "TotalAmount", "Buyer", "EntryType"]] },
                { range: "PurchasedItems!A1", values: [["EventID", "ItemName", "QtyBought", "PricePerUnit"]] },
                { range: "Categories!A1", values: [["Name", "Color"], ["Grocery", "#10b981"], ["Medical", "#ef4444"], ["Electronics", "#3b82f6"], ["Household", "#f59e0b"], ["Personal", "#8b5cf6"]] },
                { range: "Shops!A1", values: [["Name", "Color"], ["Amazon", "#f97316"], ["Blinkit", "#facc15"], ["Instamart", "#fb923c"], ["BigBasket", "#84cc16"]] },
                { range: "Members!A1", values: [["Email", "Color", "Name", "Picture", "PreferredCurrency", "IsOwner"]] },
                { range: "Units!A1", values: [["Name"], ["Kilos"], ["Liters"], ["Grams"], ["Numbers"], ["Packets"]] },
                { range: "Statuses!A1", values: [["Name", "Color"], ["Stocked", "#10b981"], ["Expired", "#a855f7"], ["Low", "#ef4444"], ["Out of stock", "#6b7280"], ["Use now", "#f59e0b"]] },
                { range: "Settings!A1", values: [["Key", "Value"]] }
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
                    values: [[userInfo.email, "#3b82f6", userInfo.name, userInfo.picture || '', "INR_India", "TRUE"]]
                })
            });

            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Settings!A2:append?valueInputOption=RAW`, {
                method: 'POST',
                body: JSON.stringify({
                    values: [["Currency", "INR_India"]]
                })
            });

            // 4. Add Data Validations (Dropdowns)
            const ssFinalUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
            const ssFinal = await googleFetch(ssFinalUrl);
            const getSheetId = (title: string) => ssFinal.sheets.find((s: any) => s.properties.title === title)?.properties?.sheetId;

            const inventorySheetId = getSheetId('Inventory');
            const shopEventsSheetId = getSheetId('ShopEvents');

            const validationRequests = [];

            if (inventorySheetId !== undefined) {
                // Category (Col B, index 1)
                validationRequests.push({
                    setDataValidation: {
                        range: { sheetId: inventorySheetId, startRowIndex: 1, startColumnIndex: 1, endColumnIndex: 2 },
                        rule: { condition: { type: 'ONE_OF_RANGE', values: [{ userEnteredValue: '=Categories!$A$2:$A' }] }, showCustomUi: true, strict: true }
                    }
                });
                // Unit (Col D, index 3)
                validationRequests.push({
                    setDataValidation: {
                        range: { sheetId: inventorySheetId, startRowIndex: 1, startColumnIndex: 3, endColumnIndex: 4 },
                        rule: { condition: { type: 'ONE_OF_RANGE', values: [{ userEnteredValue: '=Units!$A$2:$A' }] }, showCustomUi: true, strict: true }
                    }
                });
                // Status (Col F, index 5)
                validationRequests.push({
                    setDataValidation: {
                        range: { sheetId: inventorySheetId, startRowIndex: 1, startColumnIndex: 5, endColumnIndex: 6 },
                        rule: { condition: { type: 'ONE_OF_RANGE', values: [{ userEnteredValue: '=Statuses!$A$2:$A' }] }, showCustomUi: true, strict: true }
                    }
                });
            }

            if (shopEventsSheetId !== undefined) {
                // ShopSource (Col C, index 2)
                validationRequests.push({
                    setDataValidation: {
                        range: { sheetId: shopEventsSheetId, startRowIndex: 1, startColumnIndex: 2, endColumnIndex: 3 },
                        rule: { condition: { type: 'ONE_OF_RANGE', values: [{ userEnteredValue: '=Shops!$A$2:$A' }] }, showCustomUi: true, strict: true }
                    }
                });
                // Buyer (Col E, index 4)
                validationRequests.push({
                    setDataValidation: {
                        range: { sheetId: shopEventsSheetId, startRowIndex: 1, startColumnIndex: 4, endColumnIndex: 5 },
                        rule: { condition: { type: 'ONE_OF_RANGE', values: [{ userEnteredValue: '=Members!$A$2:$A' }] }, showCustomUi: true, strict: true }
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
    async getInventory(): Promise<InventoryItem[]> {
        const data = await this.getTableData('Inventory');
        return data.map(item => ({
            ...item,
            currentQty: Number(item.currentQty),
            threshold: Number(item.threshold),
            useNowDaysPrior: item.useNowDaysPrior ? Number(item.useNowDaysPrior) : 1,
            expiryDate: item.expiryDate || ''
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

    /**
     * CRUD Operations
     */
    async updateInventoryItem(item: Partial<InventoryItem>): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        // 1. Find the row index
        const data = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Inventory!A:A`);
        const rows = data.values || [];
        const rowIndex = rows.findIndex((r: any) => r[0] === item.itemName);

        if (rowIndex === -1) {
            // Append new
            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Inventory!A1:append?valueInputOption=RAW`, {
                method: 'POST',
                body: JSON.stringify({
                    values: [[item.itemName, item.category, item.currentQty, item.unit, item.threshold, item.status, item.expiryDate || '', item.addedDate || '', item.restockedDate || '', item.useNowDaysPrior ?? 1]]
                })
            });
        } else {
            // Update existing (Sheet row is 1-indexed)
            const range = `Inventory!A${rowIndex + 1}:J${rowIndex + 1}`;
            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`, {
                method: 'PUT',
                body: JSON.stringify({
                    values: [[item.itemName, item.category, item.currentQty, item.unit, item.threshold, item.status, item.expiryDate || '', item.addedDate || '', item.restockedDate || '', item.useNowDaysPrior ?? 1]]
                })
            });
        }
    },

    async addShoppingItem(item: ShoppingListItem): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/ShoppingList!A1:append?valueInputOption=RAW`, {
            method: 'POST',
            body: JSON.stringify({
                values: [[item.itemName, item.qtyNeeded, item.priority]]
            })
        });
    },

    async updateShoppingItem(itemName: string, qtyNeeded: number): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        const data = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/ShoppingList!A:A`);
        const rows = data.values || [];
        const rowIndex = rows.findIndex((r: any) => r[0] === itemName);

        if (rowIndex !== -1) {
            const range = `ShoppingList!B${rowIndex + 1}`;
            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`, {
                method: 'PUT',
                body: JSON.stringify({
                    values: [[qtyNeeded]]
                })
            });
        }
    },

    async removeShoppingItem(itemName: string): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        // Note: Sheets API doesn't have a direct "delete row by value". 
        // We have to find the index and then send a batchUpdate to delete the dimension.
        const data = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/ShoppingList!A:A`);
        const rows = data.values || [];
        const rowIndex = rows.findIndex((r: any) => r[0] === itemName);

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

    async logPurchase(event: ShopEvent, items: PurchasedItem[]): Promise<void> {
        const spreadsheetId = localStorage.getItem('activeHouseholdId');
        if (!spreadsheetId) return;

        // 1. Log Event
        await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/ShopEvents!A1:append?valueInputOption=RAW`, {
            method: 'POST',
            body: JSON.stringify({
                values: [[event.eventId, event.date, event.shopSource, event.totalAmount, event.buyer, event.entryType]]
            })
        });

        // 2. Log Items
        if (items.length > 0) {
            await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/PurchasedItems!A1:append?valueInputOption=RAW`, {
                method: 'POST',
                body: JSON.stringify({
                    values: items.map(i => [i.eventId, i.itemName, i.qtyBought, i.pricePerUnit])
                })
            });
        }

        // 3. Update Inventory (Deduct quantities)
        for (const item of items) {
            const invData = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Inventory!A:C`);
            const invRows = invData.values || [];
            const rowIndex = invRows.findIndex((r: any) => r[0] === item.itemName);

            if (rowIndex !== -1) {
                const currentQty = Number(invRows[rowIndex][2] || 0);
                const newQty = currentQty + Number(item.qtyBought);
                await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Inventory!C${rowIndex + 1}?valueInputOption=RAW`, {
                    method: 'PUT',
                    body: JSON.stringify({ values: [[newQty]] })
                });
            }
        }
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
