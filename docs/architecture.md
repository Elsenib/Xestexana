# Xəstəxana Qeydiyyatı və Onlayn Randevu Platforması

## Məqsədlər

- Xəstəxana qeydiyyatı, pasiyent tarixçəsi və həkim təqvimi üçün mərkəzləşdirilmiş SQL veri modeli
- Veb və mobil üzərindən gələcək tarixləri də əhatə edən onlayn randevu axını
- Yüksək paralel istifadə üçün üfüqi böyüməyə uyğun API təbəqəsi
- Böyük veri həcmində indekslənmiş və izlənə bilən məlumat axını

## Tövsiyə edilən quruluş

- apps/api: Fastify əsaslı REST API
- apps/web: Next.js ilə rol əsaslı panel (admin, həkim, qeydiyyat, pasiyent)
- apps/mobile: Expo React Native ilə pasiyent yönümlü mobil təcrübə
- prisma: PostgreSQL əsaslı məlumat modeli və Prisma Client
- packages/shared: ortaq tiplər və paylaşılmış modellər

## Kritik texniki məqamlar

- Randevu cədvəllərində həkim, pasiyent və zaman sahələri indekslə saxlanılır.
- Gələcək tarixli rezervasiyalar üçün slot məntiqi ayrıca cədvəldə modellənir.
- API girişində Zod ilə doğrulama tətbiq olunur.
- Lokal inkişaf mühitində PostgreSQL bağlantısı `DATABASE_URL` ilə idarə olunur.
- Bütün tenant məlumat sorğuları JWT-dəki `clinicId` sərhədi daxilində işləməlidir.
- Həssas API endpoint-ləri JWT, rol yoxlaması və rate-limit ilə qorunur.
- Server tərəfində health-check və graceful shutdown mövcuddur.
