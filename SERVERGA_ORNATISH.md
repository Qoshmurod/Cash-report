# Serverga o‘rnatish (Ubuntu 22.04 / 24.04)

Talablar: Ubuntu server (kamida 2 CPU, 4 GB RAM, 20 GB disk), domen nomi (masalan `clinic.example.uz`) va uning DNS **A** yozuvi server IP manziliga yo‘naltirilgan bo‘lishi.

## 1. Bir buyruqda o‘rnatish (tavsiya etiladi)

```bash
# zipni serverga yuklang (kompyuteringizdan)
scp Clinika-main.zip user@SERVER_IP:/tmp/

# serverda
sudo apt-get update && sudo apt-get install -y unzip
sudo mkdir -p /opt && cd /opt
sudo unzip /tmp/Clinika-main.zip && sudo mv Clinika-main shifoxona && cd shifoxona
sudo ./deploy/install.sh clinic.example.uz you@example.uz
```

Skript o‘zi bajaradi:
1. Docker o‘rnatadi;
2. `.env.production` faylini **tasodifiy kuchli parollar** bilan yaratadi;
3. konteynerlarni build qilib ishga tushiradi (migratsiyalar avtomatik);
4. Nginx’ni sozlaydi (`/` → sayt, `/api/` → API, `/socket.io/` → real vaqt);
5. Let’s Encrypt orqali HTTPS ulaydi.

Oxirida ekranda va `deploy/CREDENTIALS.txt` faylida kirish ma’lumotlari chiqadi:

| Akkaunt | Vazifa |
|---|---|
| `superadmin` | Super admin — barcha bo‘limlar, xodimlarga bo‘limlarga ruxsat beradi; audit log / kirish tarixi / xodimlar ro‘yxatida boshqalarga ko‘rinmaydi |
| `admin01` | Administrator |
| `panel01` | Kiosk (sensorli ekran) |

Birinchi kirishda parolni almashtirish majburiy. `deploy/CREDENTIALS.txt` ni o‘qib bo‘lgach o‘chiring.

## 2. Birinchi sozlash (brauzerda)

1. `superadmin` bilan kiring → **Sozlamalar**: klinika nomi, logotip, chek matni, ovozli e’lon tili.
2. **Bo‘limlar** va **Xizmatlar**: namunaviy ro‘yxatni o‘zingiznikiga moslang (narxlar, navbat harflari).
3. **Xodimlar** → yangi xodim: rol tanlang (Administrator, Registrator, **Hisobchi**, **Rahbar**, Shifokor, Kiosk).
4. Xodim qatoridagi `⋮` → **Bo‘limlarga ruxsat** (faqat super admin ko‘radi): xodim qaysi bo‘limlarga kira olishini belgilang. Belgilanmasa, rolning standart ruxsatlari ishlaydi:

| Rol | Standart bo‘limlar |
|---|---|
| Administrator | hammasi (shifokor kabineti va kioskdan tashqari) |
| Registrator | Registratura, Mijozlar, To‘lovlar, Kunni yopish, Navbatlar |
| Hisobchi | Shartnomalar, Mijozlar |
| Rahbar | Dashboard, Hisobotlar, Shartnomalar, To‘lovlar |

"Kafolat xati", "Kafolat xatini tasdiqlash" va "Ruxsatlarni belgilash" hech bir rolga avtomatik berilmaydi — faqat super admin (yoki u vakolat bergan xodim) beradi.
| Shifokor | Shifokor kabineti |

5. **Shartnomalar**: shartnoma (umumiy summasi bilan) → mijozlar ro‘yxati → o‘tkazmalar → ogohlantirish foizi (standart 10%).
6. **Kafolat xati → qarzga o‘tkazish** (shartnoma summasi to‘liq o‘tkazilmagan bo‘lsa, masalan 10 mln dan 7 mln o‘tkazilgan, 3 mln qarz):
   - super admin kerakli xodimlarga ruxsat beradi: **"Kafolat xati va qarzga o‘tkazish"** (xat kiritadi) va **"Kafolat xatini tasdiqlash, namunalar"** (namuna kiritadi, mos kelmagan xatni tasdiqlaydi/rad etadi, qarzni yopadi);
   - Shartnomalar → **Kafolat xati namunalari**: namuna matni, o‘rinbosarlar `{xat_raqami} {sana} {tashkilot} {shartnoma_raqami} {summa} {shartnoma_summasi}`;
   - shartnoma → **Kafolat xatlari** → xat matnini kiriting: namunaga mos kelsa qarz darhol ochiladi, aks holda tasdiqlovchi xodim ruxsat bergandan keyin ochiladi;
   - qarz limiti hech qachon "shartnoma summasi − o‘tkazilgan" dan oshmaydi; tashkilot pul o‘tkazganda qarz o‘z-o‘zidan yopiladi.
7. **Ruxsatlarni belgilash**: super admin xodimga **"Ruxsatlarni belgilash"** bo‘limini beradi va oynaning pastida u boshqalarga **bera oladigan** ruxsatlarni belgilaydi. Bu xodim boshqalarga faqat shu ruxsatlarni bera oladi (o‘ziga, super admin'ga va "ruxsat berish" huquqini bera olmaydi).

## 3. Kundalik ishlatish

| Buyruq (`/opt/shifoxona` ichida) | Vazifa |
|---|---|
| `sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production ps` | holat |
| `... logs -f backend` | API loglari |
| `... restart` | qayta ishga tushirish |
| `sudo ./deploy/backup.sh` | baza nusxasi (`backups/`) |

Kunlik avtomatik nusxa: `sudo crontab -e` →
```
0 2 * * * /opt/shifoxona/deploy/backup.sh
```

## 4. Yangilash

```bash
cd /opt/shifoxona
# yangi zipdagi fayllarni ustidan yozing (.env.production ni saqlab qoling)
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d --build
```
Yangi migratsiyalar konteyner ishga tushganda avtomatik qo‘llanadi.

## 5. Test ma’lumotlarini tozalash

Agar serverda sinov uchun mijoz/to‘lovlar kiritilgan bo‘lsa (xodimlar, xizmatlar, sozlamalar saqlanadi):
```bash
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production exec backend node dist/database/seeds/clear-demo.js --yes
```

## 6. Tillar

Interfeys: o‘zbek, rus, ingliz, turk (yuqori o‘ng burchakdagi til tugmasi). Standart til: `.env.production` → `NUXT_PUBLIC_DEFAULT_LOCALE=uz`.

## 7. Muammo bo‘lsa

- Sayt ochilmasa: `sudo nginx -t`, `sudo systemctl status nginx`, `... ps` (barcha konteynerlar `healthy` bo‘lishi kerak).
- HTTPS chiqmasa: DNS server IP’ga yo‘naltirilganini tekshiring va `sudo certbot --nginx -d clinic.example.uz`.
- API holati: `curl http://127.0.0.1:4000/api/v1/health`.
