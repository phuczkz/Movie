<div align="center">

## Movie – Ứng dụng xem phim

Khám phá, xem và lưu phim/series với trải nghiệm mượt mà trên web.

</div>

### Giới thiệu
Ứng dụng React + Vite giúp người dùng duyệt, tìm kiếm và xem phim/series. Dữ liệu lấy từ nhiều nguồn (KKphim, TMDB), hỗ trợ đăng nhập qua Firebase, lưu danh sách yêu thích và xem trực tiếp qua HLS.

### Yêu cầu
- Node.js >= 18
- npm (đi kèm Node) hoặc pnpm/yarn nếu bạn thích

### Cài đặt & chạy
1) Cài dependencies
```bash
npm install
```
2) Tạo file `.env.local` ở thư mục gốc và điền các biến môi trường:
```bash
# Firebase
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# TMDB
VITE_TMDB_API_KEY=...
VITE_TMDB_API=https://api.themoviedb.org/3
VITE_TMDB_IMAGE_BASE=https://image.tmdb.org/t/p/w500
VITE_TMDB_BACKDROP_BASE=https://image.tmdb.org/t/p/w780

# Nguồn phim KKphim/Ophim
VITE_KKPHIM_API=https://phimapi.com/v1/api
VITE_KKPHIM_IMAGE_CDN=https://phimimg.com
VITE_MOVIE_API=<api goc cho ophim nếu có>
VITE_MOVIE_IMAGE_CDN=<cdn ảnh cho ophim nếu có>
```
3) Chạy dev server
```bash
npm run dev
```

### HLS Proxy (m3u8/ts)
Project da co san proxy server tai [server.js](server.js) de tranh chan mang doi voi luong HLS.

1) Cai dependency (neu chua cai)
```bash
npm install
```

2) Chay proxy local
```bash
npm run proxy:start
```
Mac dinh proxy chay o `http://localhost:3000` va health check o `http://localhost:3000/health`.

3) Cau hinh frontend dung proxy
Tao/bo sung file `.env.local`:
```bash
VITE_HLS_PROXY_BASE=http://localhost:3000
```

4) Chay frontend
```bash
npm run dev
```

5) Chay dong thoi frontend + proxy (tuy chon)
```bash
npm run dev:all
```

### Deploy proxy len Railway
Khuyen nghi deploy proxy bang `GitHub Repository` (khong dung `Function`).

1) Push code hien tai len GitHub.
2) Railway -> New Project -> GitHub Repository -> chon repo nay.
3) Trong service Railway, dat:
- Build Command: `npm install`
- Start Command: `npm run proxy:start`
- Root Directory: `/`

4) Them Environment Variables:
```bash
PORT=3000
PROXY_ALLOWED_HOSTS=ophim1.com,phimapi.com,kkphim
FRONTEND_ORIGIN=https://your-frontend-domain
PROXY_TIMEOUT_MS=25000
```

5) Generate public domain cho service Railway, vi du `https://movie-proxy.up.railway.app`.
6) Tren frontend, cap nhat `.env.local` (hoac env production):
```bash
VITE_HLS_PROXY_BASE=https://movie-proxy.up.railway.app
```


### Góp ý & phát triển
- Pull request và issue luôn được hoan nghênh. Hãy đảm bảo chạy `npm run lint` trước khi gửi PR.
