# Xestexana Layihəsi Üzrə Qısa Özet

## İstifadə olunan dillər və texnologiyalar

- **TypeScript**: əsas backend və frontend kodu üçün istifadə olunur.
- **JavaScript**: bəzi frontend və paket skriptləri üçün mövcuddur.
- **React / Next.js**: `apps/web` içində frontend veb tətbiqi üçün istifadə olunur.
- **Fastify**: `apps/api` backend serveri üçün seçilmiş Node.js server çərçivəsidir.
- **Prisma**: verilənlər bazası ORM-i kimi istifadədədir və `schema.prisma` faylı ilə idarə olunur.
- **SQLite**: local inkişaf üçün `DATABASE_URL="file:./dev.db"` olaraq konfiqurasiya olunub.
- **Electron**: `apps/desktop` içində desktop tətbiqi üçün istifadə olunur.
- **React Native Web** və **Expo**: mobil/desktop istiqamətli komponentlər və paylaşılan kod üçün istifadə nəzərdə tutulub.
- **Vercel**: veb frontend üçün deploy platformasıdır.

## Layihə strukturu

- `apps/api/` - backend server və API routeləri
- `apps/web/` - Next.js frontend tətbiqi
- `apps/desktop/` - Electron desktop tətbiqi
- `apps/mobile/` - mobil tətbiq üçün başlıq
- `packages/shared/` - paylaşılmış kod paketləri
- `prisma/` - verilənlər bazası sxemi və miqrasiyalar

## Layihədə istifadə olunan əsas metodologiyalar

- **Monorepo**: bir neçə tətbiq eyni repoda idarə olunur.
- **Workspace scripts**: `package.json` içində `workspaces` və `npm run dev:api`, `npm run dev:web`, `npm run dev:desktop` kimi əmr məntiqi mövcuddur.
- **Environment variables**: frontend-də API ünvanını xarici dəyişən (`NEXT_PUBLIC_API_URL`) ilə idarə etmək məqsədi var.
- **Backend / Frontend ayrımı**: frontend Vercel-ə deploy edilə bilər, backend isə ayrıca host edilməlidir.

## İndiki problem

- Layihədə deploy problemi frontend və backend arasında əlaqənin düzgün qurulmaması ilə bağlıdır.
- `apps/web` içində API çağırışları `process.env.NEXT_PUBLIC_API_URL` ilə idarə olunur, amma bu dəyişən Vercel-də hələ düzgün təyin edilməyib.
- Bu səbəbdən frontend `http://localhost:4000/api` ünvanına yönəlir və Vercel üzərindən 404 xətası alınır.
- `apps/web/components/SubscriptionManager.tsx` faylında `http://localhost:4000` istifadə olunurdu; bu isə `/api` kökünü daxil etmədiyi üçün əlavə problem yaradırdı.
- İndiyə qədər həll üçün edilən dəyişikliklər:
  - `apps/desktop` workspace olaraq `package.json`-a əlavə edildi.
  - `vercel.json` və `next.config.ts` deploy üçün konfiqurasiya olundu.
  - `SubscriptionManager.tsx` içində API base URL `/api` ilə uyğunlaşdırıldı.

## Nəticə

- Əgər lokalda işləyirsinizsə, backend `http://localhost:4000`-də işləməlidir və frontend də bu ünvanı istifadə etməlidir.
- Əgər yalnız frontend deploy edirsinizsə, Vercel-də `NEXT_PUBLIC_API_URL` environment variable-ını backend-in yerləşdiyi konkret domainə təyin etmək lazımdır.
- Hazırda deploy problemi `frontend-də backend URL`-in doğru konfiqurasiya edilməməsindən qaynaqlanır.
