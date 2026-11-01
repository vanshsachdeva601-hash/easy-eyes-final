# Easy Eyes — chalane ka tareeka

Ye wahi project hai jo GitHub par hai, lekin isme **naya version** mila diya gaya hai:
reviews, wishlist, naya login page, server-side header/footer, fast image pipeline
(chhoti WebP photos) aur naya smooth scroll.

## Zaroorat
- **Node.js 20 ya usse naya** (better-sqlite3 ^12 ke liye). `node -v` se check karein.
- npm (Node ke saath hi aata hai).

## Steps
```bash
cd easy-eyes
npm install   # dependencies + fonts/Lenis download (internet chahiye, warna skip ho jayega)
npm start     # server start
```
Browser me kholein: **http://localhost:3000**

Development (file change par auto restart):
```bash
npm run dev
```

## Login
- Admin: `admin@easyeyes.com` / `Admin@123`
- Normal user: `/login.html` se signup kar lein.

## Login page background
Login page ke peeche ek constellation gallery hai (21st.dev ke component ka vanilla JS
port, `public/js/constellation.js`): 15 chhoti circular product photos ("stars") dheere
se drift karti hain, ek hi category wale frames ke beech lines banti hain, aur idle hone
par har 7 second me agla constellation highlight hota hai. Photos `/api/products` se aati
hain (sirf `-1` wali images). Background ka colour `#FCF8F6`, login card white.

## Hero video
Hero me **poora hero card ek video hai** (full-bleed), aur title / text / buttons uske
upar aate hain. Video file: `public/videos/hero.mp4` — 1280x720, ~3.5 MB, H.264,
34.8 sec, audio nahi (hero muted hi chalti hai). `muted` + `loop` autoplay, click par
pause/play. Poster `hero.jpg` tab dikhta hai jab tak video load nahi hoti.

Video badalni ho toh bas `public/videos/hero.mp4` replace kar dein aur `public/index.html`
me `<source src="/videos/hero.mp4?v=3">` ka `v=` number badha dein (browser cache se bachne
ke liye). Nayi video bhaari ho toh 720p / CRF 30 me compress kar lein:

```bash
ffmpeg -i nayi-video.mp4 -vf "scale=1280:-2,fps=30" -c:v libx264 -crf 30 -preset slow \
  -pix_fmt yuv420p -movflags +faststart -an public/videos/hero.mp4
```

## Naya kya hai
- **Product reviews + rating**: product page par stars, rating breakdown, verified purchase
  badge, apna review add/update/delete (login zaroori).
- **Wishlist**: har card par heart, header me count, apna `/wishlist.html` page.
- **Login/signup page**: photo background ke saath naya design.
- **Header/footer server se** render hote hain (pehle JS baad me lagata tha).
- **Naya scroll**: horizontal product strips snap ke saath, drag/swipe, native smooth scroll.
- **Fast images**: `/img/products/aria-1.jpg?w=640` par chhoti WebP photo banti hai (sharp),
  ek baar banne ke baad disk (`.cache/img`) se serve hoti hai.
- **404 page**, favicon, sitemap-friendly head tags, mobile header menu.
- Hover simple rakha gaya hai: photo halka zoom + doosri photo fade (koi 3D tilt nahi).

## Zaroori baatein
- `easy-eyes.db` pehli baar server chalne par khud ban jaati hai (schema + 15 products + admin user).
- `node_modules`, `.cache` aur `*.db` zip me nahi hain — `npm install` aur pehla `npm start` inhe bana dega.
- `.env` included hai (dev secret). Production me `JWT_SECRET` aur `ADMIN_PASSWORD` badal dein.
- Product photos `public/images/products/` me `slug-1.jpg`, `slug-2.jpg` … naming se auto detect hoti hain.
- Port badalna ho toh `.env` me `PORT=4000` kar dein.
- Root me jo `index.html` aur `js/common.js` hain wo duplicate/unused copies hain (server sirf `public/` serve karta hai).
