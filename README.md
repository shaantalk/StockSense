# StockSense

## 1. Project Overview
**StockSense** is a lightweight, serverless web application designed to manage household inventory, streamline grocery shopping, and track expenses. It uses **Google Sheets** as a persistent database and **GitHub Pages** for hosting.

* **Primary Users:** Santanu and Pallavi (with multi-user support for families).
* **Core Value:** Seamlessly bridge the gap between "running out of milk" and "logging the expense of buying it."

---

## 2. Technical Stack
- **Frontend:** React (Vite) / Tailwind CSS.
- **Hosting:** GitHub Pages (Static Hosting).
- **Backend/API:** Direct connection to Google Drive V3 and Google Sheets V4 APIs.
- **Database:** Google Sheets.
- **Authentication:** Google Identity Services (OAuth 2.0).

---

## 3. Key Features

### 3.1 Inventory Management
- **Dashboard:** Display current stock levels across categories and active statuses.
- **Multiple Units:** Tracks inventory using granular units: `Kilos`, `Liters`, `ML`, `Grams`, `Numbers`, `Packets`, `Pieces`, `Bottles`, `Boxes`, `Cans`, `Pounds`, `Ounces`, `Gallons`, `Dozen`.
- **Step Quantity:** Items can define a minimum "Step Qty" (e.g. 500 for a 500ml milk packet) which determines how much is added to the shopping list at once.
- **Status Tracking & Automation:**
  - Standard Statuses: `Stocked`, `Expired`, `Low`, `Out of stock`, `Use now`.
  - **Auto 'Use Now':** Items automatically transition to "Use now" status when their expiry date approaches (configured per item).
  - Statuses can be dynamically changed through an action menu on the item card.
- **Wastage Tracking:** Expired items that are marked as out of stock are automatically logged to a `WastageEvents` sheet to track lost inventory over time.
- **Item Notes & Metadata:** Tracks added dates, restock dates, and custom textual notes for every item.

### 3.2 Shopping List & "Checkout" Flow
- **Wish List:** A centralized view of all items flagged for purchase. When items run out in inventory, they are automatically added here.
- **Wish List Editing:** Users can edit the desired quantity of items in their wish list directly, view specific item details via a modal, or remove items altogether.
- **Selective Shopping:** Users can select a subset of items from the list to mark as "Bought".
- **Purchase Logging:** When items are bought, the user provides:
    - **Store Destination:** (e.g. Amazon, Blinkit, Local Shop).
    - **Buyer:** Which family member made the purchase.
    - **Total Bill Amount:** With automatic currency conversion matching if members prefer different default currencies.
- **Post-Purchase Logic:** Upon submission, the app automatically:
    1. Updates `currentQty` back in the Inventory.
    2. Removes the bought items from the Wish List.
    3. Logs the purchase event in the `ShopEvents` and `PurchasedItems` sheets.

### 3.3 Multi-User & Family Logic
- **Onboarding:** First-time users are prompted for a **Household Name**. The app creates a new sheet named `{HouseholdName}_household_expenses`.
- **Sharing & Auto-Discovery:** Google Drive is searched upon login for spreadsheets matching the suffix to seamlessly load family data.
- **Multi-Currency:** Individual family members can customize their preferred currency. The app fetches real-time exchange rates to auto-convert purchases to the household's base currency.

---

## 4. Data Schema (Google Sheets)
StockSense automatically generates and manages these sheets upon initialization:

- **`Inventory`**: `ItemName`, `Category`, `CurrentQty`, `Unit`, `Threshold`, `Status`, `ExpiryDate`, `AddedDate`, `RestockedDate`, `UseNowDaysPrior`, `StepQty`, `Notes`
- **`ShoppingList`**: `ItemName`, `QtyNeeded`, `Priority`
- **`ShopEvents`**: `EventID`, `Date`, `ShopSource`, `TotalAmount`, `Buyer`, `EntryType`
- **`PurchasedItems`**: `EventID`, `ItemName`, `QtyBought`, `PricePerUnit`
- **`WastageEvents`**: `EventID`, `Date`, `ItemName`, `QtyWasted`, `Reason`
- **`Categories`**: Dynamic list of categories with associated hex colors.
- **`Shops`**: Dynamic list of shops with associated hex colors.
- **`Members`**: Dynamic list of household members, their preferred currency, and permissions.
- **`Units`**: Dynamic list of available size descriptions.
- **`Statuses`**: Dynamic list of item statuses and colors.
- **`Settings`**: Key/Value pairs for household configuration (e.g. default currency).

---

## 5. Security & Privacy Statement
**Privacy Statement:** StockSense is committed to your privacy. As a completely serverless application, **we do not collect, store, or share any of your personal data.** 
- All inventory, shopping, and expense data is routed directly from your browser to your personal Google Drive. 
- You retain completely exclusive ownership and control over your data.
- **Client-Side Auth:** Users authenticate directly with Google. No passwords or tokens are stored on any external servers.
- **Scoped Access:** The application requests the minimum required permissions necessary to read and edit the spreadsheets it creates.

---

## 6. UI/UX Goals
- **Mobile First:** Designed with a sleek, intuitive interface for quick, frictionless use while in the kitchen or at the store.
- **Configurable Dynamics:** All specific dropdowns (Shops, Members, Categories, Units, Statuses) fetch their data dynamically from your household's `Settings` and corresponding data sheets so you can customize the experience without any code changes.
- **Animated & Responsive:** Built with Framer Motion and Tailwind to ensure smooth transitions, optimistic UI updates, and an app-like feel.

---

## 7. How to Host Your Own StockSense
Since StockSense is a completely static frontend that directly connects to Google APIs from the client side, you can host your own instance entirely for free using GitHub Pages.

### Step 1: Fork and Clone
1. Fork this repository to your own GitHub account.
2. Clone your forked repository to your local machine:
   ```bash
   git clone https://github.com/YOUR_USERNAME/StockSense.git
   cd StockSense
   ```

### Step 2: Set Up Google Cloud OAuth Credentials
To read and write to your Google Drive/Sheets, you need to create a Google Cloud Project to obtain an OAuth Client ID:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new Google Cloud Project.
3. In the project dashboard, navigate to **APIs & Services > Library** and enable the **Google Drive API** and **Google Sheets API**.
4. Go to **APIs & Services > OAuth consent screen**, select **External**, and fill out the basic application details (App name, Support email, Developer contact). Add your own email as a Test user.
5. Go to **APIs & Services > Credentials** and click **Create Credentials > OAuth client ID**.
6. Select **Web application**. Focus on "Authorized JavaScript origins":
   - For local development, add: `http://localhost:5177` (or whichever port Vite runs on).
   - For production, add your GitHub Pages URL: `https://YOUR_USERNAME.github.io`
7. Click "Create" and copy your **Client ID**.

### Step 3: Configure Your Client ID
1. In the root of your cloned repository, create a `.env` file (or rename `.env.example` if it exists).
2. Add your Google Client ID to the file:
   ```env
   VITE_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   ```

### Step 4: Build and Deploy to GitHub Pages
If using the existing deployment script (verify `package.json` has `gh-pages` and a `deploy` script):
1. Install dependencies: `npm install`
2. Run the deployment script: `npm run deploy`
   *(This will run `npm run build` and then push the `dist/` folder to your `gh-pages` branch).*
3. On GitHub, go to your repository's **Settings > Pages**.
4. Set the **Source** to "Deploy from a branch", pick the `gh-pages` branch, and click Save.
5. Once the GitHub Action finishes, your personally hosted StockSense will be live at `https://YOUR_USERNAME.github.io/StockSense`!
