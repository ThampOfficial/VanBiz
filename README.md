# VanBiz

Pet Sitter, Inventory & Poker Manager — Google Apps Script web app ที่ใช้ Google Sheet **Van BIz** เป็นฐานข้อมูล

## ไฟล์

| ไฟล์ | หน้าที่ |
|---|---|
| `Code.gs` | ฝั่งเซิร์ฟเวอร์ (Apps Script) อ่าน/เขียนชีต และอัปโหลดรูปขึ้น Google Drive |
| `Index.html` | หน้าเว็บทั้งหมด (Tailwind + Chart.js) เรียกเซิร์ฟเวอร์ผ่าน `google.script.run` |

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

## วิธี deploy (เมื่อแก้โค้ดใน GitHub แล้ว)

1. เปิดชีต Van BIz → **Extensions → Apps Script**
2. วางโค้ดจาก `Code.gs` และ `Index.html` ทับไฟล์เดิม แล้วกด Save
3. **Deploy → Manage deployments** → แก้ deployment เดิม → Version: **New version** → Deploy
   (ลิงก์ `/exec` เดิมจะยังใช้ได้)

> ทางเลือก: ใช้ [clasp](https://github.com/google/clasp) (`clasp push`) เพื่อส่งโค้ดจากเครื่องขึ้น Apps Script ได้โดยไม่ต้องก๊อปวาง
