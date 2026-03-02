# Software Requirements Specification (SRS): StockSense

## 1. Project Overview
**StockSense** is a serverless, React-based web application (Progressive Web App) designed to manage household inventory, streamline grocery shopping, and track comprehensive household expenses. It leverages Google Sheets as a persistent database via the Google Drive and Sheets APIs, allowing for zero-cost hosting and full data ownership.

---

## 2. Core Business Requirements (The 18 Goals)
The application must fulfill the following functional requirements:

1. **Master Item Catalog:** Maintain a central list of items that the household consumes.
2. **Real-Time Inventory:** Track current physical stocks available in the household inventory.
3. **Dynamic Statuses:** Support tagging item statuses (e.g., Stocked, Expired, Use Now) alongside user-generated custom statuses.
4. **Automated Wishlist:** Maintain a wishlist where items can be manually added/removed, tracking the exact quantity needed.
5. **Flexible Checkout:** Allow users to execute a "Shop Event" to buy all items on the wishlist or just a selected subset.
6. **Advanced Wastage Management (Mixed vs. Separate):** Track expired/wasted items and their lost financial value. Crucially, support two item types:
   * *Mixed (e.g., Milk):* Stocks get physically mixed. Wastage value is calculated using the moving average price of the current mixed inventory.
   * *Separate (e.g., Maggi):* Stocks remain in distinct packets. Only the specific expired packet's actual purchase price is added to the wastage value.
7. **Intelligent Shopping Events (Over/Under Buying):** During a shopping event, users can tweak bought quantities. If buying less than needed, the remainder stays on the wishlist. If buying more (Over-Buying Event), it is logged accordingly.
8. **One-Time Expense Tracking:** Track non-inventory, one-time expenses (e.g., Movies, Dates, Bike Maintenance) with customizable categories.
9. **Recurring Expenses & EMIs:** Track recurring expenses tied to specific goals (e.g., EMI for a TV). Capture amount, frequency, interest type (No Cost / Interest), rate, and duration. Alert users when due dates approach and track late fees and payment events.
10. **Goal-Based Finance Tracking:** Extend goals to cover broader events (e.g., "Trip to Europe"). Allow both one-time expenses (flight tickets) and EMIs (hotel bookings) to be tagged to a specific Goal for later breakdown reporting.
11. **Multi-Member Spend Ratios:** By default, goals include all household members equally (e.g., Member A-1, Member C-1). Store this ratio data for future analytical use.
12. **Household Data Aggregation:** Store household-level spend ratios and configurations for future multi-tenant capabilities.
13. **Consumption Logging:** Users must be able to deduct/consume from the stock of an item, reducing the inventory count (Consume Event).
14. **Batch-Level Control:** For "Separate" items, users can view total stock and individual stock-ups (batches). They can consume the entire total at once, or mark specific batches as consumed.
15. **Comprehensive Real-Time Dashboard:** Provide real-time charts/tiles for: per-category monthly spend, per-member monthly spend, total monthly spend, wastage amount/item/category per month, and yearly spends on categories like travel or entertainment. Data is fetched, prepared, and plotted on the fly with loading skeletons.
16. **Spending Insights & Recommendations:** Generate actionable insights to help the household understand where money is going and how to save.
17. **Architecture Priority:** Prioritize smooth Inventory Management first, Expense Management second, followed by Wastage Management and Insights.
18. **Continuous UX Improvement:** Ensure the core loop (updating inventory/consumption) is as frictionless as possible.

---

## 3. UX, Performance & Technical Specifications

To ensure the app is practically usable in high-friction environments (like kitchens and supermarkets), the following must be implemented:

* **One-Tap Quick Actions (The "Kitchen UI"):** On the main dashboard, every item card MUST have immediate `+1` and `-1` (or `+StepQty`) buttons. Do not hide the basic `CONSUME_EVENT` behind a modal or a three-dot menu.
* **Aggressive Optimistic Updates:** Use tools like React Query or Zustand. When a stock level is updated, instantly update the local React state and UI. Send the Google Sheets API `PATCH/POST` request in the background. If the request fails, show a toast notification and revert the UI state.
* **Request Batching (Debouncing):** If a user clicks `+1` three times rapidly, do not send three API requests. Debounce the action locally for ~2 seconds, sum the changes (+3), and send a single API payload to Google Sheets.
* **Progressive Web App (PWA):** * *Install to Home Screen:* Use `vite-plugin-pwa` to turn the React app into an installable mobile app, functioning exactly like a native app.
    * *Offline-First Capabilities:* Cache the core `InventoryBatches` and `Items` sheets locally using IndexedDB/Service Workers. The app must open instantly, even offline in a supermarket with bad reception. Queue `CONSUME` or `SHOPPING` events locally and sync them to Google Sheets the moment the device reconnects.
* **Consumption-Based Sorting:** Sort dashboard items by "Likelihood to be used/empty" or expiry date. If milk expires in 2 days, it floats to the top. Do not rely strictly on alphabetical sorting.
* **Remember Last Prices:** When logging a `SHOPPING_EVENT`, auto-populate the `PricePerUnit` field with the exact price paid the *last* time that specific item was bought.

---

## 4. Google Sheets Database Schema

// DATABASE.md

## 5. Step-by-Step Implementation Plan for AI Assistant

*Instructions for Antigravity AI: Do not attempt to build the entire application in one prompt. Follow this phased approach, ensuring each phase works before moving to the next.*

### Phase 1: Infrastructure & Auth (Foundation)
1. Initialize Vite + React + TypeScript + Tailwind CSS.
2. Integrate Google Identity Services (OAuth 2.0).
3. Build the Google Drive/Sheets API service layer.
4. Implement the script to programmatically create the `{HouseholdName}_household_expenses` spreadsheet and generate all required tabs/columns if it does not exist.

### Phase 2: State Management & Optimistic UI Core
1. Set up React Query (or Zustand).
2. Create standard hooks (`useFetchSheet`, `useAppendRow`, `useUpdateRow`).
3. Implement the debouncing logic wrapper for mutations.
4. Set up the basic layout shell (Navbar, Mobile Bottom Nav).

### Phase 3: Catalog & The "Kitchen UI" (Priority 1)
1. Build the `Items` master catalog view and creation form (forcing selection of Mixed vs. Separate).
2. Build the Inventory Dashboard fetching from `InventoryBatches`.
3. Implement the One-Tap Quick Actions (`+1` / `-1` buttons) directly on the item cards.
4. Wire up the Optimistic UI updates for these buttons using the debounced mutation hooks.

### Phase 4: Consumption & Wastage Engine
1. Implement the background FIFO logic: When a user clicks `-1` on a MIXED item, write logic to deduct from the oldest active `BatchID` in `InventoryBatches`.
2. Implement the `CONSUME_EVENT` logger.
3. Build the Wastage workflow. Write the mathematical utility that calculates `ValueLost` (moving average for mixed, exact price for separate) before appending to `WastageEvents`.

### Phase 5: Smart Shopping Flow
1. Build the `ShoppingList` view (auto-populated based on inventory thresholds).
2. Build the Checkout Modal/Flow.
3. Implement "Remember Last Prices" utility to pre-fill the checkout form.
4. Write the complex transaction logic: Insert `ShopEvents`, insert `PurchasedBatches`, create new `InventoryBatches`, and handle the Over/Under buying logic by updating or deleting `ShoppingList` rows.

### Phase 6: Financials, EMIs, & Goals
1. Build the Goals management UI.
2. Build the `OneTimeExpenses` entry form (with optional Goal tagging).
3. Build the `RecurringExpenses` (EMI) setup form.
4. Implement the EMI dashboard tracking, including the "Mark as Paid" action and due date notifications.

### Phase 7: PWA & Offline-First Resiliency
1. Install and configure `vite-plugin-pwa`.
2. Generate necessary manifest files and service workers for "Install to Home Screen" functionality.
3. Implement IndexedDB caching for `Items` and `InventoryBatches` so the dashboard loads instantly offline.
4. Set up a background sync queue for `ConsumeEvents` triggered while offline.

### Phase 8: Dashboard & Analytics

1. Integrate a charting library (e.g., Recharts).
2. Build the data-transformation utility functions that reduce the flat Google Sheets arrays into chartable metrics (monthly spend, per member, wastage ratio).
3. Build the UI tiles with loading skeletons, plugging in the React Query data.