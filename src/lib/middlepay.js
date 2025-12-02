import axios from 'axios';

const API_KEY = process.env.MIDDLE_PAY_API_KEY;
const BASE_URL = process.env.MIDDLE_PAY_URL;

export const getProducts = async () => {
  let games = [];
  let apps = [];

  // 1. ดึงเกม
  try {
    const gamesRes = await axios.get(`${BASE_URL}/api/v1/products/list`, { 
        headers: { 'X-API-Key': API_KEY } 
    });
    
    if (gamesRes.data && Array.isArray(gamesRes.data)) {
        games = gamesRes.data.map(item => ({
            ...item,
            category: 'game',
        }));
    } else {
        // เปลี่ยนเป็น warn เพื่อไม่ให้เด้ง Popup สีแดง
        console.warn("API Games returned non-array data:", gamesRes.data);
    }
  } catch (error) {
    // เปลี่ยนเป็น warn
    console.warn("Notice: Failed to fetch Games (Using empty list):", error.message);
  }

  // 2. ดึงแอปพรีเมียม
  try {
    const appsRes = await axios.get(`${BASE_URL}/api/v1/premium/services/list`, { 
        headers: { 'X-API-Key': API_KEY } 
    });

    if (appsRes.data && Array.isArray(appsRes.data)) {
        apps = appsRes.data.map(item => ({
            ...item,
            id: item.id || item.service_id,
            name: item.name || item.service_name,
            image: item.image || item.icon || null,
            services: item.services || item.packages || [],
            category: 'premium'
        }));
    } else {
        // เปลี่ยนเป็น warn
        console.warn("API Premium Apps returned non-array data:", appsRes.data);
        throw new Error("Invalid Data format");
    }
  } catch (error) {
    // เปลี่ยนเป็น warn: กล่องแดงจะหายไป แต่ Mock Data ยังทำงานปกติ
    console.warn("Notice: Switching to Mock Data for Premium Apps:", error.message);
    
    // --- MOCK DATA ---
    apps = [
        {
            id: 'mock-yt',
            name: 'YouTube Premium',
            image: null,
            category: 'premium',
            services: [
                { id: 'yt-ind-1', name: 'Individual 1 Month (เมลล์ตนเอง)', price: 45 },
                { id: 'yt-fam-1', name: 'Family 1 Month (เมลล์ตนเอง)', price: 89 },
                { id: 'yt-ind-year', name: 'Individual 1 Year', price: 450 }
            ]
        },
        {
            id: 'mock-NF',
            name: 'Netflix',
            image: null,
            category: 'premium',
            services: [
                { id: 'nf-mobile', name: 'Mobile Plan (1 จอ)', price: 99 },
                { id: 'nf-basic', name: 'Basic Plan (1 จอ HD)', price: 169 },
                { id: 'nf-std', name: 'Standard Plan (2 จอ FHD)', price: 349 },
                { id: 'nf-prm', name: 'Premium Plan (4 จอ 4K)', price: 419 }
            ]
        },
        {
            id: 'mock-spotify',
            name: 'Spotify Premium',
            image: null,
            category: 'premium',
            services: [
                { id: 'sp-ind', name: 'Individual 1 Month', price: 69 },
                { id: 'sp-fam', name: 'Family 1 Month', price: 119 }
            ]
        },
        {
            id: 'mock-disney',
            name: 'Disney+ Hotstar',
            image: null,
            category: 'premium',
            services: [
                { id: 'dp-mobile', name: 'Mobile Plan 1 Year', price: 799 },
                { id: 'dp-premium', name: 'Premium Plan 1 Year', price: 2290 }
            ]
        }
    ];
  }

  return [...games, ...apps];
};