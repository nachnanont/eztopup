export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/profile/', '/history/'], // ห้าม Google เข้าหน้าส่วนตัว
    },
    sitemap: 'https://eztopup.net', // ⚠️ ใส่โดเมนจริง
  }
}