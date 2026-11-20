/**
 * ============================================================
 *  Pet Sitter, Inventory & Poker Tracker Manager (Code.gs)
 * ============================================================
 */

const CONFIG = {
  SPREADSHEET_ID: '13xd4rQNvrmNIuQMhsEr2OBGTShxgcWxsbk9ghfMz8Xw',
  ANIMALS_LOVER_FOLDER_ID: '1QL-6aY3J3yVgi982dTB9PBfCOteShIxe', // โฟลเดอร์ Animals Lover_Images (รูปหน้าปกสัตว์)
  ANIMAL_PHOTOS_FOLDER_ID: '1Sz3uO7AaMH1x7fvQCLsHJsWdfZdkb22Q',  // โฟลเดอร์ AnimalPhotos_Images (รูปเพิ่มเติมสัตว์)
  PRODUCTS_FOLDER_ID: '1nNZ6XoFefxTW1MrGh5olGUlRNxhiQkJ4',        // โฟลเดอร์ Products_Images (รูปสินค้า)
  SHEETS: {
    PRODUCTS: 'Products',
    PETS: 'Animals Lover',
    JOBS: 'Jobs',
    PHOTOS: 'AnimalPhotos',
    CARE_LOG: 'PetCareLog',
    POKER: 'Poker'
  }
};

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Pet Sitter, Inventory & Poker Manager')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function ss_() {
  return CONFIG.SPREADSHEET_ID ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function tz_() { return Session.getScriptTimeZone(); }

function toText_(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd');
  return String(v).trim();
}

function toNumber_(v) {
  if (v === '' || v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  const cleaned = String(v).replace(/[^0-9.-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function fmtDate_(v) {
  if (!v) return '';
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd');
  const s = String(v).trim();
  if (!s) return '';
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : Utilities.formatDate(d, tz_(), 'yyyy-MM-dd');
}

function parseDate_(v) {
  if (!v) return null;
  if (v instanceof Date) return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// 1. ฟังก์ชันสแกนโฟลเดอร์รูปหน้าปกสัตว์ (Animals Lover_Images)
let cachedCoverMap = null;
function getAnimalsLoverFileMap_() {
  if (cachedCoverMap) return cachedCoverMap;
  const fileIdMap = {};
  const prefixMap = {};
  
  function scan_(folder) {
    try {
      const files = folder.getFiles();
      while (files.hasNext()) {
        const file = files.next();
        const fName = file.getName().toLowerCase();
        const fIdStr = file.getId();
        fileIdMap[fName] = fIdStr;
        
        const dotIdx = fName.indexOf('.');
        const prefix = dotIdx > 0 ? fName.substring(0, dotIdx).trim() : fName.trim();
        if (prefix && !prefixMap[prefix]) {
          prefixMap[prefix] = fIdStr;
        }
      }
      const subFolders = folder.getFolders();
      while (subFolders.hasNext()) {
        scan_(subFolders.next());
      }
    } catch (e) {}
  }

  if (CONFIG.ANIMALS_LOVER_FOLDER_ID) {
    try {
      scan_(DriveApp.getFolderById(CONFIG.ANIMALS_LOVER_FOLDER_ID));
    } catch (e) {}
  }

  cachedCoverMap = { full: fileIdMap, prefix: prefixMap };
  return cachedCoverMap;
}

// 2. ฟังก์ชันสแกนโฟลเดอร์รูปเพิ่มเติมสัตว์ (AnimalPhotos_Images)
let cachedExtraMap = null;
function getAnimalPhotosFileMap_() {
  if (cachedExtraMap) return cachedExtraMap;
  const fileIdMap = {};
  const prefixMap = {};

  function scan_(folder) {
    try {
      const files = folder.getFiles();
      while (files.hasNext()) {
        const file = files.next();
        const fName = file.getName().toLowerCase();
        const fIdStr = file.getId();
        fileIdMap[fName] = fIdStr;
        
        const dotIdx = fName.indexOf('.');
        const prefix = dotIdx > 0 ? fName.substring(0, dotIdx).trim() : fName.trim();
        if (prefix && !prefixMap[prefix]) {
          prefixMap[prefix] = fIdStr;
        }
      }
      const subFolders = folder.getFolders();
      while (subFolders.hasNext()) {
        scan_(subFolders.next());
      }
    } catch (e) {}
  }

  if (CONFIG.ANIMAL_PHOTOS_FOLDER_ID) {
    try {
      scan_(DriveApp.getFolderById(CONFIG.ANIMAL_PHOTOS_FOLDER_ID));
    } catch (e) {}
  }

  cachedExtraMap = { full: fileIdMap, prefix: prefixMap };
  return cachedExtraMap;
}

// 3. ฟังก์ชันสแกนโฟลเดอร์รูปสินค้า (Products_Images) โดยเฉพาะ
let cachedProductsMap = null;
function getProductsFileMap_() {
  if (cachedProductsMap) return cachedProductsMap;
  const fileIdMap = {};
  const prefixMap = {};

  function scan_(folder) {
    try {
      const files = folder.getFiles();
      while (files.hasNext()) {
        const file = files.next();
        const fName = file.getName().toLowerCase();
        const fIdStr = file.getId();
        fileIdMap[fName] = fIdStr;
        
        const dotIdx = fName.indexOf('.');
        const prefix = dotIdx > 0 ? fName.substring(0, dotIdx).trim() : fName.trim();
        if (prefix && !prefixMap[prefix]) {
          prefixMap[prefix] = fIdStr;
        }
      }
      const subFolders = folder.getFolders();
      while (subFolders.hasNext()) {
        scan_(subFolders.next());
      }
    } catch (e) {}
  }

  if (CONFIG.PRODUCTS_FOLDER_ID) {
    try {
      scan_(DriveApp.getFolderById(CONFIG.PRODUCTS_FOLDER_ID));
    } catch (e) {}
  }

  cachedProductsMap = { full: fileIdMap, prefix: prefixMap };
  return cachedProductsMap;
}

function resolveCoverPhotoUrl_(rawPath, mapObj, id) {
  const map = mapObj || getAnimalsLoverFileMap_();
  const fileIdMap = map.full || {};
  const prefixMap = map.prefix || {};

  let fileId = '';
  if (id !== null && id !== undefined) {
    const cleanId = String(id).trim().toLowerCase();
    if (cleanId && prefixMap[cleanId]) {
      fileId = prefixMap[cleanId];
    }
  }

  if (!fileId && rawPath) {
    const rawStr = String(rawPath).trim();
    const m = rawStr.match(/drive\.google\.com\/.*?(?:\/d\/|[?&]id=)([-\w]{20,})/) || rawStr.match(/docs\.google\.com\/.*?\/d\/([-\w]{20,})/);
    if (m) {
      fileId = m[1];
    } else {
      const fileName = rawStr.split('/').pop().split('\\').pop().toLowerCase();
      if (fileName && fileIdMap[fileName]) {
        fileId = fileIdMap[fileName];
      } else {
        const dotIdx = fileName.indexOf('.');
        const filePrefix = dotIdx > 0 ? fileName.substring(0, dotIdx).trim() : fileName.trim();
        if (filePrefix && prefixMap[filePrefix]) {
          fileId = prefixMap[filePrefix];
        }
      }
    }
  }

  return fileId ? ('https://lh3.googleusercontent.com/d/' + fileId) : '';
}

function getAnimalPhotosMap_() {
  const ss = ss_();
  const sh = ss.getSheetByName(CONFIG.SHEETS.PHOTOS);
  const map = {};
  if (!sh) return map;
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return map;
  
  const values = sh.getRange(2, 1, lastRow - 1, 3).getValues();
  const fileMap = getAnimalPhotosFileMap_();
  const fileIdMap = fileMap.full || {};
  const prefixMap = fileMap.prefix || {};

  values.forEach(r => {
    const animalId = toText_(r[1]).toLowerCase();
    const rawPhotoPath = toText_(r[2]);
    if (animalId && rawPhotoPath) {
      let fileId = '';
      const rawStr = String(rawPhotoPath).trim();
      const m = rawStr.match(/drive\.google\.com\/.*?(?:\/d\/|[?&]id=)([-\w]{20,})/) || rawStr.match(/docs\.google\.com\/.*?\/d\/([-\w]{20,})/);
      if (m) {
        fileId = m[1];
      } else {
        const fileName = rawStr.split('/').pop().split('\\').pop().toLowerCase();
        if (fileName && fileIdMap[fileName]) {
          fileId = fileIdMap[fileName];
        } else {
          const dotIdx = fileName.indexOf('.');
          const filePrefix = dotIdx > 0 ? fileName.substring(0, dotIdx).trim() : fileName.trim();
          if (filePrefix && prefixMap[filePrefix]) {
            fileId = prefixMap[filePrefix];
          }
        }
      }
      if (fileId) {
        const url = 'https://lh3.googleusercontent.com/d/' + fileId;
        if (!map[animalId]) map[animalId] = [];
        map[animalId].push(url);
      }
    }
  });
  return map;
}

function getCareLogFullMap_() {
  const ss = ss_();
  const sh = ss.getSheetByName(CONFIG.SHEETS.CARE_LOG);
  const map = {};
  if (!sh) return map;
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return map;
  const values = sh.getRange(2, 1, lastRow - 1, 26).getValues();
  values.forEach(r => {
    const animalId = toText_(r[1]).toLowerCase();
    if (animalId) {
      map[animalId] = {
        logId: toText_(r[0]),
        addressUnit: toText_(r[2]),
        visitDates: toText_(r[3]),
        timeOfDay: toText_(r[4]),
        wetFood: toText_(r[5]),
        wetFoodBrand: toText_(r[6]),
        dryFood: toText_(r[8]),
        water: toText_(r[9]),
        treat: toText_(r[10]),
        avoidFood: toText_(r[11]),
        litterLocation: toText_(r[13]),
        litterTrashBin: toText_(r[15]),
        cleaningSupply: toText_(r[16]),
        medication: toText_(r[17]) || toText_(r[25]),
        vetEmergency: toText_(r[18]),
        keyReturn: toText_(r[19]),
        doorBalconyWindow: toText_(r[20]),
        hidingPlace: toText_(r[21]),
        specialInstruction: toText_(r[22]),
        notes: toText_(r[23])
      };
    }
  });
  return map;
}

function formatCareLogSummary(c) {
  if (!c) return '';
  const logParts = [];
  if (c.timeOfDay) logParts.push('🕒 ช่วงเวลา: ' + c.timeOfDay);
  if (c.wetFood || c.wetFoodBrand) logParts.push('🥫 อาหารเปียก: ' + [c.wetFood, c.wetFoodBrand].filter(Boolean).join(' '));
  if (c.dryFood) logParts.push('🥣 อาหารแห้ง: ' + c.dryFood);
  if (c.water) logParts.push('💧 น้ำ: ' + c.water);
  if (c.treat) logParts.push('🍖 ขนม: ' + c.treat);
  if (c.avoidFood) logParts.push('⛔ ห้ามกิน: ' + c.avoidFood);
  if (c.litterLocation) logParts.push('🧹 กระบะทราย: ' + c.litterLocation);
  if (c.medication) logParts.push('💊 ยา: ' + c.medication);
  if (c.specialInstruction) logParts.push('⚠️ คำสั่งพิเศษ: ' + c.specialInstruction);
  if (c.notes) logParts.push('📝 โน้ต: ' + c.notes);
  return logParts.join('\n');
}

function getJobNetTotal_(r) {
  const price = toNumber_(r[6]);
  const tip = toNumber_(r[7]);
  const pickup = toNumber_(r[8]);
  const cost = toNumber_(r[9]);
  const actualCost = cost > 0 ? -cost : cost;
  return price + tip + pickup + actualCost;
}

// === Pet Sitter Data API ===
function getPetSitterData() {
  const ss = ss_();
  let sh = ss.getSheetByName(CONFIG.SHEETS.PETS) || ss.getSheetByName('Animals');
  if (!sh) return [];
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const values = sh.getRange(2, 1, lastRow - 1, 8).getValues();
  
  cachedCoverMap = null;
  const fileMap = getAnimalsLoverFileMap_();
  const petStats = getPetStatsFromJobs_();
  const careLogMap = getCareLogFullMap_();
  const out = [];

  values.forEach((r, idx) => {
    const id = toText_(r[0]) || ('pet-' + (idx + 2));
    const name = toText_(r[1]);
    if (!name && !toText_(r[0])) return;

    const category = toText_(r[2]) || 'Pet';
    let image = resolveCoverPhotoUrl_(toText_(r[3]), fileMap, id);

    const owner = toText_(r[4]);
    const location = toText_(r[5]);
    const room = toText_(r[6]);
    const sheetNote = toText_(r[7]);

    const careDetail = careLogMap[id.toLowerCase()] || {};
    const formattedNote = formatCareLogSummary(careDetail) || sheetNote;
    const stat = petStats[id.toLowerCase()] || { totalRevenue: 0, serviceTypes: [], newestJobDate: '', newestJobPrice: 0, sortDateKey: '1970-01-01', byType: {} };

    out.push({
      id: id, name: name, category: category, serviceTypes: stat.serviceTypes,
      totalRevenue: stat.totalRevenue, newestJobDate: stat.newestJobDate, newestJobPrice: stat.newestJobPrice,
      sortDateKey: stat.sortDateKey, byType: stat.byType, image: image, owner: owner, location: location, room: room,
      note: formattedNote, careDetail: careDetail
    });
  });

  out.sort((a, b) => new Date(b.sortDateKey || '1970-01-01') - new Date(a.sortDateKey || '1970-01-01'));
  return out;
}

function getPetStatsFromJobs_() {
  const ss = ss_();
  const sh = ss.getSheetByName(CONFIG.SHEETS.JOBS);
  const map = {};
  if (!sh) return map;
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return map;
  const values = sh.getRange(2, 1, lastRow - 1, 10).getValues();
  values.forEach(r => {
    const animalId = toText_(r[1]).toLowerCase();
    const serviceType = toText_(r[2]);
    const startDate = fmtDate_(r[4]);
    const endDate = fmtDate_(r[5]);
    const netTotal = getJobNetTotal_(r);

    if (animalId) {
      if (!map[animalId]) {
        map[animalId] = { totalRevenue: 0, serviceTypes: [], newestJobDate: '', newestJobPrice: 0, sortDateKey: '1970-01-01', byType: {} };
      }
      map[animalId].totalRevenue += netTotal;
      if (serviceType && !map[animalId].serviceTypes.includes(serviceType)) map[animalId].serviceTypes.push(serviceType);
      
      const dateStr = startDate ? (startDate + (endDate && endDate !== startDate ? ' ถึง ' + endDate : '')) : '';
      
      if (startDate && startDate >= map[animalId].sortDateKey) {
        map[animalId].sortDateKey = startDate;
        map[animalId].newestJobDate = dateStr;
        map[animalId].newestJobPrice = netTotal;
      }

      let typeKey = 'other';
      const stLower = serviceType.toLowerCase();
      if (stLower.includes('drop')) typeKey = 'dropin';
      else if (stLower.includes('board')) typeKey = 'boarding';
      else if (stLower.includes('walk')) typeKey = 'walking';

      if (!map[animalId].byType[typeKey]) {
        map[animalId].byType[typeKey] = { newestJobDate: '', newestJobPrice: 0, sortDateKey: '1970-01-01' };
      }

      if (startDate && startDate >= map[animalId].byType[typeKey].sortDateKey) {
        map[animalId].byType[typeKey].sortDateKey = startDate;
        map[animalId].byType[typeKey].newestJobDate = dateStr;
        map[animalId].byType[typeKey].newestJobPrice = netTotal;
      }
    }
  });
  return map;
}

function updateAnimal(data) {
  if (!data || !data.id) throw new Error('ไม่พบ ID สัตว์เลี้ยง');
  const ss = ss_();
  let sh = ss.getSheetByName(CONFIG.SHEETS.PETS) || ss.getSheetByName('Animals');
  const lastRow = sh.getLastRow();
  if (lastRow >= 2) {
    const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (toText_(ids[i][0]).toLowerCase() === String(data.id).toLowerCase()) {
        const row = i + 2;
        sh.getRange(row, 2).setValue(data.name || '');
        sh.getRange(row, 3).setValue(data.category || '');
        sh.getRange(row, 5).setValue(data.owner || '');
        sh.getRange(row, 6).setValue(data.location || '');
        sh.getRange(row, 7).setValue(data.room || '');
        if (data.image && data.image.base64) {
          const bytes = Utilities.base64Decode(data.image.base64);
          const blob = Utilities.newBlob(bytes, data.image.mimeType || 'image/jpeg', data.id + '.' + data.image.fileName);
          const file = DriveApp.getFolderById(CONFIG.ANIMALS_LOVER_FOLDER_ID).createFile(blob);
          try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
          sh.getRange(row, 4).setValue('Animals Lover_Images/' + file.getName());
        }
        break;
      }
    }
  }
  savePetCareLog_(data);
  SpreadsheetApp.flush();
  return { ok: true, pets: getPetSitterData() };
}

function savePetCareLog_(data) {
  const ss = ss_();
  let sh = ss.getSheetByName(CONFIG.SHEETS.CARE_LOG);
  if (!sh) sh = ss.insertSheet(CONFIG.SHEETS.CARE_LOG);
  const lastRow = sh.getLastRow();
  let foundRow = 0;
  if (lastRow >= 2) {
    const ids = sh.getRange(2, 2, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (toText_(ids[i][0]).toLowerCase() === String(data.id).toLowerCase()) {
        foundRow = i + 2;
        break;
      }
    }
  }
  const c = data.careDetail || {};
  const rowData = [
    c.logId || ('LOG-' + Date.now()), data.id, data.room || '', c.visitDates || '', c.timeOfDay || '',
    c.wetFood || '', c.wetFoodBrand || '', '', c.dryFood || '', c.water || '', c.treat || '',
    c.avoidFood || '', '', c.litterLocation || '', '', '', c.cleaningSupply || '', c.medication || '',
    c.vetEmergency || '', c.keyReturn || '', c.doorBalconyWindow || '', c.hidingPlace || '',
    c.specialInstruction || '', c.notes || '', c.water || '', c.medication || ''
  ];
  if (foundRow) sh.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
  else sh.appendRow(rowData);
}

function addAnimal(data) {
  if (!data || !data.name) throw new Error('กรุณากรอกชื่อสัตว์เลี้ยง');
  const ss = ss_();
  let sh = ss.getSheetByName(CONFIG.SHEETS.PETS) || ss.getSheetByName('Animals');
  
  const id = 'PET-' + String(Math.floor(1000 + Math.random() * 9000));
  let imagePath = '';

  if (data.image && data.image.base64) {
    const bytes = Utilities.base64Decode(data.image.base64);
    const blob = Utilities.newBlob(bytes, data.image.mimeType || 'image/jpeg', id + '.' + data.image.fileName);
    const file = DriveApp.getFolderById(CONFIG.ANIMALS_LOVER_FOLDER_ID).createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    imagePath = 'Animals Lover_Images/' + file.getName();
  }

  sh.appendRow([id, data.name, data.category || 'Cat', imagePath, data.owner || '', data.location || '', data.room || '', '']);
  data.id = id;
  savePetCareLog_(data);
  SpreadsheetApp.flush();
  return { ok: true, pets: getPetSitterData() };
}

function getPetExtraPhotos(petId) {
  const animalPhotosMap = getAnimalPhotosMap_();
  if (!petId) return [];
  return animalPhotosMap[String(petId).toLowerCase()] || [];
}

function uploadExtraPhoto(data) {
  if (!data || !data.petId || !data.image) throw new Error('ข้อมูลไม่ครบถ้วน');
  const ss = ss_();
  let sh = ss.getSheetByName(CONFIG.SHEETS.PHOTOS);
  if (!sh) sh = ss.insertSheet(CONFIG.SHEETS.PHOTOS);

  const photoId = Math.random().toString(16).substring(2, 10);
  const bytes = Utilities.base64Decode(data.image.base64);
  const photoName = photoId + '.Photo.' + Math.floor(100000 + Math.random() * 900000) + '.jpg';
  
  const blob = Utilities.newBlob(bytes, data.image.mimeType || 'image/jpeg', photoName);
  const file = DriveApp.getFolderById(CONFIG.ANIMAL_PHOTOS_FOLDER_ID).createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}

  const photoPath = 'AnimalPhotos_Images/' + photoName;
  sh.appendRow([photoId, data.petId, photoPath]);
  SpreadsheetApp.flush();

  return { ok: true, photos: getPetExtraPhotos(data.petId) };
}

function getPetJobs(petId) {
  const ss = ss_();
  let sh = ss.getSheetByName(CONFIG.SHEETS.JOBS);
  if (!sh) return [];
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const values = sh.getRange(2, 1, lastRow - 1, 10).getValues();
  const out = [];
  values.forEach((r, idx) => {
    if (petId && String(toText_(r[1])).toLowerCase() === String(petId).toLowerCase()) {
      const price = toNumber_(r[6]);
      const tip = toNumber_(r[7]);
      const pickupPrice = toNumber_(r[8]);
      const cost = toNumber_(r[9]);
      const netTotal = getJobNetTotal_(r);

      out.push({
        jobId: toText_(r[0]) || ('job-' + (idx + 2)),
        petId: toText_(r[1]),
        type: toText_(r[2]) || 'Dropin Visit',
        startDate: fmtDate_(r[4]),
        endDate: fmtDate_(r[5]),
        price: price,
        tip: tip,
        pickupPrice: pickupPrice,
        cost: cost,
        netTotal: netTotal
      });
    }
  });
  out.sort((a, b) => new Date(b.startDate || '1970-01-01') - new Date(a.startDate || '1970-01-01'));
  return out;
}

function saveJob(data) {
  if (!data || !data.petId) throw new Error('ข้อมูลสัตว์เลี้ยงไม่ครบถ้วน');
  const ss = ss_();
  let sh = ss.getSheetByName(CONFIG.SHEETS.JOBS);
  if (!sh) sh = ss.insertSheet(CONFIG.SHEETS.JOBS);

  const jobId = data.jobId || Math.random().toString(16).substring(2, 10);
  const price = toNumber_(data.price);
  const tip = toNumber_(data.tip);
  const pickupPrice = toNumber_(data.pickupPrice);
  const cost = toNumber_(data.cost);

  let foundRow = 0;
  if (data.jobId && sh.getLastRow() >= 2) {
    const ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (toText_(ids[i][0]) === String(data.jobId)) {
        foundRow = i + 2;
        break;
      }
    }
  }

  if (foundRow > 0) {
    sh.getRange(foundRow, 2).setValue(data.petId);
    sh.getRange(foundRow, 3).setValue(data.serviceType || 'Dropin Visit');
    sh.getRange(foundRow, 4).setValue(1);
    sh.getRange(foundRow, 5).setValue(data.startDate || '');
    sh.getRange(foundRow, 6).setValue(data.endDate || '');
    sh.getRange(foundRow, 7).setValue(price);
    sh.getRange(foundRow, 8).setValue(tip);
    sh.getRange(foundRow, 9).setValue(pickupPrice);
    sh.getRange(foundRow, 10).setValue(cost);
  } else {
    sh.appendRow([jobId, data.petId, data.serviceType || 'Dropin Visit', 1, data.startDate || '', data.endDate || '', price, tip, pickupPrice, cost]);
  }

  SpreadsheetApp.flush();
  return { ok: true, jobs: getPetJobs(data.petId), pets: getPetSitterData() };
}

function getProducts() {
  const ss = ss_();
  let sh = ss.getSheetByName(CONFIG.SHEETS.PRODUCTS);
  if (!sh) return [];
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const values = sh.getRange(2, 1, lastRow - 1, 9).getValues();
  const fileMap = getProductsFileMap_(); // ใช้ฟังก์ชันสแกนโฟลเดอร์สินค้าโดยเฉพาะ
  const out = [];

  values.forEach((r, idx) => {
    const id = toText_(r[0]) || ('row-' + (idx + 2));
    const name = toText_(r[1]);
    if (!name && !toText_(r[0])) return;
    const imageUrl = resolveCoverPhotoUrl_(toText_(r[2]), fileMap, id);
    const saleDate = fmtDate_(r[7]);
    const salePrice = toNumber_(r[8]);

    out.push({
      id: id, name: name, image: imageUrl, startDate: fmtDate_(r[3]),
      cost: toNumber_(r[4]), postDate: fmtDate_(r[5]), postPrice: toNumber_(r[6]),
      saleDate: saleDate, salePrice: salePrice, sold: !!saleDate || salePrice > 0
    });
  });
  return out.reverse();
}

function addProduct(data) {
  if (!data || !data.name) throw new Error('กรุณากรอกชื่อสินค้า');
  const ss = ss_();
  let sh = ss.getSheetByName(CONFIG.SHEETS.PRODUCTS);
  const imageUrl = data.image && data.image.base64 ? uploadFileToDrive(data.image.base64, data.image.mimeType, data.image.fileName) : '';
  sh.appendRow([String(Math.floor(10000000 + Math.random() * 90000000)), data.name, imageUrl, data.startDate || '', toNumber_(data.cost), data.postDate || '', toNumber_(data.postPrice), '', '']);
  SpreadsheetApp.flush();
  return { ok: true, products: getProducts() };
}

function updateProduct(data) {
  if (!data || !data.id) throw new Error('ไม่พบ ID สินค้า');
  const ss = ss_();
  let sh = ss.getSheetByName(CONFIG.SHEETS.PRODUCTS);
  const lastRow = sh.getLastRow();
  if (lastRow >= 2) {
    const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (toText_(ids[i][0]) === String(data.id)) {
        const row = i + 2;
        sh.getRange(row, 2).setValue(data.name || '');
        sh.getRange(row, 5).setValue(toNumber_(data.cost));
        sh.getRange(row, 7).setValue(toNumber_(data.postPrice));
        if (data.image && data.image.base64) {
          sh.getRange(row, 3).setValue(uploadFileToDrive(data.image.base64, data.image.mimeType, data.image.fileName));
        }
        break;
      }
    }
  }
  SpreadsheetApp.flush();
  return { ok: true, products: getProducts() };
}

function markAsSold(id, salePrice, saleDate) {
  const ss = ss_();
  let sh = ss.getSheetByName(CONFIG.SHEETS.PRODUCTS);
  const lastRow = sh.getLastRow();
  if (lastRow >= 2) {
    const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (toText_(ids[i][0]) === String(id)) {
        const row = i + 2;
        sh.getRange(row, 8).setValue(saleDate);
        sh.getRange(row, 9).setValue(toNumber_(salePrice));
        break;
      }
    }
  }
  SpreadsheetApp.flush();
  return { ok: true, products: getProducts() };
}

function getRevenueSummary() {
  const products = getProducts();
  let totalProductProfit = 0, totalPetProfit = 0, totalCost = 0, soldCount = 0;
  const monthlyData = {};

  const ensureMonthKey = (m) => {
    if (!monthlyData[m]) monthlyData[m] = { Dropin: 0, Boarding: 0, Walking: 0, Selling: 0, PetSitterAll: 0, ProductProfit: 0, PetProfit: 0 };
  };

  products.forEach(p => {
    if (p.sold) {
      soldCount++;
      const profit = p.salePrice - p.cost;
      totalProductProfit += profit;
      totalCost += p.cost;
      let monthKey = p.saleDate && p.saleDate.length >= 7 ? p.saleDate.substring(0, 7) : 'ไม่ระบุวันที่';
      ensureMonthKey(monthKey);
      monthlyData[monthKey].Selling += p.salePrice;
      monthlyData[monthKey].ProductProfit += profit;
    }
  });

  const ss = ss_();
  const jobsSh = ss.getSheetByName(CONFIG.SHEETS.JOBS);
  if (jobsSh) {
    const lastRow = jobsSh.getLastRow();
    if (lastRow >= 2) {
      const jobRows = jobsSh.getRange(2, 1, lastRow - 1, 10).getValues();
      jobRows.forEach(r => {
        const serviceType = toText_(r[2]).toLowerCase();
        const dStart = parseDate_(r[4]);
        const dEnd = parseDate_(r[5]) || dStart;
        const netTotal = getJobNetTotal_(r);

        if (netTotal !== 0 && dStart) {
          totalPetProfit += netTotal;
          const diffTime = Math.max(0, dEnd.getTime() - dStart.getTime());
          const totalDays = Math.max(1, Math.round(diffTime / (1000 * 3600 * 24)) + 1);
          const dailyRate = netTotal / totalDays;
          let curr = new Date(dStart.getTime());
          for (let day = 0; day < totalDays; day++) {
            const monthKey = curr.getFullYear() + '-' + String(curr.getMonth() + 1).padStart(2, '0');
            ensureMonthKey(monthKey);
            monthlyData[monthKey].PetSitterAll += dailyRate;
            monthlyData[monthKey].PetProfit += dailyRate;
            if (serviceType.includes('drop')) monthlyData[monthKey].Dropin += dailyRate;
            else if (serviceType.includes('board')) monthlyData[monthKey].Boarding += dailyRate;
            else if (serviceType.includes('walk')) monthlyData[monthKey].Walking += dailyRate;
            curr.setDate(curr.getDate() + 1);
          }
        }
      });
    }
  }

  return {
    totalPetProfit: totalPetProfit,
    totalProductProfit: totalProductProfit,
    netProfit: totalPetProfit + totalProductProfit,
    totalCost: totalCost,
    soldCount: soldCount,
    monthlyData: monthlyData
  };
}

function getPokerSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(CONFIG.SHEETS.POKER);
  if (!sh) {
    sh = ss.insertSheet(CONFIG.SHEETS.POKER);
    sh.appendRow(['Date', 'Session ID', 'Player', 'Buyin', 'Chips Cashed', 'Loss / Gain', 'Payout (CAD)']);
  }
  return sh;
}

function getPokerData() {
  const sh = getPokerSheet_();
  const lastRow = sh.getLastRow();
  const results = [];
  if (lastRow >= 2) {
    const values = sh.getRange(2, 1, lastRow - 1, 7).getValues();
    values.forEach(r => {
      const dt = fmtDate_(r[0]);
      const player = toText_(r[2]);
      if (dt && player) {
        const buyin = toNumber_(r[3]);
        const cashedOut = toNumber_(r[4]);
        const lossGainChips = cashedOut - buyin;
        results.push({
          date: dt, sessionId: toText_(r[1]) || '1', player: player,
          buyin: buyin, chipsCashedOut: cashedOut, lossGainChips: lossGainChips, payoutCAD: lossGainChips / 100
        });
      }
    });
  }
  return { results: results.reverse() };
}

function addPokerBatchResults(payload) {
  if (!payload || !payload.rows || !payload.rows.length) throw new Error('ไม่พบข้อมูลผู้เล่น');
  const sh = getPokerSheet_();
  const date = payload.date || fmtDate_(new Date());
  const sessionId = payload.sessionId || '1';

  payload.rows.forEach(row => {
    if (!row.player) return;
    const buyin = toNumber_(row.buyin);
    const cashedOut = toNumber_(row.cashedOut);
    const lossGain = cashedOut - buyin;
    sh.appendRow([date, sessionId, row.player, buyin, cashedOut, lossGain, lossGain / 100]);
  });

  SpreadsheetApp.flush();
  return { ok: true, poker: getPokerData() };
}

function uploadFileToDrive(base64Data, mimeType, fileName) {
  if (!base64Data) return '';
  const bytes = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(bytes, mimeType || 'image/jpeg', Date.now() + '_' + fileName);
  const file = DriveApp.getFolderById(CONFIG.PRODUCTS_FOLDER_ID).createFile(blob); // อัปโหลดไปที่โฟลเดอร์สินค้าโดยเฉพาะ
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  return 'https://lh3.googleusercontent.com/d/' + file.getId();
}