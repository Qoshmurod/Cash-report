# Klinika Kassasi

Nuxt 3 clinic cashier and patient-management app backed by Prisma and PostgreSQL.

## Funksiyalar

- **Super admin** — tizimdagi eng yuqori rol (avvalgi «Administrator» roli super adminga almashtirildi: mavjud `ADMIN` hisoblar server ishga tushganda avtomatik `SUPER_ADMIN` bo‘ladi). Super admin barcha bo‘lim va amallarga kiradi.
- **Rollar** (`/admin`) — super admin istalgancha rol yaratadi/tahrirlaydi/o‘chiradi: rol qaysi bo‘limlarga (Kassa, Bemorlar, Qabul, Shartnomalar, Kunni yopish, Xodimlar, Audit…) kira olishi, qaysi amallarni bajarishi va qaysi laboratoriya bo‘limlarini ko‘rishi belgilanadi.
- **Ruxsatlarni topshirish** (`/permissions`) — super admin xodimga istalgan ruxsatni beradi va «Boshqalarga bera oladi» belgisi bilan shu ruxsatni boshqa xodimlarga berish vakolatini ham beradi (masalan, rahbarga). Rahbar faqat shu ruxsatlarni beradi/oladi va vakolatni o‘zi tarqata olmaydi.
- **Xodimlar** (`/staff`) — ma’lumotlarini tahrirlash, kirish tarixi, deaktivatsiya/faollashtirish, tizimdan o‘chirish, parolni tiklash (super admin).
- **Xizmatlar va shifokorlar** (`/catalog`) — tahrirlash, deaktivatsiya, o‘chirish (o‘chirilgan xizmat nomi eski to‘lovlarda saqlanadi).
- **Audit jurnali va kirish tarixi** (`/audit`) — xodimlarning to‘lov, tahrir, o‘chirish, ruxsat berish, yuklash va kirish amallari. **Super admin amallari va kirishlari umuman saqlanmaydi.**
- **Shartnomalar** (`/contracts`) — shartnoma fayli bilan birga mijozlar ro‘yxati (Excel `.xlsx/.xls/.csv` yoki Word `.docx` jadval) yuklanadi. Tizim ustunlarni (F.I.O yoki Familiya/Ism/Otasining ismi, Telefon, Tug‘ilgan yili/sanasi, Lavozim, Manzil) avtomatik aniqlaydi, mijozlarni bemorlar bazasidagi mavjud bemorga bog‘laydi yoki yangisini yaratadi va shartnomaga biriktiradi.
- **Kafolat xatlari** — namuna (shablon) va kafolat xatlarini faqat `GUARANTEE_LETTERS_UPLOAD` ruxsati bor (super admin yoki u vakolat bergan shaxs ruxsat bergan) xodim yuklaydi.
- **Registratura / Kassa** — shartnoma asosida kelgan mijoz mavjud bemorlar orasidan qidiriladi (shartnoma belgisi bilan), xizmat(lar) tanlanadi va «Shartnoma asosida» to‘lov turi bilan (summa 0 bo‘lishi mumkin) kerakli laboratoriya bo‘limiga yo‘naltiriladi.
- **To‘lovni tahrirlash** — ortiqcha yoki noto‘g‘ri to‘lovda summa, tur, xizmatlar tuzatiladi; sabab majburiy, eski qiymat audit jurnalida qoladi.
- **Kunni yopish** (`/day-close`) — kun to‘lovlari tur/bo‘lim/shartnoma bo‘yicha filtrlanadi, kerakli to‘lovlar belgilanib Excelga yuklanadi, kun yopiladi. Yopilgan kunning to‘lovlarini o‘zgartirib bo‘lmaydi (super admin qayta ochishi mumkin).
- **Aloqa paneli** — super admin `/admin` sahifasida Telegram, Instagram, telefon yoki matn kiritsa, u har bir sahifaning eng yuqorisida ko‘rinadi.

## O‘z kompyuteringizda sinash (demo)

Docker Desktop o‘rnatilgan bo‘lsa:

```sh
git clone -b claude/quirky-hypatia-exc0rj https://github.com/Qoshmurod/Cash-report.git
cd Cash-report
copy .env.demo .env          # Mac/Linux: cp .env.demo .env
docker compose up -d --build
```

3–8 daqiqadan keyin `http://localhost:3000` — login `admin01`, parol `admin01`. `.env.demo` faqat sinov uchun; serverda `deploy/install.sh` o‘z maxfiy kalitlarini yaratadi.

## Serverga o‘rnatish

### Ubuntu VPS — bitta buyruq (tavsiya etiladi)

Talab: Ubuntu 22.04 / 24.04 / 26.04, 2 GB RAM (+ skript yaratadigan 2 GB swap), 5 GB disk.

Resurs sarfi (o‘lchangan): bo‘sh turganda dastur ~20–40 MB, PostgreSQL ~40 MB RAM, CPU ~0%. 300 ta to‘lov / 200 qidiruv yuklamasida eng ko‘pi ~60 MB + ~45 MB. Konteynerlar xotira chegarasi: dastur 320 MB, baza 256 MB — 4 GB serverda yana bir xuddi shunday dastur bemalol ishlaydi (ikkinchi nusxa uchun `.env` da `APP_PORT=3001` qo‘ying va boshqa papkaga klon qiling).

```sh
sudo apt-get update && sudo apt-get install -y git
git clone -b claude/quirky-hypatia-exc0rj https://github.com/Qoshmurod/Cash-report.git
cd Cash-report
sudo bash deploy/install.sh                                  # http://SERVER_IP
# yoki domen va HTTPS bilan:
sudo bash deploy/install.sh kassa.example.uz siz@gmail.com
```

Skript Docker, PostgreSQL, nginx (va domen berilsa HTTPS) ni o‘rnatadi, maxfiy kalitlarni avtomatik yaratadi, birinchi super adminni yaratib login/parolni ekranga chiqaradi (`/root/klinika-admin.txt` da ham saqlanadi). Qayta ishga tushirish xavfsiz. PR `main` ga qo‘shilgandan keyin `-b ...` qismini olib tashlang.

Yangilash: `git pull && sudo docker compose up -d --build`. Zaxira nusxa: `sudo docker compose exec db pg_dump -U kassa kassa > backup.sql`.

### Qo‘lda: Docker

```sh
cp .env.example .env        # POSTGRES_PASSWORD, NUXT_SESSION_SECRET, BOOTSTRAP_ADMIN_TOKEN ni to‘ldiring
docker compose up -d --build
```

Ilova `127.0.0.1:3000` da ishlaydi; `deploy/nginx.conf` ni nginx ga qo‘ying va `certbot --nginx` bilan HTTPS yoqing. HTTPS bo‘lmasa `.env` da `COOKIE_SECURE=false` qiling.

### Qo‘lda: Node.js 20.6+ va PM2

```sh
npm ci
npm run prisma:push        # sxemani bazaga qo‘llash (mavjud ma’lumotlar saqlanadi)
npm run build
pm2 start deploy/ecosystem.config.cjs
```

### Birinchi super admin

Baza bo‘sh bo‘lsa, bir marta:

```sh
curl -X POST https://kassa.example.uz/api/auth/bootstrap \
  -H "x-bootstrap-token: $BOOTSTRAP_ADMIN_TOKEN" -H "content-type: application/json" \
  -d '{"username":"admin","password":"kamida-12-belgili-parol"}'
```

Keyin super admin bilan kiring → **Super admin** sahifasida rollarni yarating → **Xodimlar**da xodim qo‘shib, rol biriktiring.

### Vercel / Supabase

`vercel.json` production deployda (`DIRECT_URL` sozlangan bo‘lsa) `prisma db push` ni o‘zi bajaradi; preview deploylar bazaga tegmaydi. Vercel'da `DATABASE_URL`, `DIRECT_URL`, `NUXT_SESSION_SECRET` sozlangan bo‘lishi kifoya. Vercel so‘rov hajmi 4.5 MB bilan cheklangan, shuning uchun katta shartnoma fayllari uchun o‘z serveringiz yaxshiroq.

## Texnik eslatmalar

- Fayllar (shartnoma, kafolat xati) PostgreSQL ichida saqlanadi — alohida fayl ombori kerak emas. Bitta fayl 15 MB gacha.
- Eski `.doc` formati o‘qilmaydi — ro‘yxatni `.docx` yoki Excel ko‘rinishida saqlang.
- Sxema o‘zgarishlari faqat qo‘shimcha (additive): mavjud bazaga `prisma db push` ma’lumot yo‘qotmasdan qo‘llanadi.
- Vaqt mintaqasi `APP_TZ_OFFSET_MINUTES` (standart 300 = Toshkent) — «bugun», kunni yopish va hisobotlar shu bo‘yicha.

Validation:

```sh
npm run typecheck
npm run build
```
