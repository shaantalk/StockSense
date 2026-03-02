# StockSense Database Schema

This document outlines the Google Sheets database schema for the StockSense application. The application programmatically manages these tabs within a single spreadsheet.

## 1. Catalog & Inventory Engine
Separates the concept of an item (master catalog) from the physical batches purchased, enabling distinct logic for mixed vs. separate stocks.

| Sheet / Tab Name       | Columns                                                                                                   | Description & Rules                                                                                             |
| :--------------------- | :-------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------- |
| **`Items`**            | `ItemID`, `ItemName`, `Category`, `StockType`, `Unit`, `Threshold`, `UseNowDaysPrior`, `StepQty`, `Notes` | **Master Catalog.** `StockType` must be `MIXED` or `SEPARATE`. `Threshold` triggers auto-add to `ShoppingList`. |
| **`InventoryBatches`** | `BatchID`, `ItemID`, `QtyAdded`, `QtyRemaining`, `PricePerUnit`, `ExpiryDate`, `AddedDate`, `Status`      | **Physical Stock.** `Status` can be `STOCKED`, `EXPIRED`, `USE_NOW`, or `CONSUMED`.                             |

## 2. Shopping & Checkout Flow
Manages the wishlist, checkout events, and links purchases to new inventory batches.

| Sheet / Tab Name       | Columns                                                                   | Description & Rules                                                                                        |
| :--------------------- | :------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------- |
| **`ShoppingList`**     | `ListID`, `ItemID`, `QtyNeeded`, `Priority`, `AddedDate`                  | **The Wishlist.** Automatically populated when an item's total `QtyRemaining` drops below its `Threshold`. |
| **`ShopEvents`**       | `EventID`, `Date`, `ShopSource`, `TotalAmount`, `Buyer`, `EventType`      | **The Receipt.** `EventType` tracks `NORMAL` or `OVER_BUYING`.                                             |
| **`PurchasedBatches`** | `EventID`, `BatchID`, `ItemID`, `QtyBought`, `PricePerUnit`, `TotalPrice` | **The Line Items.** Links the overarching `ShopEvent` to the new `BatchID` created in `InventoryBatches`.  |

## 3. Tracking (Consumption & Wastage)
Logs events to generate accurate, real-time dashboard analytics without heavy backend processing.

| Sheet / Tab Name    | Columns                                                                    | Description & Rules                                                                                                 |
| :------------------ | :------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| **`ConsumeEvents`** | `EventID`, `Date`, `ItemID`, `BatchID`, `QtyConsumed`, `Consumer`          | Logs normal usage. If item `StockType` is `MIXED`, `BatchID` is left blank.                                         |
| **`WastageEvents`** | `EventID`, `Date`, `ItemID`, `BatchID`, `QtyWasted`, `ValueLost`, `Reason` | `ValueLost` is calculated by the app *before* writing the row (Moving average for Mixed, Exact price for Separate). |

## 4. Financial Tracking & Goals
Manages non-inventory expenses, EMIs, and overarching goals.

| Sheet / Tab Name        | Columns                                                                                                                     | Description & Rules                                                                    |
| :---------------------- | :-------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------- |
| **`Goals`**             | `GoalID`, `GoalName`, `TargetAmount`, `Status`, `SpendRatios`                                                               | e.g., "Trip to Europe". `SpendRatios` stores JSON like `{"MemberA": 1, "MemberB": 1}`. |
| **`OneTimeExpenses`**   | `ExpenseID`, `Date`, `Category`, `Amount`, `Spender`, `GoalID`                                                              | e.g., Movie tickets, Date Night. `GoalID` is optional.                                 |
| **`RecurringExpenses`** | `EMI_ID`, `GoalID`, `ExpenseName`, `Amount`, `Frequency`, `InterestType`, `InterestRate`, `StartDate`, `EndDate`, `DueDate` | Defines the EMI rules. `InterestType` = `NO_COST` or `INTEREST`.                       |
| **`EMIPayments`**       | `PaymentID`, `EMI_ID`, `DatePaid`, `AmountPaid`, `LateFee`, `Status`                                                        | The actual log of the monthly deductions/payments.                                     |

## 5. Configurations (Lookup Tables)
Acts as dynamic dropdowns for the frontend UI.

| Sheet / Tab Name | Columns                                                                                              | Description & Rules                                                                    |
| :--------------- | :--------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------- |
| **`Categories`** | `CategoryID`, `Name`, `Color`, `Type`                                                                | `Type` differentiates between `INVENTORY` (Groceries) vs `EXPENSE` (Bike Maintenance). |
| **`Shops`**      | `ShopID`, `Name`, `Color`                                                                            | e.g., Amazon, Blinkit, Local.                                                          |
| **`Members`**    | `MemberID`, `Email`, `Name`, `Color`, `Picture`, `PreferredCurrency`, `IsOwner`, `DefaultSpendRatio` | Household members. `DefaultSpendRatio` controls baseline splitting logic.              |
| **`Units`**      | `UnitID`, `Name`                                                                                     | e.g., Kilos, Liters, Packets, Pieces.                                                  |
| **`Statuses`**   | `StatusID`, `Name`, `Color`                                                                          | User-defined stock statuses.                                                           |
| **`Settings`**   | `Key`, `Value`                                                                                       | Key/Value pairs for global app settings.                                               |