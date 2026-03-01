/**
 * StockSense Backend (Google Apps Script)
 * Deploy as Web App with "Execute as Me" and "Access: Anyone with Google Account"
 */

const SPREADSHEET_NAME_SUFFIX = "_family_expenses";

/**
 * Main entry point for GET requests
 */
function doGet(e) {
  const action = e.parameter.action;
  const userEmail = Session.getActiveUser().getEmail();
  
  try {
    const ss = getOrCreateSpreadsheet(userEmail);
    
    if (action === "getInventory") {
      return jsonResponse(getTableData(ss, "Inventory"));
    } else if (action === "getShoppingList") {
      return jsonResponse(getTableData(ss, "ShoppingList"));
    } else if (action === "getConfig") {
      return jsonResponse(getConfigData(ss));
    } else if (action === "getShopEvents") {
      return jsonResponse(getTableData(ss, "ShopEvents"));
    }
    
    return jsonResponse({ status: "success", message: "Connected to StockSense" });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

/**
 * Main entry point for POST requests
 */
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  const userEmail = Session.getActiveUser().getEmail();
  
  try {
    const ss = getOrCreateSpreadsheet(userEmail);
    
    if (action === "setNearFinish") {
      setNearFinish(ss, data.itemName);
      return jsonResponse({ status: "success" });
    } else if (action === "logPurchase") {
      logPurchase(ss, data.event, data.items);
      return jsonResponse({ status: "success" });
    }
    
    return jsonResponse({ status: "error", message: "Unknown action" });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

/**
 * Spreadsheet Logic
 */
function getOrCreateSpreadsheet(email) {
  const files = DriveApp.getFilesByName(email.split('@')[0] + SPREADSHEET_NAME_SUFFIX);
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  }
  
  // Create new if not found
  const ss = SpreadsheetApp.create(email.split('@')[0] + SPREADSHEET_NAME_SUFFIX);
  setupSheets(ss);
  return ss;
}

function setupSheets(ss) {
  const sheets = {
    "Inventory": ["ItemName", "Category", "CurrentQty", "Unit", "Threshold", "Status"],
    "ShoppingList": ["ItemName", "QtyNeeded", "Priority"],
    "ShopEvents": ["EventID", "Date", "ShopSource", "TotalAmount", "Buyer", "EntryType"],
    "PurchasedItems": ["EventID", "ItemName", "QtyBought", "PricePerUnit"],
    "Config": ["Type", "Value"]
  };
  
  for (let name in sheets) {
    let sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    sheet.clear();
    sheet.appendRow(sheets[name]);
  }
  
  // Default config
  const configSheet = ss.getSheetByName("Config");
  configSheet.appendRow(["Shop", "Amazon"]);
  configSheet.appendRow(["Shop", "Blinkit"]);
  configSheet.appendRow(["Member", "Santanu"]);
  configSheet.appendRow(["Member", "Pallavi"]);
}

function getTableData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h.charAt(0).toLowerCase() + h.slice(1)] = row[i]);
    return obj;
  });
}

function setNearFinish(ss, itemName) {
  const invSheet = ss.getSheetByName("Inventory");
  const shopSheet = ss.getSheetByName("ShoppingList");
  
  // Update Inventory status
  const data = invSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === itemName) {
      invSheet.getRange(i + 1, 6).setValue("Near Finish");
      break;
    }
  }
  
  // Add to Shopping List if not exists
  const shopData = shopSheet.getDataRange().getValues();
  const exists = shopData.some(row => row[0] === itemName);
  if (!exists) {
    shopSheet.appendRow([itemName, 1, "Medium"]);
  }
}

function logPurchase(ss, event, items) {
  const eventsSheet = ss.getSheetByName("ShopEvents");
  const itemsSheet = ss.getSheetByName("PurchasedItems");
  const invSheet = ss.getSheetByName("Inventory");
  const shopSheet = ss.getSheetByName("ShoppingList");
  
  // Log Event
  eventsSheet.appendRow([event.eventId, event.date, event.shopSource, event.totalAmount, event.buyer, event.entryType]);
  
  // Log Items & Update Inventory
  const invData = invSheet.getDataRange().getValues();
  items.forEach(item => {
    itemsSheet.appendRow([item.eventId, item.itemName, item.qtyBought, item.pricePerUnit]);
    
    // Update inventory qty
    for (let i = 1; i < invData.length; i++) {
      if (invData[i][0] === item.itemName) {
        const newQty = (invData[i][2] || 0) + item.qtyBought;
        const threshold = invData[i][4] || 0;
        invSheet.getRange(i + 1, 3).setValue(newQty);
        invSheet.getRange(i + 1, 6).setValue(newQty >= threshold ? "Normal" : "Near Finish");
        break;
      }
    }
    
    // Remove from shopping list
    const shopData = shopSheet.getDataRange().getValues();
    for (let i = shopData.length - 1; i >= 1; i--) {
      if (shopData[i][0] === item.itemName) {
        shopSheet.deleteRow(i + 1);
      }
    }
  });
}

function getConfigData(ss) {
  const sheet = ss.getSheetByName("Config");
  const data = sheet.getDataRange().getValues().slice(1);
  const userEmail = Session.getActiveUser().getEmail() || "Guest@ecosystem.com";
  
  // Extract name from email or use first part
  let name = userEmail.split('@')[0];
  name = name.charAt(0).toUpperCase() + name.slice(1).replace(/[._-]/g, ' ');

  return {
    shops: data.filter(r => r[0] === "Shop").map(r => r[1]),
    members: data.filter(r => r[0] === "Member").map(r => r[1]),
    currentUser: {
      email: userEmail,
      name: name
    }
  };
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
