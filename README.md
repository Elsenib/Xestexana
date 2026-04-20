# Hospital Platform Başlanğıcı

Bu repo xəstəxana qeydiyyatı, admin paneli, veb üzərindən onlayn randevu və mobil tətbiq üçün genişlənə bilən başlanğıc skeleti təqdim edir.

## Texnologiyalar

- Backend: Fastify, Prisma, SQLite, Zod
- Veb: Next.js 15, React 19
- Mobil: Expo React Native
- Ortaq tiplər: packages/shared

## Quraşdırma

1. `.env.example` faylını `.env` olaraq kopyalayın.
2. `.env` daxilində `DATABASE_URL` dəyərini bu formata gətirin: `file:./dev.db`
3. `npm install` ilə asılılıqları quraşdırın.
4. `npm run db:generate` əmrini işə salın.
5. `npx prisma db push` ilə sxemi lokal bazaya tətbiq edin.

## İşə salma

- API: `npm run dev:api`
- Veb: `npm run dev:web`
- Mobil: `npm run dev:mobile`

Qeyd: Admin panel ayrıca tətbiq deyil, veb tətbiqin daxilindədir. Admin hesabı ilə giriş etdikdə admin görünüşü açılır.

## Monitoring və error tracking

API daxilində daxili observability blokları aktivdir:

- Metriklər: `GET /api/observability/metrics`
- Xəta hadisələri: `GET /api/observability/errors?limit=30`
- Sağlamlıq yoxlaması: `GET /api/health`

Metrik endpoint CPU istifadəsinin təxmini faizi, RAM istifadə məlumatı, orta/p95 cavab müddəti və sorğu axını statistikalarını qaytarır.

## Lisenziya qeydiyyatı

Bu layihə hazırda xüsusi mülkiyyət lisenziyası ilə qorunur. İstifadə, kopyalama, dəyişdirmə və yayım yalnız müəllifin açıq yazılı icazəsi ilə mümkündür. Ətraflı mətn üçün `LICENSE` faylına baxın.

## Qeyd

Bu skelet istehsal səviyyəli təməl verir. Real mühitdə əlavə olaraq audit log, hüquqi uyğunluq, testlər, CI/CD, mərkəzləşdirilmiş loglama, növbə infrastrukturu və ehtiyatlama strategiyası tamamlanmalıdır.