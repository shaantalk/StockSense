/**
 * StockSense Backend (Google Apps Script)
 * Deploy as Web App with "Execute as Me" and "Access: Anyone"
 */

const FAMILY_SUFFIX = "_family_expenses";

/**
 * Main entry point for GET requests
 */
function doGet(e) {
  const action = e.parameter.action;
  const userEmail = e.parameter.userEmail || "Guest@ecosystem.com";
  const activeFamilyId = e.parameter.familyId;
  
  try {
    if (action === "getConfig") {
       return jsonResponse(getConfigData(userEmail, activeFamilyId));
    }

    if (!activeFamilyId) {
      throw new Error("Missing Family ID for this action");
    }

    const ss = SpreadsheetApp.openById(activeFamilyId);
    
    if (action === "getInventory") {
      return jsonResponse(getTableData(ss, "Inventory"));
    } else if (action === "getShoppingList") {
      return jsonResponse(getTableData(ss, "ShoppingList"));
    } else if (action === "getShopEvents") {
      return jsonResponse(getTableData(ss, "ShopEvents"));
    } else if (action === "getDashboardStats") {
      return jsonResponse(getDashboardStats(ss));
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
  const userEmail = data.userEmail || "Guest@ecosystem.com";
  const activeFamilyId = data.familyId;
  
  try {
    if (action === "createFamily") {
      const ss = createFamilySheet(userEmail, data.name);
      return jsonResponse({ status: "success", familyId: ss.getId() });
    }

    if (!activeFamilyId) {
      throw new Error("Missing Family ID for this action");
    }

    const ss = SpreadsheetApp.openById(activeFamilyId);
    
    if (action === "addMember") {
      return jsonResponse(addMember(ss, userEmail, data.email));
    } else if (action === "removeMember") {
      return jsonResponse(removeMember(ss, userEmail, data.email));
    } else if (action === "setNearFinish") {
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
 * Discovery & Config
 */
function getConfigData(userEmail, activeFamilyId) {
  const families = [];
  const files = DriveApp.searchFiles(`title contains '${FAMILY_SUFFIX}' and trashed = false`);
  
  while (files.hasNext()) {
    const file = files.next();
    const ownerEmail = file.getOwner().getEmail();
    families.push({
      id: file.getId(),
      name: file.getName().replace(FAMILY_SUFFIX, ""),
      role: ownerEmail === userEmail ? "Owner" : "Member"
    });
  }

  const result = {
    currentUser: {
      email: userEmail,
      name: userEmail.split('@')[0].charAt(0).toUpperCase() + userEmail.split('@')[0].slice(1).replace(/[._-]/g, ' ')
    },
    families: families,
    activeFamilyId: activeFamilyId || (families.length > 0 ? families[0].id : null),
    shops: [],
    members: []
  };

  if (result.activeFamilyId) {
    try {
        const ss = SpreadsheetApp.openById(result.activeFamilyId);
        const configData = getTableDataSimple(ss, "Config");
        result.shops = configData.filter(r => r.type === "Shop").map(r => r.value);
        result.members = configData.filter(r => r.type === "Member").map(r => r.value);
    } catch (e) {
        console.error("Failed to load active family config", e);
    }
  }

  return result;
}

/**
 * Family Management
 */
function createFamilySheet(userEmail, name) {
  const ss = SpreadsheetApp.create(name + FAMILY_SUFFIX);
  try {
    ss.addEditor(userEmail);
  } catch (e) {
    console.error("Failed to add creator as editor:", e);
  }
  setupSheets(ss, userEmail);
  return ss;
}

function addMember(ss, currentUserEmail, newMemberEmail) {
  const file = DriveApp.getFileById(ss.getId());
  if (file.getOwner().getEmail() !== currentUserEmail) {
    return { status: "error", message: "Only the family creator can add members." };
  }

  try {
    ss.addEditor(newMemberEmail);
  } catch (e) {
    return { status: "error", message: "Invalid email or sharing failed." };
  }

  const configSheet = ss.getSheetByName("Config");
  const data = configSheet.getDataRange().getValues();
  const alreadyExists = data.some(r => r[0] === "Member" && r[1] === newMemberEmail);
  
  if (!alreadyExists) {
    configSheet.appendRow(["Member", newMemberEmail]);
  }

  return { status: "success" };
}

function removeMember(ss, currentUserEmail, memberEmail) {
  // 1. Security check: Only owner can remove members
  const file = DriveApp.getFileById(ss.getId());
  if (file.getOwner().getEmail() !== currentUserEmail) {
    return { status: "error", message: "Only the family creator can remove members." };
  }

  // 2. Prevent removing self (optional, but usually safe)
  if (currentUserEmail === memberEmail) {
    return { status: "error", message: "You cannot remove yourself. Transfer ownership or delete the sheet instead." };
  }

  // 3. Remove Drive access
  try {
    ss.removeEditor(memberEmail);
  } catch (e) {
    console.error("Failed to remove editor (might not have been one):", e);
  }

  // 4. Update internal config list
  const configSheet = ss.getSheetByName("Config");
  const data = configSheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
     if (data[i][0] === "Member" && data[i][1] === memberEmail) {
       configSheet.deleteRow(i + 1);
     }
  }

  return { status: "success" };
}

function setupSheets(ss, userEmail) {
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
  
  const configSheet = ss.getSheetByName("Config");
  configSheet.appendRow(["Shop", "Amazon"]);
  configSheet.appendRow(["Shop", "Blinkit"]);
  configSheet.appendRow(["Member", userEmail]);
}

/**
 * Dashboard Analytics
 */
function getDashboardStats(ss) {
  const eventsSheet = ss.getSheetByName("ShopEvents");
  const data = eventsSheet.getDataRange().getValues();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  let weeklySpend = 0;
  for (let i = 1; i < data.length; i++) {
    const eventDate = new Date(data[i][1]);
    if (eventDate >= weekAgo) {
      weeklySpend += parseFloat(data[i][3]) || 0;
    }
  }
  
  return {
    weeklySpend: weeklySpend
  };
}

/**
 * Helpers
 */
function getTableDataSimple(ss, sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    return data.slice(1).map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h.toLowerCase()] = row[i]);
      return obj;
    });
}

function getTableData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
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
  const data = invSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === itemName) {
      invSheet.getRange(i + 1, 6).setValue("Near Finish");
      break;
    }
  }
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
  eventsSheet.appendRow([event.eventId, event.date, event.shopSource, event.totalAmount, event.buyer, event.entryType]);
  
  const invData = invSheet.getDataRange().getValues();
  items.forEach(item => {
    itemsSheet.appendRow([item.eventId, item.itemName, item.qtyBought, item.pricePerUnit]);
    for (let i = 1; i < invData.length; i++) {
      if (invData[i][0] === item.itemName) {
        const newQty = (parseFloat(invData[i][2]) || 0) + item.qtyBought;
        const threshold = parseFloat(invData[i][4]) || 0;
        invSheet.getRange(i + 1, 3).setValue(newQty);
        invSheet.getRange(i + 1, 6).setValue(newQty >= threshold ? "Normal" : "Near Finish");
        break;
      }
    }
    const shopData = shopSheet.getDataRange().getValues();
    for (let i = shopData.length - 1; i >= 1; i--) {
      if (shopData[i][0] === item.itemName) {
        shopSheet.deleteRow(i + 1);
      }
    }
  });
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
