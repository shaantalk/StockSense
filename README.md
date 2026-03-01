# StockSense

## 1. Project Overview
**StockSense** is a lightweight, serverless web application designed to manage household inventory, streamline grocery shopping, and track expenses. It uses **Google Sheets** as a persistent database and **GitHub Pages** for hosting.

* **Primary Users:** Santanu and Pallavi (with multi-user support for families).
* **Core Value:** Seamlessly bridge the gap between "running out of milk" and "logging the expense of buying it."

---

## 2. Technical Stack
- **Frontend:** React (Vite) / Tailwind CSS.
- **Hosting:** GitHub Pages (Static Hosting).
- **Backend/API:** Google Apps Script (GAS) deployed as a Web App.
- **Database:** Google Sheets.
- **Authentication:** Google Identity Services (OAuth 2.0).

---

## 3. Functional Requirements

### 3.1 Inventory Management
- **Dashboard:** Display current stock levels across categories (Fridge, Pantry, Masalas).
- **Unit Support:** Support for multiple units: `Kilos`, `Liters`, `Grams`, `Numbers`, `Packets`.
- **Threshold Monitoring:** Items must have a `Threshold` value. If `CurrentQty` < `Threshold`, the item is flagged as "Low Stock."
- **The "Near Finish" Button:** A single-click action on any inventory item that:
    1. Sets status to "Near Finish."
    2. Automatically adds the item to the **Shopping List**.

### 3.2 Shopping List & "Checkout" Flow
- **Shopping List:** A view of all items flagged for purchase.
- **Selective Shopping:** Users can select a subset of items from the list to mark as "Bought."
- **Purchase Logging (The Trip):** When items are bought, the user must provide:
    - **Shop Destination:** (e.g., Amazon, Swiggy Instamart, Blinkit, Local Shop).
    - **Buyer:** (e.g., Santanu or Pallavi).
    - **Entry Type (Flexibility):**
        - *Summary Mode:* Enter a single "Total Bill Amount" for the whole trip.
        - *Itemized Mode:* Enter specific prices for each item to track price trends.
- **Post-Purchase Logic:** Upon submission, the app must:
    1. Update `CurrentQty` in the Inventory.
    2. Remove items from the Shopping List.
    3. Log the event in the `ShopEvents` and `PurchasedItems` sheets.

### 3.3 Multi-User & Family Logic
- **Onboarding:** - First-time users are prompted for a **Family Name**.
    - The app creates a new sheet named `{FamilyName}_family_expenses` via GAS.
- **Sharing:**
    - A "Settings" menu allows adding a member via email.
    - Uses Google Drive API to grant "Editor" access to the new member.
- **Auto-Discovery:** Upon login, the app searches the user's Google Drive for any sheet matching the naming convention `*_family_expenses`.

---

## 4. Data Schema (Google Sheets)

### Tab 1: `Inventory`
| Column | Type | Description |
| :--- | :--- | :--- |
| ItemName | String | Unique identifier for the item |
| Category | String | e.g., Dairy, Veggies, Spices |
| CurrentQty | Number | Current stock level |
| Unit | String | Liters, Kilos, Numbers, etc. |
| Threshold | Number | Min level before "Near Finish" |
| Status | String | Normal, Near Finish |

### Tab 2: `ShoppingList`
| Column | Type | Description |
| :--- | :--- | :--- |
| ItemName | String | Links to Inventory |
| QtyNeeded | Number | Amount to buy |
| Priority | String | Low, Medium, High |

### Tab 3: `ShopEvents` (Expense Tracker)
| Column | Type | Description |
| :--- | :--- | :--- |
| EventID | String | Unique ID for the trip |
| Date | Date | Date of purchase |
| ShopSource | String | From Config (Blinkit, Amazon, etc.) |
| TotalAmount | Number | Final bill amount |
| Buyer | String | From Config (Santanu, Pallavi) |
| EntryType | String | Summary or Itemized |

### Tab 4: `PurchasedItems`
| Column | Type | Description |
| :--- | :--- | :--- |
| EventID | String | Links to ShopEvents |
| ItemName | String | Item bought |
| QtyBought | Number | Quantity |
| PricePerUnit | Number | Cost per unit |

### Tab 5: `Config`
| Column | Value |
| :--- | :--- |
| Shop | Amazon |
| Shop | Blinkit |
| Member | Santanu |
| Member | Pallavi |

---

## 5. Security & Privacy
- **Client-Side Auth:** Users authenticate via Google. No passwords are stored.
- **Scoped Access:** The app only requests access to the specific spreadsheets it creates or those shared with the user.
- **No Shared Backend:** Since it's a static site, no user data is stored on GitHub or external servers; it lives entirely within the user's own Google Drive.

---

## 6. UI/UX Goals
- **Mobile First:** Designed for quick use while in the kitchen or at the store.
- **Configurable:** All dropdowns must fetch data from the `Config` tab so the user can edit their shops/members without a code change.
