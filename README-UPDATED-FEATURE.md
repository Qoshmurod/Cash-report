# Clinika - Smenani Yopish va To'lov Jarayonida Funksiyasi

Ushbu yangilangan paketda Clinika loyihasiga **"To'lov jarayonda / Kunni yopish" (Pending Shift)** funksionalligi qo'shildi.

## Kiritilgan o'zgarishlar:
1. `backend/src/modules/payments/entities/payment.entity.ts`:
   - `isShiftClosed`, `shiftClosedAt`, `confirmedByUserId` maydonlari qo'shildi.
2. `backend/src/modules/payments/payments.controller.ts`:
   - `GET /payments/pending-shift` - kutilayotgan to'lovlar ro'yxatini olish.
   - `POST /payments/close-shift` - kunni yopish va to'lovlarni umumiy hisobotga o'tkazish.
3. `backend/src/modules/payments/payments.service.ts`:
   - Smenani yopish va kutilayotgan to'lovlarni qayta ishlash logikasi kiritildi.
4. `frontend/app/pages/registrar/pending-payments.vue`:
   - Kassir uchun "To'lov jarayonda" oynasi va "Kunni yopish" tugmasi taqdim etildi.

## Ishga tushirish:
Loyiha papkasiga o'tib:
```bash
docker-compose down
docker-compose up -d --build
```
