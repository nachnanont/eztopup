import axios from 'axios';

export const sendAdminNotify = async (message) => {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!token || !chatId) return;

    // ยิง API ของ Telegram
    await axios.post(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML' // จัดรูปแบบตัวหนา/เอียงได้
      }
    );
  } catch (error) {
    console.error('Telegram Notify Error:', error.message);
  }
};