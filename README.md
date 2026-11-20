# VanBiz

Pet Sitter, Inventory & Poker Manager — Google Apps Script web app ที่ใช้ Google Sheet **Van BIz** เป็นฐานข้อมูล

## เปิดใช้งาน

- **GitHub Pages:** https://thampofficial.github.io/VanBiz/ (ใส่รหัสเข้าใช้ครั้งแรกครั้งเดียว)
- **ลิงก์ Apps Script เดิม:** ยังใช้ได้เหมือนเดิม

ทั้งสองทางอ่าน/เขียนชีต Van BIz เดียวกัน

## ไฟล์

| ไฟล์ | หน้าที่ |
|---|---|
| `index.html` | หน้าเว็บสำหรับ GitHub Pages (เหมือน `apps-script/Index.html` ทุกตัวอักษร) |
| `apps-script/Code.gs` | ฝั่งเซิร์ฟเวอร์ใน Apps Script: อ่าน/เขียนชีต, อัปโหลดรูป, JSON API (`doPost`) |
| `apps-script/Index.html` | หน้าเว็บที่ Apps Script เสิร์ฟผ่านลิงก์ `/exec` |

หน้าเว็บตรวจเองว่าเปิดจากที่ไหน: ใน Apps Script ใช้ `google.script.run`, บน GitHub Pages ส่ง `fetch` ไปที่ `API_URL` พร้อมรหัสเข้าใช้

> แก้ `Index.html` แล้วต้องคัดลอกไปทับ `index.html` ด้วยเสมอ

## แท็บในแอป

- 🐱 **Pet Sitter** — รายชื่อสัตว์เลี้ยง, PetCareLog, Jobs (Drop in / Boarding / Walking), รูปเพิ่มเติม
- 📦 **คลังสินค้า** — สินค้า, ต้นทุน, ราคาตั้งขาย, บันทึกการขาย
- 📊 **ภาพรวมกำไร** — กำไร Pet Sitter + ขายสินค้า รายเดือน (CAD)
- ♠️ **Poker Tracker** — ผลรายวัน/เดือน/ปี (100 Chips = C$1)

## ชีตที่ใช้ (ใน Google Sheet Van BIz)

`Products`, `Animals Lover`, `PetCareLog`, `AnimalPhotos`, `Jobs`, `Poker`

## โฟลเดอร์รูปใน Drive

ตั้งค่าไว้ใน `CONFIG` ด้านบนของ `Code.gs`
- `Animals Lover_Images` — รูปหน้าปกสัตว์
- `AnimalPhotos_Images` — รูปเพิ่มเติม
- `Products_Images` — รูปสินค้า

## บันทึกการแก้ไข

**2026-11-20**
- คลังสินค้า: แก้ไขสินค้าได้ทุกรายการ (ทั้งขายแล้ว/ยังไม่ขาย) — ชื่อ, รูป, วันที่, ทุน, ราคาตั้งขาย, โน้ต, สถานะขาย (ติ๊กออก = กลับเป็นยังไม่ขาย), ลบสินค้า
- เพิ่มสินค้าพร้อมรูปได้แล้ว (เดิมรูปไม่ถูกส่ง) และรูปที่อัปโหลดแสดงผลถูกต้อง
- PetCareLog: แก้บั๊กที่เขียนทับคอลัมน์ PlacementPhoto / FoodTrashBin / LitterTrashBin / Door / Hiding place เป็นค่าว่าง — ตอนนี้เขียนเฉพาะช่องที่แก้ และคง checkbox เดิม
- เพิ่มช่อง Door / Balcony / Window และ Hiding place ในฟอร์มสัตว์
- Jobs: แก้ไขแล้วไม่ทับ Sessions / Source เดิม, เพิ่มโน้ต, ตรวจวันสิ้นสุดไม่ก่อนวันเริ่ม
- เปลี่ยนรูปหน้าปกแล้วแสดงรูปใหม่ทันที, ย่อรูปก่อนอัปโหลด (เร็วขึ้น)
- ID ใหม่เป็นแบบ 8 ตัว hex ไม่ซ้ำ, ใช้ timezone ของชีต, ล็อกการเขียนกันข้อมูลชนกัน
- ทุกปุ่มแสดง error ถ้าบันทึกไม่สำเร็จ (ไม่หมุนค้าง), ชื่อที่มี ' ไม่ทำให้ปุ่มเสีย

## วิธี deploy

1. เปิดชีต Van BIz → **Extensions → Apps Script**
2. วางโค้ดจาก `apps-script/Code.gs` และ `apps-script/Index.html` ทับไฟล์เดิม แล้วกด Save
3. **ครั้งแรกครั้งเดียว:** เลือกฟังก์ชัน `setupApiKey` → กด Run → ดูรหัสเข้าใช้ใน Execution log
4. **Deploy → Manage deployments** → ✏️ แก้ deployment เดิม → Version: **New version**, Execute as: **Me**, Who has access: **Anyone** → Deploy
   (ลิงก์ `/exec` เดิมไม่เปลี่ยน)
5. เปิด https://thampofficial.github.io/VanBiz/ แล้วใส่รหัสจากข้อ 3

ข้อมูลในชีตปลอดภัยแม้ repo เป็น Public เพราะ API ตอบเฉพาะคำขอที่มีรหัสถูกต้อง และรหัสเก็บใน Script Properties ไม่ได้อยู่ในโค้ด
