# Xəstəxana platforması

Bu monorepo xəstəxana qeydiyyatı, rol əsaslı idarəetmə paneli, onlayn randevu, tibbi qeydlər, mobil və Electron tətbiqi üçün başlanğıc platformadır.

## Texnologiyalar

- Backend: Fastify, Prisma, PostgreSQL, Zod
- Veb: Next.js 15, React 19, statik export
- Mobil: Expo React Native
- Ortaq tiplər: packages/shared

## Quraşdırma

1. `.env.example` faylını `.env` olaraq kopyalayın.
2. `JWT_SECRET` və `ADMIN_SETUP_KEY` dəyərlərini unikal, güclü sirlərlə dəyişin.
3. PostgreSQL-i başladın: `docker compose up -d postgres`.
4. `npm install` ilə asılılıqları quraşdırın.
5. `npm run db:generate` və `npm run db:migrate` əmrlərini işlədin.

## İşə salma

- API: `npm run dev:api`
- Veb: `npm run dev:web`
- Mobil: `npm run dev:mobile`
- Desktop development: `npm run dev:desktop`
- Desktop installer: `npm run build:desktop`

Qeyd: Admin panel ayrıca tətbiq deyil, veb tətbiqin daxilindədir. Admin hesabı ilə giriş etdikdə admin görünüşü açılır.

## Monitoring və error tracking

API daxilində daxili observability blokları aktivdir. Health endpoint xaricində bu endpoint-lər admin JWT tələb edir:

- Metriklər: `GET /api/observability/metrics`
- Xəta hadisələri: `GET /api/observability/errors?limit=30`
- Sağlamlıq yoxlaması: `GET /api/health`

Metrik endpoint CPU istifadəsinin təxmini faizi, RAM istifadə məlumatı, orta/p95 cavab müddəti və sorğu axını statistikalarını qaytarır.

## Yoxlama

- API build: `npm run build --workspace api`
- Web production build: `npm run build:web`
- Mobil type-check: `npx tsc -p apps/mobile/tsconfig.json --noEmit`
- Təhlükəsizlik smoke testləri: `npm run test:security`

## Lisenziya qeydiyyatı

Bu layihə hazırda xüsusi mülkiyyət lisenziyası ilə qorunur. İstifadə, kopyalama, dəyişdirmə və yayım yalnız müəllifin açıq yazılı icazəsi ilə mümkündür. Ətraflı mətn üçün `LICENSE` faylına baxın.

## Qeyd

Bu repo işlək baza və prototipdir. Real pasiyent məlumatları ilə istifadədən əvvəl audit log, hüquqi uyğunluq, avtomatik backup/restore sınağı, daha geniş inteqrasiya testləri və mərkəzləşdirilmiş loglama tamamlanmalıdır.
