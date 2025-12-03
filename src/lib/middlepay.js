import axios from 'axios';

const API_KEY = process.env.MIDDLE_PAY_API_KEY;
const BASE_URL = process.env.MIDDLE_PAY_URL;

export const getProducts = async () => {
  let games = [];
  let apps = [];

  try {
    const gamesRes = await axios.get(`${BASE_URL}/api/v1/products/list`, { headers: { 'X-API-Key': API_KEY } });
    if (Array.isArray(gamesRes.data)) {
        games = gamesRes.data.map(item => ({ ...item, category: 'game' }));
    }
  } catch (error) {
    console.warn("Games API Warning:", error.message);
  }

  try {
    const appsRes = await axios.get(`${BASE_URL}/api/v1/premium/services/list`, { headers: { 'X-API-Key': API_KEY } });
    // เพิ่มการเช็คว่าข้อมูลเป็น Array จริงไหม (แก้ปัญหา map is not a function)
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
        throw new Error("Invalid API Data");
    }
  } catch (error) {
    console.warn("Premium Apps API Warning (Using Mock):", error.message);
    // Mock Data สำรอง
    apps = [
        { id: 'mock-yt', name: 'YouTube Premium', category: 'premium', services: [{ id: 'yt-1', name: 'Individual 1 Month', price: 45 }] },
        { id: 'mock-nf', name: 'Netflix', category: 'premium', services: [{ id: 'nf-1', name: '1 Screen HD', price: 99 }] }
    ];
  }

  return [...games, ...apps];
};