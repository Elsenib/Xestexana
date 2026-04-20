# Hospital Platform Xüsusi İstifadə Təlimatı (AZ)

Bu sənəd layihənin texniki vəziyyətini, nələrin işlədiyini, necə işlədiyini və lokal quraşdırma addımlarını bir yerdə təqdim edir. Siz bu sənədi kopyaladıqdan sonra layihədən silə bilərsiniz.

## 1) Sistem lokal işləyirmi?

Bəli. Hazırkı qurulum **lokal inkişaf mühiti** üçündür.

- API lokalda `PORT` dəyişəninə əsasən işləyir (default: `4000`).
- Veb panel lokalda Next.js development server ilə açılır.
- Mobil tətbiq lokalda Expo üzərindən işləyir.
- Lokal məlumat bazası SQLite-dir və `DATABASE_URL=file:./dev.db` ilə işləyir.

İstehsal (production) üçün ayrıca server, reverse proxy, TLS, backup, CI/CD və infrastruktur konfiqurasiyası tələb olunur.

## 2) Hazırda nələr var?

### Backend (API)

- Fastify əsaslı API server
- Prisma + SQLite data modeli
- Randevu uyğunluq sorğusu və randevu yaratma endpoint-ləri
- Health endpoint: `GET /api/health`
- Observability endpoint-ləri:
  - `GET /api/observability/metrics`
  - `GET /api/observability/errors?limit=30`
- Structured request logging (method, path, status, response time)
- Yavaş sorğu xəbərdarlıqları (>= 1000 ms)
- In-memory error tracking (son xəta hadisələri)

### Veb

- Azərbaycan dilində rol əsaslı portal
- Admin, həkim, qeydiyyat və pasiyent üçün ayrı iş ekranları
- Sidebar əsaslı section keçidləri və admin üçün işçi/həkim deaktivasiya axını

### Mobil

- Azərbaycan dilində pasiyent yönümlü ekran
- Yaxınlaşan randevuların siyahısı və status etiketləri

### Hüquqi hissə

- Layihədə müəllifə məxsus istifadəyə yönəlmiş xüsusi mülkiyyət lisenziyası mövcuddur (`LICENSE`).

## 3) Monitoring necə işləyir?

`/api/observability/metrics` endpoint-i aşağıdakı məlumatları qaytarır:

- `totalRequests`, `totalErrors`, `slowRequests`
- `averageResponseMs`, `p95ResponseMs`, `maxResponseMs`
- `requestsPerMinuteEstimate`
- `process.cpuPercentEstimate` (təxmini CPU istifadəsi)
- `process.memory.*` (RSS, heap, external)
- `system.loadAverage`, `system.freeMemoryBytes`, `system.totalMemoryBytes`

Qeyd: Bu metriklər daxili telemetriya üçündür. Uzunmüddətli saxlanma üçün Prometheus/Grafana kimi xarici sistemə çıxarış əlavə etmək tövsiyə olunur.

## 4) Logging və error tracking necə işləyir?

### Logging

- Hər sorğu üçün cavab bitəndə log yazılır.
- Log daxilində req id, metod, path, status code və cavab müddəti var.
- 1000 ms və daha uzun cavablar `warn` səviyyəsində loglanır.

### Error tracking

- Server xətaları mərkəzi error handler-da tutulur.
- Xəta hadisələri yaddaşda saxlanılır (in-memory, limitli siyahı).
- Son xəta hadisələrini `GET /api/observability/errors?limit=30` ilə görmək mümkündür.

Qeyd: In-memory error tracking server restart olduqda təmizlənir. Daimi izləmə üçün Sentry/Elastic kimi sistemlər sonrakı mərhələdə inteqrasiya edilə bilər.

## 5) Lokal quraşdırma addımları

1. `.env.example` faylını `.env` adına kopyalayın.
2. `.env` içində `DATABASE_URL` dəyərini `file:./dev.db` edin.
3. Asılılıqları quraşdırın:

```bash
npm install
```

4. Prisma client yaradın:

```bash
npx prisma generate
```

5. Sxemi lokal bazaya tətbiq edin:

```bash
npx prisma db push
```

## 6) Servisləri işə salma

### API

```bash
npm run dev:api
```

### Veb

```bash
npm run dev:web
```

### Mobil

```bash
npm run dev:mobile
```

## 7) Tez yoxlama (Smoke test)

API qalxdıqdan sonra:

```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/observability/metrics
curl "http://localhost:4000/api/observability/errors?limit=10"
```

## 8) İstehsal üçün növbəti addımlar

- RBAC + JWT auth + refresh token mexanizmi
- Audit log və hüquqi uyğunluq axını
- Mərkəzləşdirilmiş log toplama (ELK/OpenSearch)
- Xarici error tracking (Sentry)
- Metrics scraping (Prometheus) və dashboard (Grafana)
- Load test və performans tənzimləməsi
- Ehtiyatlama və disaster recovery planı

## 9) ZIP-dən sonra 0 kompüterdə tam qurulum (addim-addim)

Bu bolme tam sifirdan komputerde (hec bir proqram yoxdur) Panel layihesini isletmek ucundur.

### 9.1 Indirilecek proqramlar

1. Node.js LTS (18+ ve ya 20+) 
2. Visual Studio Code
3. Git (opsionaldir, ZIP ile de isleyer)
4. Android Studio (yalniz Android emulator lazimdirsa)
5. Telefonla test edeceksense Expo Go app (Play Store / App Store)

Qeyd:
- Hazirki bu layihede lokal baza olaraq SQLite istifade olunur.
- Yani PostgreSQL mecburi deyil.

### 9.2 ZIP acildiqdan sonra terminal addimlari

Asagidaki emrleri sira ile islet:

```bash
cd C:\path\to\Panel
npm install
```

Env faylini hazirla:

```bash
copy .env.example .env
```

Sonra .env icinde DATABASE_URL deyerini bu formada et:

```env
DATABASE_URL="file:./dev.db"
```

Prisma qurulumu:

```bash
npx prisma generate
npx prisma db push
```

### 9.3 Ilk acilis yoxlamasi

API acildiqdan sonra yoxla:

```bash
curl http://localhost:4000/api/health
```

## 10) Ayri satirda qisa acilis emrleri

Mobil local acmaq: `npm run dev:mobile`

Web local acmaq: `npm run dev:web`

API local acmaq: `npm run dev:api`

Admin panel local acmaq: ayri bir admin projesi yoxdur, web ile birlikde acilir; komut eynidir `npm run dev:web` (admin hesabla giris et).

## 11) Terminal yazmadan tek klik ile acmaq

Layihe root qovluguna 3 fayl elave olunub:

- `Start-Panel.cmd`: API + Web serveri acir, sonra brauzerde paneli acir.
- `Start-Mobile.cmd`: Mobil Expo serverini acir.
- `Stop-Panel.cmd`: Acilan servisleri dayandirir.

Istifade qaydasi:

1. Panel qovluguna gir.
2. `Start-Panel.cmd` faylina iki defe klik et.
3. Sistem acildiqdan sonra brauzerde `http://localhost:3000` acilir.
4. Isin bitende `Stop-Panel.cmd` ile bagla.

Qeyd:
- Bu usul terminal emri yazmadan istifade ucundur.
- Arxa planda yenede Node prosesleri calisir; sadecesi sen emr yazmirsan.

## 12) Mobil "exe" meselesi (dogru format)

Mobil ucun adeten `exe` alinmir.

- Android ucun: `APK` (ozune yukleyib istifade etmek ucun en rahat)
- iOS ucun: `IPA` (Apple hesab ve signing teleb edir)

Ozun ucun Android APK almaq (en rahat yol):

1. Expo hesabi yarat.
2. Bir defe bu emrleri islet:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview
```

3. Build bitende Expo linki verir, oradan APK yukleyib telefona qura bilersen.

Alternativ (buildsiz, en tez test):

- `Start-Mobile.cmd` ile Expo ac
- Telefonda Expo Go ile QR kodu oxut

## 13) Sənədin silinməsi

Bu sənəd sizin istəyinizlə hazırlanıb. Kopyaladıqdan sonra layihədən silə bilərsiniz:

`docs/XUSUSI_ISTIFADE_TELIMATI_AZ.md`