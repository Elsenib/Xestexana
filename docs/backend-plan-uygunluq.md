# Backend-Plan Uyğunluq Xəritəsi

Bu sənəd Railway-dəki mövcud backend imkanları ilə `LovelyDent_v2(2).md` planının kəsişməsini göstərir.

## 1) Hazırda istifadə ediləcək (uyğun olan) modullar

- Auth və rol əsaslı giriş:
  - `POST /api/auth/login`
  - `GET /api/auth/me`
- Pasiyent idarəetməsi (əsas):
  - `GET /api/patients`
  - `POST /api/patients`
  - `GET /api/patients/:id/details`
- Həkim idarəetməsi (əsas):
  - `GET /api/doctors`
  - `POST /api/doctors`
- Randevu sistemi (əsas):
  - `GET /api/appointments/availability`
  - `POST /api/appointments`
- İstifadəçi/işçi idarəetməsi (əsas):
  - `GET /api/admin-users`
  - `GET /api/nurses`

## 2) Plan var, amma backenddə tam deyil (növbəti mərhələ)

- Randevu dəyişmək/ləğv etmək endpoint-ləri
- Pasiyent doğum günü bildirişləri
- Həkim iş qrafiki/performans/faiz/maaş
- Müalicə modulu üzrə geniş xidmət və zəmanət axını
- Kassa/maliyyə/anbar modulları
- Bildiriş və xatırlatma (SMS/WhatsApp/email)
- Hesabatlar (PDF/Excel)

## 3) Frontend davranışı

- Frontend yalnız backenddə olan endpoint-lərə bağlanır.
- `tasks` endpointi backenddə yoxdursa Tapşırıqlar bölməsi gizlədilir.
- `observability` endpointi backenddə yoxdursa metrik kartı fallback rejimində göstərilir.

## 4) Növbəti əlavə sırası (təklif)

1. Randevu update/cancel
2. Task sistemi (əgər Railway versiyasında yoxdursa)
3. Müalicə planı + xidmət siyahısı
4. Kassa (ödəniş/depozit/borc)
5. Bildiriş modulu
6. Hesabat export (PDF/Excel)
