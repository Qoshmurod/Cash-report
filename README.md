# Clinika / LabMed — ishga tayyor versiya

Bu loyiha oddiy HTML emas. Nuxt 3 + NestJS + PostgreSQL + Prisma asosidagi to‘liq web-ilova.

## Ishga tushirish

1. Windows 11/Ubuntu serverga Docker Desktop yoki Docker Engine o‘rnating.
2. ZIP ni oching.
3. Loyiha papkasida terminal oching.
4. `docker compose up --build -d` buyrug‘ini bajaring.
5. Brauzerda `http://localhost` ni oching.
6. Birinchi kirish: **admin / Admin123!**

Birinchi kirishdan keyin admin parolini albatta almashtiring.

## Tayyor funksiyalar

- Login/logout va rollarga asoslangan ruxsatlar
- Super Admin, Rahbar, Buxgalter, Kassir, Mutaxassis
- Bosh sahifa dashboard
- Kassa va xizmat savati
- Plastik/karta, shartnoma va “To‘lov jarayonda”
- Kunni yopish
- Xizmat ko‘rsatish va bo‘lim bo‘yicha huquqlar
- Bemor/mijoz qo‘shish va tahrirlash
- Shartnoma, to‘langan/qoldiq summa va 10% ogohlantirish
- Xizmatlar CRUD, bo‘limlar CRUD
- Xodimlar CRUD va bo‘lim biriktirish
- Audit jurnali
- Kunlik/davr bo‘yicha hisobot
- To‘lov turi bo‘yicha hisobot
- Excel eksport
- Excel orqali xizmatlar importi
- PostgreSQL doimiy volume
- Nginx reverse proxy
- Docker Compose

## Excel import formati

Birinchi sheetda quyidagi ustunlar bo‘lishi kerak:

`code | name | deptKey | price`

Masalan:

`BAK-01 | Staphylococcus aureus tekshiruvi | bakteriologiya | 87376`

## Serverga o‘rnatish

Ubuntu serverda Docker Engine o‘rnating, loyihani serverga ko‘chiring va `docker compose up --build -d` ni ishga tushiring. Keyin domenni Nginx/Cloudflare orqali ulash mumkin.

## Backup

PostgreSQL backup:

`docker compose exec -T db pg_dump -U clinika -d clinika > backup.sql`

Restore:

`cat backup.sql | docker compose exec -T db psql -U clinika -d clinika`

## Muhim

Production uchun `.env` ichidagi JWT secret va DB parolini o‘zgartiring, HTTPS yoqing va muntazam backup qiling.
