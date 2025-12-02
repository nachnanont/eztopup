// src/lib/imageMap.js

// กุญแจฝั่งซ้าย คือ "ชื่อเกมจาก API" (ต้องสะกดให้ตรงเป๊ะๆ)
// ค่าฝั่งขวา คือ "ที่อยู่ไฟล์รูป" (เริ่มจาก /game-icons/...)

export const localImageMap = {
  // ตัวอย่าง: ถ้า API ส่งชื่อมาว่า "RoV (Arena of Valor)" ให้ใช้รูป rov.png
  "RoV (Arena of Valor)": "/game-icons/rov.png",
  "Garena RoV": "/game-icons/rov.png", // บางที API ส่งชื่อมาหลายแบบ ใส่เผื่อไว้ได้
  
  // ตัวอย่างเกมอื่นๆ (แก้ตามจริงที่คุณมี)
  "Garena ROV Mobile": "/game-icons/rov.png",
  "RoV (TH)": "/game-icons/rov.png",
  "Valotant (Thailand)": "/game-icons/valorant.png",
  "Valotant (Indonesia)": "/game-icons/valorant.png",
  "Valotant (Malaysia)": "/game-icons/valorant.png",
  "Valotant (Philippines)": "/game-icons/valorant.png",
  "Valotant (Thailand)": "/game-icons/valorant.png",
  "Valotant (Singapore)": "/game-icons/valorant.png",
  
  // ใส่เพิ่มไปเรื่อยๆ ตามเกมที่มี...
};

// ฟังก์ชันช่วยหารูป (เผื่ออนาคต API มีรูปมาให้ จะได้ใช้ของ API ก่อน)
export const getGameImage = (apiProductName, apiImage) => {
    // 1. ถ้า API มีรูปมาให้ ให้ใช้รูป API ก่อน (เผื่อในอนาคตเขาส่งมา)
    if (apiImage) return apiImage;
    
    // 2. ถ้าไม่มี ให้มาหาในสมุดหน้าเหลืองของเรา
    // ลองหาแบบตรงตัวเป๊ะๆ
    if (localImageMap[apiProductName]) {
        return localImageMap[apiProductName];
    }

    // 3. (Optionเสริม) ลองหาแบบคล้ายๆ เช่น API ส่ง "RoV : แพ็คคุ้ม" แต่เรามีแค่ "RoV"
    // ส่วนนี้อาจจะซับซ้อนไป เดี๋ยวค่อยทำทีหลัง เอาแบบตรงตัวก่อนครับ
    
    // 4. ถ้าหาไม่เจอเลย ส่งค่า null กลับไป (เพื่อไปโชว์กล่องสีเทา)
    return null;
}