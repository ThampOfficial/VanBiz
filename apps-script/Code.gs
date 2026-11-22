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
    POKER: 'Poker',
    POKER_RAKE: 'Poker_HouseRake'
  },
  CHIPS_PER_CAD: 100   // 100 Chips = C$1
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

// ใช้ timezone ของชีต เพื่อให้วันที่ที่อ่านจากชีตไม่เลื่อนวัน
let cachedTz_ = null;
function tz_() {
  if (cachedTz_) return cachedTz_;
  try { cachedTz_ = ss_().getSpreadsheetTimeZone(); } catch (e) {}
  if (!cachedTz_) cachedTz_ = Session.getScriptTimeZone();
  return cachedTz_;
}

// ล็อกการเขียน ป้องกันเขียนชนกันเมื่อเปิดหลายเครื่องพร้อมกัน
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return fn(); } finally { lock.releaseLock(); }
}

// สร้าง ID แบบ 8 ตัวอักษร hex (รูปแบบเดียวกับข้อมูลเดิมในชีต) และไม่ซ้ำกับคอลัมน์ A
function newId_(sh) {
  const existing = {};
  if (sh && sh.getLastRow() >= 2) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(r => { existing[toText_(r[0]).toLowerCase()] = true; });
  }
  let id;
  do { id = Utilities.getUuid().replace(/-/g, '').substring(0, 8); } while (existing[id]);
  return id;
}

function findRowById_(sh, id, col) {
  const lastRow = sh.getLastRow();
  if (lastRow < 2 || id === null || id === undefined || id === '') return 0;
  const target = String(id).trim().toLowerCase();
  const ids = sh.getRange(2, col || 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (toText_(ids[i][0]).toLowerCase() === target) return i + 2;
  }
  return 0;
}

// ดึง Drive file ID จากลิงก์ทุกรูปแบบ (drive / docs / lh3)
function extractDriveId_(s) {
  const str = String(s || '').trim();
  const m = str.match(/drive\.google\.com\/.*?(?:\/d\/|[?&]id=)([-\w]{20,})/) ||
            str.match(/docs\.google\.com\/.*?\/d\/([-\w]{20,})/) ||
            str.match(/googleusercontent\.com\/d\/([-\w]{20,})/);
  return m ? m[1] : '';
}

// หา file ID จาก path แบบ "Folder_Images/xxx.jpg" โดยเทียบชื่อไฟล์เต็มก่อน แล้วค่อยเทียบ prefix
function fileIdFromPath_(rawPath, map) {
  const rawStr = String(rawPath || '').trim();
  if (!rawStr) return '';
  const direct = extractDriveId_(rawStr);
  if (direct) return direct;
  const fileName = rawStr.split('/').pop().split('\\').pop().toLowerCase();
  if (!fileName) return '';
  if (map.full && map.full[fileName]) return map.full[fileName];
  const dotIdx = fileName.indexOf('.');
  const filePrefix = dotIdx > 0 ? fileName.substring(0, dotIdx).trim() : fileName.trim();
  return (filePrefix && map.prefix && map.prefix[filePrefix]) || '';
}

function fileExt_(fileName, mimeType) {
  const m = String(fileName || '').match(/\.([a-z0-9]{2,5})$/i);
  if (m) return m[1].toLowerCase();
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

function saveImageToFolder_(image, folderId, fileName) {
  const bytes = Utilities.base64Decode(image.base64);
  const blob = Utilities.newBlob(bytes, image.mimeType || 'image/jpeg', fileName);
  const file = DriveApp.getFolderById(folderId).createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  return file;
}

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
  const s = fmtDate_(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  return null;
}

// ============================================================
//  แคช (CacheService) — ทำให้โหลดเร็ว ไม่ต้องสแกน Drive / อ่านชีตทุกครั้ง
// ============================================================
const CACHE_CHUNK_ = 90000;   // CacheService เก็บได้ไม่เกิน 100KB ต่อ key จึงแบ่งเป็นชิ้น
const DATA_TTL_ = 600;        // ข้อมูลชีต: 10 นาที (กดรีเฟรชเพื่อดึงใหม่ทันที)
const MAP_TTL_ = 21600;       // รายชื่อไฟล์รูปใน Drive: 6 ชั่วโมง
const DATA_KEYS_ = ['pets', 'products', 'summary', 'poker', 'photos'];

function cacheGetJson_(key) {
  try {
    const cache = CacheService.getScriptCache();
    const meta = cache.get(key + ':n');
    if (!meta) return null;
    const n = parseInt(meta, 10);
    const keys = [];
    for (let i = 0; i < n; i++) keys.push(key + ':' + i);
    const parts = cache.getAll(keys);
    let str = '';
    for (let i = 0; i < n; i++) {
      const part = parts[key + ':' + i];
      if (part === undefined || part === null) return null;
      str += part;
    }
    return JSON.parse(str);
  } catch (e) { return null; }
}

function cachePutJson_(key, obj, ttl) {
  try {
    const str = JSON.stringify(obj);
    const map = {};
    let n = 0;
    for (let i = 0; i < str.length; i += CACHE_CHUNK_) map[key + ':' + (n++)] = str.substring(i, i + CACHE_CHUNK_);
    map[key + ':n'] = String(n);
    CacheService.getScriptCache().putAll(map, ttl || DATA_TTL_);
  } catch (e) {}
}

function cacheRemove_(keys) {
  try { CacheService.getScriptCache().removeAll(keys.map(k => k + ':n')); } catch (e) {}
}

// ล้างแคชข้อมูลหลังมีการบันทึก (และล้างรายชื่อไฟล์ถ้าระบุ)
function invalidate_(mapKeys) {
  cacheRemove_(DATA_KEYS_.concat(mapKeys || []));
  if (mapKeys) mapKeys.forEach(k => { delete folderMaps_[k]; });
}

function cached_(key, force, builder) {
  if (!force) {
    const hit = cacheGetJson_(key);
    if (hit !== null) return hit;
  }
  const val = builder();
  cachePutJson_(key, val, DATA_TTL_);
  return val;
}

// รายชื่อไฟล์ในโฟลเดอร์รูป (รวมโฟลเดอร์ย่อย) → { full: {ชื่อไฟล์: id}, prefix: {ส่วนหน้าชื่อ: id} }
const folderMaps_ = {};
let mapMissed_ = false;
function getFolderMap_(key, folderId, fresh) {
  if (!fresh && folderMaps_[key]) return folderMaps_[key];
  if (!fresh) {
    const hit = cacheGetJson_(key);
    if (hit) { hit.fromCache = true; folderMaps_[key] = hit; return hit; }
  }
  const full = {}, prefix = {};
  function scan_(folder) {
    try {
      const files = folder.getFiles();
      while (files.hasNext()) {
        const file = files.next();
        const fName = file.getName().toLowerCase();
        const fId = file.getId();
        full[fName] = fId;
        const dotIdx = fName.indexOf('.');
        const pre = dotIdx > 0 ? fName.substring(0, dotIdx).trim() : fName.trim();
        if (pre && !prefix[pre]) prefix[pre] = fId;
      }
      const subs = folder.getFolders();
      while (subs.hasNext()) scan_(subs.next());
    } catch (e) {}
  }
  if (folderId) { try { scan_(DriveApp.getFolderById(folderId)); } catch (e) {} }
  const map = { full: full, prefix: prefix };
  cachePutJson_(key, map, MAP_TTL_);
  folderMaps_[key] = map;
  return map;
}

function getAnimalsLoverFileMap_(fresh) { return getFolderMap_('fm_cover', CONFIG.ANIMALS_LOVER_FOLDER_ID, fresh); }
function getAnimalPhotosFileMap_(fresh) { return getFolderMap_('fm_extra', CONFIG.ANIMAL_PHOTOS_FOLDER_ID, fresh); }
function getProductsFileMap_(fresh) { return getFolderMap_('fm_products', CONFIG.PRODUCTS_FOLDER_ID, fresh); }

// ถ้ารูปบางรูปหาไม่เจอในรายชื่อที่แคชไว้ (เช่นเพิ่งอัปโหลดผ่าน AppSheet) ให้สแกนโฟลเดอร์ใหม่หนึ่งครั้งแล้วคำนวณใหม่
// สแกนซ้ำได้ไม่เกินทุก 30 นาที (กันกรณีในชีตมี path ของไฟล์ที่ไม่มีอยู่จริง แล้วสแกนทุกครั้ง)
const RESCAN_GAP_ = 1800;
function withFreshMapOnMiss_(mapKey, build) {
  mapMissed_ = false;
  let out = build();
  const m = folderMaps_[mapKey];
  if (mapMissed_ && m && m.fromCache) {
    const cache = CacheService.getScriptCache();
    if (!cache.get(mapKey + ':rescanned')) {
      cache.put(mapKey + ':rescanned', '1', RESCAN_GAP_);
      delete folderMaps_[mapKey];
      cacheRemove_([mapKey]);
      mapMissed_ = false;
      out = build();
    }
  }
  return out;
}

// เพิ่มไฟล์ที่เพิ่งอัปโหลดเข้าไปในรายชื่อที่แคชไว้ทันที (ไม่ต้องสแกนโฟลเดอร์ใหม่)
function addToFolderMap_(mapKey, file) {
  const map = folderMaps_[mapKey] || cacheGetJson_(mapKey);
  if (!map) return;
  const name = file.getName().toLowerCase();
  const id = file.getId();
  map.full[name] = id;
  const dot = name.indexOf('.');
  const pre = dot > 0 ? name.substring(0, dot) : name;
  if (pre) map.prefix[pre] = id;
  delete map.fromCache;
  folderMaps_[mapKey] = map;
  cachePutJson_(mapKey, map, MAP_TTL_);
}

function resolveCoverPhotoUrl_(rawPath, mapObj, id) {
  const map = mapObj || getAnimalsLoverFileMap_();
  const fileIdMap = map.full || {};
  const prefixMap = map.prefix || {};

  // 1) ใช้ path/ลิงก์ที่บันทึกในชีตก่อน (แม่นที่สุด และได้รูปล่าสุดเมื่อเปลี่ยนรูป)
  let fileId = fileIdFromPath_(rawPath, { full: fileIdMap, prefix: prefixMap });

  // 2) ถ้าไม่เจอ ค่อยหาไฟล์ที่ชื่อขึ้นต้นด้วย ID
  if (!fileId && id !== null && id !== undefined) {
    const cleanId = String(id).trim().toLowerCase();
    if (cleanId && prefixMap[cleanId]) fileId = prefixMap[cleanId];
  }

  if (!fileId && rawPath && !extractDriveId_(rawPath)) mapMissed_ = true;
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

  values.forEach(r => {
    const animalId = toText_(r[1]).toLowerCase();
    const rawPhotoPath = toText_(r[2]);
    if (animalId && rawPhotoPath) {
      const fileId = fileIdFromPath_(rawPhotoPath, fileMap);
      if (!fileId) mapMissed_ = true;
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
    if (animalId && !map[animalId]) { // ใช้แถวแรกของสัตว์ตัวนั้น (แถวเดียวกับที่บันทึกตอนแก้ไข)
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
        foodTrashBin: toText_(r[12]),
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
  const wet = /^(true|false)$/i.test(c.wetFood || '') ? (/^true$/i.test(c.wetFood) ? '✓' : '') : c.wetFood;
  if (wet || c.wetFoodBrand) logParts.push('🥫 อาหารเปียก: ' + [wet, c.wetFoodBrand].filter(Boolean).join(' '));
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
function getPetSitterData(force) {
  return cached_('pets', force, () => withFreshMapOnMiss_('fm_cover', getPetSitterData_));
}

function getPetSitterData_() {
  const ss = ss_();
  let sh = ss.getSheetByName(CONFIG.SHEETS.PETS) || ss.getSheetByName('Animals');
  if (!sh) return [];
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const values = sh.getRange(2, 1, lastRow - 1, 8).getValues();
  
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
  return withLock_(() => {
    const ss = ss_();
    const sh = ss.getSheetByName(CONFIG.SHEETS.PETS) || ss.getSheetByName('Animals');
    const row = findRowById_(sh, data.id, 1);
    if (!row) throw new Error('ไม่พบสัตว์เลี้ยง ID: ' + data.id + ' ในชีต');
    sh.getRange(row, 2, 1, 1).setValue(data.name || '');
    sh.getRange(row, 3, 1, 1).setValue(data.category || '');
    sh.getRange(row, 5, 1, 3).setValues([[data.owner || '', data.location || '', data.room || '']]);
    if (data.image && data.image.base64) {
      const fileName = data.id + '.Picture.' + Date.now() + '.' + fileExt_(data.image.fileName, data.image.mimeType);
      const file = saveImageToFolder_(data.image, CONFIG.ANIMALS_LOVER_FOLDER_ID, fileName);
      addToFolderMap_('fm_cover', file);
      sh.getRange(row, 4).setValue('Animals Lover_Images/' + file.getName());
    }
    savePetCareLog_(data);
    SpreadsheetApp.flush();
    invalidate_();
    return { ok: true, pets: getPetSitterData() };
  });
}

// บันทึก PetCareLog เฉพาะคอลัมน์ที่ฟอร์มแก้ได้ คอลัมน์อื่น (PlacementPhoto, FoodTrashBin ฯลฯ) คงค่าเดิมไว้
function savePetCareLog_(data) {
  const ss = ss_();
  let sh = ss.getSheetByName(CONFIG.SHEETS.CARE_LOG);
  if (!sh) sh = ss.insertSheet(CONFIG.SHEETS.CARE_LOG);
  const WIDTH = 26;
  const c = data.careDetail || {};
  const foundRow = findRowById_(sh, data.id, 2);

  let row = new Array(WIDTH).fill('');
  if (foundRow) row = sh.getRange(foundRow, 1, 1, WIDTH).getValues()[0];

  // index ตามหัวคอลัมน์ในชีต PetCareLog (A=0)
  // เขียนเฉพาะเมื่อค่าเปลี่ยนจริง (คง type เดิม เช่น checkbox TRUE/FALSE หรือวันที่)
  const set = (i, v) => {
    if (v === undefined) return;
    if (toText_(row[i]).toLowerCase() === String(v).trim().toLowerCase()) return;
    const cur = row[i];
    if (typeof cur === 'boolean' && /^(true|false)$/i.test(String(v).trim())) row[i] = /^true$/i.test(String(v).trim());
    else row[i] = v;
  };
  row[0] = toText_(row[0]) || c.logId || newId_(sh);
  row[1] = data.id;
  set(2, data.room);                 // Address / unit
  set(3, c.visitDates);              // Visit date(s)
  set(4, c.timeOfDay);               // Time of the day
  set(5, c.wetFood);                 // Wet food
  set(6, c.wetFoodBrand);            // Brand/flavour/amount/location
  set(8, c.dryFood);                 // Dry food
  set(9, c.water);                   // Water (location + refill)
  set(10, c.treat);                  // Treat
  set(11, c.avoidFood);              // Avoid food?
  set(13, c.litterLocation);         // Litter (location)
  set(15, c.litterTrashBin);         // LitterTrashBin
  set(16, c.cleaningSupply);         // Cleaning Supply
  set(17, c.medication);             // Medication
  set(18, c.vetEmergency);           // Vet / Emergency
  set(19, c.keyReturn);              // Key Return
  set(20, c.doorBalconyWindow);      // Door / Balcony / Window
  set(21, c.hidingPlace);            // Hiding place
  set(22, c.specialInstruction);     // Special Instruction
  set(23, c.notes);                  // Notes
  if (c.water !== undefined && toText_(row[24])) row[24] = c.water;           // Water (คอลัมน์ซ้ำ)
  if (c.medication !== undefined && toText_(row[25])) row[25] = c.medication; // Medication (คอลัมน์ซ้ำ)

  if (foundRow) sh.getRange(foundRow, 1, 1, WIDTH).setValues([row]);
  else sh.appendRow(row);
}

function addAnimal(data) {
  if (!data || !data.name) throw new Error('กรุณากรอกชื่อสัตว์เลี้ยง');
  return withLock_(() => {
    const ss = ss_();
    const sh = ss.getSheetByName(CONFIG.SHEETS.PETS) || ss.getSheetByName('Animals');
    const id = newId_(sh);
    let imagePath = '';
    if (data.image && data.image.base64) {
      const fileName = id + '.Picture.' + Date.now() + '.' + fileExt_(data.image.fileName, data.image.mimeType);
      const file = saveImageToFolder_(data.image, CONFIG.ANIMALS_LOVER_FOLDER_ID, fileName);
      addToFolderMap_('fm_cover', file);
      imagePath = 'Animals Lover_Images/' + file.getName();
    }
    sh.appendRow([id, data.name, data.category || 'Cat', imagePath, data.owner || '', data.location || '', data.room || '', '']);
    data.id = id;
    savePetCareLog_(data);
    SpreadsheetApp.flush();
    invalidate_();
    return { ok: true, pets: getPetSitterData() };
  });
}

function getPetExtraPhotos(petId) {
  const animalPhotosMap = cached_('photos', false, () => withFreshMapOnMiss_('fm_extra', getAnimalPhotosMap_));
  if (!petId) return [];
  return animalPhotosMap[String(petId).toLowerCase()] || [];
}

function uploadExtraPhoto(data) {
  if (!data || !data.petId || !data.image || !data.image.base64) throw new Error('ข้อมูลไม่ครบถ้วน');
  withLock_(() => {
    const ss = ss_();
    let sh = ss.getSheetByName(CONFIG.SHEETS.PHOTOS);
    if (!sh) { sh = ss.insertSheet(CONFIG.SHEETS.PHOTOS); sh.appendRow(['PhotoID', 'AnimalID', 'Photo']); }
    // photoId มาจากหน้าเว็บ: ถ้าส่งซ้ำ (ลองใหม่หลังเน็ตหลุด) จะไม่บันทึกรูปซ้ำ
    const clientId = String(data.photoId || '').toLowerCase().replace(/[^0-9a-f]/g, '').substring(0, 8);
    if (clientId.length === 8 && findRowById_(sh, clientId, 1)) return;
    const photoId = clientId.length === 8 ? clientId : newId_(sh);
    const photoName = photoId + '.Photo.' + Date.now() + '.' + fileExt_(data.image.fileName, data.image.mimeType);
    const file = saveImageToFolder_(data.image, CONFIG.ANIMAL_PHOTOS_FOLDER_ID, photoName);
    addToFolderMap_('fm_extra', file);
    sh.appendRow([photoId, data.petId, 'AnimalPhotos_Images/' + photoName]);
    SpreadsheetApp.flush();
    invalidate_();
  });
  return { ok: true, photos: getPetExtraPhotos(data.petId) };
}

function getPetJobs(petId) {
  const ss = ss_();
  const sh = ss.getSheetByName(CONFIG.SHEETS.JOBS);
  if (!sh) return [];
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const values = sh.getRange(2, 1, lastRow - 1, 12).getValues();
  const out = [];
  values.forEach((r, idx) => {
    if (petId && toText_(r[1]).toLowerCase() === String(petId).toLowerCase()) {
      out.push({
        jobId: toText_(r[0]) || ('job-' + (idx + 2)),
        petId: toText_(r[1]),
        type: toText_(r[2]) || 'Dropin Visit',
        startDate: fmtDate_(r[4]),
        endDate: fmtDate_(r[5]),
        price: toNumber_(r[6]),
        tip: toNumber_(r[7]),
        pickupPrice: toNumber_(r[8]),
        cost: toNumber_(r[9]),
        source: toText_(r[10]),
        note: toText_(r[11]),
        netTotal: getJobNetTotal_(r)
      });
    }
  });
  out.sort((a, b) => (b.startDate || '1970-01-01').localeCompare(a.startDate || '1970-01-01'));
  return out;
}

function saveJob(data) {
  if (!data || !data.petId) throw new Error('ข้อมูลสัตว์เลี้ยงไม่ครบถ้วน');
  if (!data.startDate) throw new Error('กรุณาเลือกวันเริ่มงาน');
  const endDate = data.endDate || data.startDate;
  if (endDate < data.startDate) throw new Error('วันสิ้นสุดต้องไม่ก่อนวันเริ่มงาน');
  withLock_(() => {
    const ss = ss_();
    let sh = ss.getSheetByName(CONFIG.SHEETS.JOBS);
    if (!sh) {
      sh = ss.insertSheet(CONFIG.SHEETS.JOBS);
      sh.appendRow(['JobID', 'AnimalID', 'ServiceType', 'Sessions', 'Date From', 'Date To', 'Price', 'Tip', 'Pick up Price', 'Cost', 'Source', 'Note']);
    }
    const price = toNumber_(data.price), tip = toNumber_(data.tip), pickup = toNumber_(data.pickupPrice), cost = toNumber_(data.cost);
    const foundRow = data.jobId ? findRowById_(sh, data.jobId, 1) : 0;
    if (foundRow) {
      // ไม่แตะคอลัมน์ Sessions (D) และ Source (K) ของเดิม
      sh.getRange(foundRow, 2, 1, 2).setValues([[data.petId, data.serviceType || 'Dropin Visit']]);
      sh.getRange(foundRow, 5, 1, 6).setValues([[data.startDate, endDate, price, tip, pickup, cost]]);
      if (data.note !== undefined) sh.getRange(foundRow, 12).setValue(data.note || '');
    } else {
      sh.appendRow([newId_(sh), data.petId, data.serviceType || 'Dropin Visit', 1, data.startDate, endDate, price, tip, pickup, cost, '', data.note || '']);
    }
    SpreadsheetApp.flush();
    invalidate_();
  });
  return { ok: true, jobs: getPetJobs(data.petId), pets: getPetSitterData() };
}

function getProducts(force) {
  return cached_('products', force, () => withFreshMapOnMiss_('fm_products', getProducts_));
}

function getProducts_() {
  const ss = ss_();
  const sh = ss.getSheetByName(CONFIG.SHEETS.PRODUCTS);
  if (!sh) return [];
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const values = sh.getRange(2, 1, lastRow - 1, 10).getValues();
  const fileMap = getProductsFileMap_();
  const out = [];
  values.forEach((r, idx) => {
    const id = toText_(r[0]) || ('row-' + (idx + 2));
    const name = toText_(r[1]);
    if (!name && !toText_(r[0])) return;
    const saleDate = fmtDate_(r[7]);
    const salePrice = toNumber_(r[8]);
    out.push({
      id: id, name: name, image: resolveCoverPhotoUrl_(toText_(r[2]), fileMap, id),
      startDate: fmtDate_(r[3]), cost: toNumber_(r[4]),
      postDate: fmtDate_(r[5]), postPrice: toNumber_(r[6]),
      saleDate: saleDate, salePrice: salePrice, note: toText_(r[9]),
      sold: !!saleDate || salePrice > 0
    });
  });
  return out.reverse();
}

function addProduct(data) {
  if (!data || !data.name) throw new Error('กรุณากรอกชื่อสินค้า');
  withLock_(() => {
    const sh = ss_().getSheetByName(CONFIG.SHEETS.PRODUCTS);
    const id = newId_(sh);
    const imagePath = (data.image && data.image.base64) ? uploadProductImage_(data.image, id) : '';
    const sold = !!data.sold;
    sh.appendRow([
      id, data.name, imagePath, data.startDate || '', toNumber_(data.cost), data.postDate || '', toNumber_(data.postPrice),
      sold ? (data.saleDate || fmtDate_(new Date())) : '', sold ? toNumber_(data.salePrice) : '', data.note || ''
    ]);
    SpreadsheetApp.flush();
    invalidate_();
  });
  return { ok: true, products: getProducts() };
}

// แก้ไขสินค้าได้ทุกช่อง ทั้งที่ขายแล้วและยังไม่ขาย (ติ๊ก sold=false เพื่อยกเลิกสถานะขายแล้ว)
function updateProduct(data) {
  if (!data || !data.id) throw new Error('ไม่พบ ID สินค้า');
  if (!data.name) throw new Error('กรุณากรอกชื่อสินค้า');
  withLock_(() => {
    const sh = ss_().getSheetByName(CONFIG.SHEETS.PRODUCTS);
    const row = findRowById_(sh, data.id, 1);
    if (!row) throw new Error('ไม่พบสินค้า ID: ' + data.id + ' ในชีต');
    sh.getRange(row, 2).setValue(data.name);
    sh.getRange(row, 4, 1, 4).setValues([[data.startDate || '', toNumber_(data.cost), data.postDate || '', toNumber_(data.postPrice)]]);
    if (data.sold) sh.getRange(row, 8, 1, 2).setValues([[data.saleDate || fmtDate_(new Date()), toNumber_(data.salePrice)]]);
    else sh.getRange(row, 8, 1, 2).clearContent();
    sh.getRange(row, 10).setValue(data.note || '');
    if (data.image && data.image.base64) sh.getRange(row, 3).setValue(uploadProductImage_(data.image, data.id));
    SpreadsheetApp.flush();
    invalidate_();
  });
  return { ok: true, products: getProducts() };
}

function markAsSold(id, salePrice, saleDate) {
  withLock_(() => {
    const sh = ss_().getSheetByName(CONFIG.SHEETS.PRODUCTS);
    const row = findRowById_(sh, id, 1);
    if (!row) throw new Error('ไม่พบสินค้า ID: ' + id);
    sh.getRange(row, 8, 1, 2).setValues([[saleDate || fmtDate_(new Date()), toNumber_(salePrice)]]);
    SpreadsheetApp.flush();
    invalidate_();
  });
  return { ok: true, products: getProducts() };
}

function deleteProduct(id) {
  withLock_(() => {
    const sh = ss_().getSheetByName(CONFIG.SHEETS.PRODUCTS);
    const row = findRowById_(sh, id, 1);
    if (!row) throw new Error('ไม่พบสินค้า ID: ' + id);
    sh.deleteRow(row);
    SpreadsheetApp.flush();
    invalidate_();
  });
  return { ok: true, products: getProducts() };
}

function getRevenueSummary(force) {
  return cached_('summary', force, () => getRevenueSummary_(force));
}

function getRevenueSummary_(force) {
  const products = getProducts(force);
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

function getPokerData(force) {
  return cached_('poker', force, getPokerData_);
}

function getPokerData_() {
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
          buyin: buyin, chipsCashedOut: cashedOut, lossGainChips: lossGainChips, payoutCAD: lossGainChips / CONFIG.CHIPS_PER_CAD
        });
      }
    });
  }
  return { results: results.reverse(), rake: getPokerRake_() };
}

function getPokerRakeSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(CONFIG.SHEETS.POKER_RAKE);
  if (!sh) {
    sh = ss.insertSheet(CONFIG.SHEETS.POKER_RAKE);
    sh.appendRow(['Date', 'SessionID', 'HouseRakeChips', 'Notes']);
  }
  return sh;
}

// ค่าต๋ง (House) จากชีต Poker_HouseRake
function getPokerRake_() {
  const sh = getPokerRakeSheet_();
  const lastRow = sh.getLastRow();
  const out = [];
  if (lastRow < 2) return out;
  sh.getRange(2, 1, lastRow - 1, 4).getValues().forEach(r => {
    const dt = fmtDate_(r[0]);
    const chips = toNumber_(r[2]);
    if (dt && chips) out.push({ date: dt, sessionId: toText_(r[1]) || '1', chips: chips, cad: chips / CONFIG.CHIPS_PER_CAD, note: toText_(r[3]) });
  });
  return out.reverse();
}

function addPokerBatchResults(payload) {
  if (!payload || !payload.rows || !payload.rows.length) throw new Error('ไม่พบข้อมูลผู้เล่น');
  withLock_(() => {
    const sh = getPokerSheet_();
    const date = payload.date || fmtDate_(new Date());
    const sessionId = payload.sessionId || '1';
    const rows = [];
    payload.rows.forEach(row => {
      if (!row.player) return;
      const buyin = toNumber_(row.buyin);
      const cashedOut = toNumber_(row.cashedOut);
      const lossGain = cashedOut - buyin;
      rows.push([date, sessionId, String(row.player).trim(), buyin, cashedOut, lossGain, lossGain / CONFIG.CHIPS_PER_CAD]);
    });
    if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
    const rake = toNumber_(payload.rakeChips);
    if (rake) getPokerRakeSheet_().appendRow([date, sessionId, rake, payload.rakeNote || '']);
    SpreadsheetApp.flush();
    invalidate_();
  });
  return { ok: true, poker: getPokerData() };
}

// อัปโหลดรูปสินค้า ตั้งชื่อแบบเดิม "<ProductID>.Picture.<เวลา>.jpg" แล้วคืน path แบบเดียวกับข้อมูลเดิม
function uploadProductImage_(image, productId) {
  const fileName = productId + '.Picture.' + Date.now() + '.' + fileExt_(image.fileName, image.mimeType);
  const file = saveImageToFolder_(image, CONFIG.PRODUCTS_FOLDER_ID, fileName);
  return 'https://lh3.googleusercontent.com/d/' + file.getId();
}

// เผื่อโค้ดเก่าเรียกใช้
function uploadFileToDrive(base64Data, mimeType, fileName) {
  if (!base64Data) return '';
  return uploadProductImage_({ base64: base64Data, mimeType: mimeType, fileName: fileName }, String(Date.now()));
}

/**
 * ============================================================
 *  JSON API สำหรับหน้าเว็บบน GitHub Pages (thampofficial.github.io/VanBiz)
 *  หน้าเว็บส่ง POST { action, args, key } มาที่ลิงก์ /exec
 *  ต้องมีรหัส API_KEY ตรงกับที่ตั้งไว้ใน Script Properties (รัน setupApiKey ครั้งเดียว)
 * ============================================================
 */
const API_FUNCS_ = {
  getPetSitterData: getPetSitterData,
  updateAnimal: updateAnimal,
  addAnimal: addAnimal,
  getPetExtraPhotos: getPetExtraPhotos,
  uploadExtraPhoto: uploadExtraPhoto,
  getPetJobs: getPetJobs,
  saveJob: saveJob,
  getProducts: getProducts,
  addProduct: addProduct,
  updateProduct: updateProduct,
  markAsSold: markAsSold,
  deleteProduct: deleteProduct,
  getRevenueSummary: getRevenueSummary,
  getPokerData: getPokerData,
  addPokerBatchResults: addPokerBatchResults,
  ping: function() { return 'ok'; }
};

function doPost(e) {
  let out;
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const key = PropertiesService.getScriptProperties().getProperty('API_KEY');
    if (!key) throw new Error('ยังไม่ได้ตั้งรหัส API_KEY — เปิด Apps Script แล้วรันฟังก์ชัน setupApiKey');
    if (String(req.key || '') !== key) throw new Error('UNAUTHORIZED');
    const fn = API_FUNCS_[req.action];
    if (!fn) throw new Error('ไม่รู้จักคำสั่ง: ' + req.action);
    out = { ok: true, data: fn.apply(null, req.args || []) };
  } catch (err) {
    console.error('doPost error', err && err.stack ? err.stack : err);
    out = { ok: false, error: (err && err.message) ? err.message : String(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

// รันครั้งเดียวใน Apps Script editor: สร้างรหัสเข้าใช้ แล้วดูรหัสใน Execution log
function setupApiKey() {
  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty('API_KEY');
  if (!key) {
    key = Utilities.getUuid().replace(/-/g, '').substring(0, 12);
    props.setProperty('API_KEY', key);
  }
  Logger.log('รหัสเข้าใช้ VanBiz (API_KEY): ' + key);
  return key;
}
