# LovelyDent — İnkişaf Vəziyyəti

| Sahə | Məlumat |
|---|---|
| Əsas plan | `LovelyDent_v3.md` (v3.0) |
| Son yenilənmə | 23 iyun 2026 |
| Stack | Fastify API · Prisma · PostgreSQL · Next.js 15 (static export) · Expo mobile |
| API (prod) | `https://api-production-e6391.up.railway.app/api` |
| Frontend (prod) | `xestexana.live` |

İzləmə işarələri: `✅ hazır` · `🟡 qismən` · `⬜ başlanmayıb` · `📝 lokal (commit gözləyir)`

---

## 1. Ümumi xülasə

| Faza | Vəziyyət | Qeyd |
|---|---|---|
| Faza 0 — Məhsul təməli | 🟡 | Auth, rol, deploy; audit 📝 lokal; fayl storage S5-də |
| Faza 1A — Klinik MVP | ✅ | Tamamlandı |
| Faza 1B — Maliyyə MVP | ✅ | Tamamlandı |
| Faza 2+ | ⬜ | Növbəti mərhələ |

**Son push edilmiş commit:** `af740a6` — *feat: strengthen approval engine and workspace navigation*

**Son commit:** Faza 1 tam paket — maliyyə, audit, fayl, period, xatırlatma

**Faza 1:** ✅ ~100% · **Ümumi v3 plan:** ~45%

---

## 2. Edilənlər

### 2.1. İnfrastruktur və təhlükəsizlik — 🟡

- ✅ Monorepo: `apps/api`, `apps/web`, `apps/mobile`, `packages/shared`
- ✅ Railway API deploy, `/api/health` endpoint
- ✅ JWT auth, rol əsaslı `authorize` middleware (Super Admin miras icazəsi)
- ✅ CORS, rate limit (bootstrap), security smoke testlər (5/5)
- ✅ Prisma + PostgreSQL, demo seed skripti
- ✅ Observability endpointləri (auth tələb olunur)
- ⬜ CI/CD pipeline (GitHub Actions və s.)
- ⬜ Strukturlaşdırılmış backup/restore
- ⬜ Fayl storage (S3/R2 və s.)

### 2.2. UI / UX — 🟡

- ✅ Üst modul naviqasiyası (sidebar ləğv edildi)
- ✅ Mobil: alt dock naviqasiya
- ✅ SVG nav ikonları, brand mark (diş loqosu)
- ✅ DM Sans + Instrument Serif fontları
- ✅ Rol əsaslı menyu (`role-access.ts`)
- ✅ Təsdiq badge (`/approvals/summary`)
- 🟡 Səhifə dizaynları modul-modul təkmilləşdirilir; hələ tam v3 vizual standartı deyil

### 2.3. İstifadəçi və klinika — 🟡

- ✅ Klinika + istifadəçi modeli
- ✅ Heyət idarəetməsi (`/administration`)
- ✅ Rol əsaslı dashboard metrikaları
- ✅ Super Admin → bütün admin səlahiyyətləri
- ⬜ Ayrıca filial modeli və UI
- ⬜ Detallı permission matrix (`payment.refund`, `patient.export` və s.)
- ⬜ 2FA, sessiya/cihaz idarəetməsi

### 2.4. Pasiyent — 🟡

- ✅ Pasiyent reyestri və axtarış
- ✅ Pasiyent kartı (`/patients/card`)
- ✅ Versiyalanan anamnez
- ✅ Tibbi qeydlər
- ⬜ Dublikat aşkarlanması / birləşdirmə
- ⬜ Pasiyent export (icazə ilə)
- ⬜ Tam CRM / kommunikasiya tarixçəsi

### 2.5. Randevu və qrafik — 🟡

- ✅ Randevu CRUD, status axını
- ✅ Həkim qrafik slotları
- ✅ Check-in / treatment statusları
- 🟡 `/appointments` — əsas siyahı və əməliyyatlar var
- ⬜ Həftəlik vizual təqvim (full calendar UI)
- ⬜ No-show, recall, xatırlatma queue-su

### 2.6. Klinik — 🟡

- ✅ Odontogram snapshot (versiyalanan)
- ✅ Klinik qəbul (DRAFT → COMPLETED)
- ✅ Diaqnoz məcburiyyəti tamamlanma üçün
- ✅ Klinik qəbul reviziyaları
- 🟡 `/clinical` iş sahəsi
- ⬜ Qəbul düzəlişi (amend) axını
- ⬜ Müalicə planından prosedura avtomatik keçid

### 2.7. Müalicə planı və xidmət kataloqu — 🟡

- ✅ Xidmət kataloqu (qiymət, kateqoriya, kod)
- ✅ Müalicə planı, versiya, sətirlər
- ✅ Serverdə sabitlənən qiymət
- 🟡 `/treatments` UI
- ⬜ Razılıq sənədi
- ⬜ Plan sətrinin icra olunmuş prosedura çevrilməsi

### 2.8. Anbar — 🟡

- ✅ Məhsul kartı, minimum stok
- ✅ Stok hərəkəti ledger-i (PURCHASE, CONSUMPTION, RETURN və s.)
- ✅ Real balans hesablanması (groupBy)
- ✅ Kritik stok xəbərdarlığı (dashboard + inventory)
- 🟡 `/inventory` UI, gözləyən təsdiq banneri
- ⬜ Təchizatçı və alış sifarişi
- ⬜ Inventarizasiya sessiyası

### 2.9. Təsdiq mühərriki (hierarchical approval) — 🟡

**Push edilib (`af740a6`):**

- ✅ Mərkəzləşdirilmiş `approval-service.ts`
- ✅ `/approvals` — siyahı, summary, PATCH review
- ✅ **Stok hərəkəti** → Super Admin (və ya Nurse → həkim CONSUMPTION)
- ✅ **Klinik qəbul tamamlama** → Həkim (assistent üçün)
- ✅ **Xidmət kataloqu create/update** → Super Admin (klinik admin üçün)
- ✅ Təsdiqdən sonra stok ledger avtomatik yenilənir
- 🟡 `/approvals` UI təkmilləşdirilib
- ⬜ Maliyyə əməliyyatları üçün təsdiq (refund, manual adjustment)
- ⬜ Admin hesabat dəyişikliklərinin Super Admin təsdiqi
- ⬜ Bütün modullarda v3 §20 tam iyerarxiya

### 2.10. Maliyyə MVP (Faza 1B) — 📝 lokal

**Hələ commit edilməyib; build və testlər keçir:**

#### Schema
- ✅ `CashSession` — kassa növbəsi (açılış/bağlanış, variance)
- ✅ `PatientAccountEntry` — pasiyent ledger (DEBIT borc, CREDIT ödəniş)
- ✅ Migration: `prisma/migrations/20260623180000_finance_ledger/`

#### Backend
- ✅ `finance-service.ts` — balans, borc, ödəniş, borclular, gündəlik xülasə
- ✅ `finance.ts` routes:
  - `GET /finance/summary`
  - `GET /finance/debtors`
  - `GET /finance/cash-sessions/current`
  - `POST /finance/cash-sessions/open`
  - `POST /finance/cash-sessions/:id/close`
  - `GET /finance/patients/:patientId/account`
  - `POST /finance/charges`
  - `POST /finance/payments`
  - `POST /finance/clinical-encounters/:id/charges`
- ✅ `app.ts`-də finance route qeydiyyatı
- ✅ Klinik qəbul tamamlananda `charges[]` → avtomatik borc yazılması
- ✅ Nurse təsdiq axınında charges payload saxlanır və təsdiqdən sonra tətbiq olunur
- ✅ Dashboard CASHIER metrikaları real maliyyə datasından
- ✅ Kassir/mühasib pasiyent siyahısı və xidmət kataloqu oxuma icazəsi

#### Frontend
- ✅ `/finance` — metrikalar, borclular, kassa aç/bağla, ödəniş, manual borc

#### Maliyyə MVP-də hələ yoxdur
- ⬜ Refund / reversal
- ⬜ Depozit ödənişi
- ⬜ Çap olunan qəbz (PDF/print)
- ⬜ Həkim faizi avtomatik hesablanması
- ⬜ Period bağlanması və reconciliation
- ⬜ Manual adjustment üçün təsdiq axını
- ⬜ Paymes inteqrasiyasının ledger ilə birləşdirilməsi (köhnə `paymes.ts` ayrıca qalır)
- ⬜ Maliyyə drill-down hesabatları (`/reports`)

### 2.11. Digər modullar

| Modul | Vəziyyət |
|---|---|
| Tapşırıq sistemi | 🟡 API skeleti (`tasks.ts`), UI minimal |
| Hesabatlar | 🟡 `/reports` — əməliyyat hesabatı; maliyyə drill-down yoxdur |
| Paymes | 🟡 Köhnə ödəniş route; yeni ledger ilə birləşməyib |
| Mobil (Expo) | ⬜ Planlaşdırılıb, MVP deyil |
| Audit jurnal | 🟡 | Model + API + UI — lokal, commit gözləyir (S0) |

---

## 3. Git və deploy vəziyyəti

```
Son commit (remote):  af740a6  feat: strengthen approval engine and workspace navigation

Commit gözləyən fayllar:
  M  apps/api/src/app.ts
  M  apps/api/src/routes/clinical-core.ts
  M  apps/api/src/routes/dashboard.ts
  M  apps/api/src/routes/patients.ts
  M  apps/api/src/routes/treatment-plans.ts
  M  apps/api/src/services/approval-service.ts
  M  apps/web/app/(workspace)/finance/page.tsx
  M  prisma/schema.prisma
  ?? apps/api/src/routes/finance.ts
  ?? apps/api/src/services/finance-service.ts
  ?? prisma/migrations/20260623180000_finance_ledger/
```

**Deploy addımları (maliyyə üçün):**
1. Commit + push `main`
2. Railway: `prisma migrate deploy` (yeni migration)
3. Frontend static export yenilənməsi (Vercel / `xestexana.live`)

---

## 4. Qalan işlər (prioritet sırası)

v3 §20 və razılaşdırılmış development backlog əsasında:

### Prioritet 1 — Hazır işi bağlamaq
1. 📝 Maliyyə MVP-ni commit + push + migration deploy
2. 🟡 Klinik qəbul UI-dan `charges` göndərilməsi (həkim prosedur bitirəndə xidmət seçimi)
3. 🟡 Pasiyent kartında borc/ödəniş tarixçəsi (`/finance/patients/:id/account`)

### Prioritet 2 — Təhlükəsizlik və izlənəbilirlik
4. 🟡 **Audit jurnal** — `AuditLog` modeli, `audit-service`, `/audit/logs`, administration UI; giriş/maliyyə/təsdiq/heyət loglanır
5. ⬜ Login/security hadisələri auditə — əsas giriş hadisələri əlavə edilib; export/baxış hələ yoxdur
6. ⬜ Detallı permission matrix (rol əvəzinə granular icazə)

### Prioritet 3 — Klinik axının tamamlanması
7. 🟡 Randevu vizual təqvim
8. 🟡 Check-in → qəbul → tamamlama end-to-end UI axını
9. ⬜ Müalicə planı → prosedur → borc avtomatik zənciri
10. ⬜ Fayl/rentgen upload (object storage)

### Prioritet 4 — Maliyyənin dərinləşdirilməsi
11. ⬜ Refund / reversal + təsdiq
12. ⬜ Qəbz çapı
13. ⬜ Həkim faizi mühərriki
14. ⬜ Period bağlanması
15. ⬜ Gün sonu reconciliation hesabatı

### Prioritet 5 — Əməliyyat və böyümə
16. ⬜ Bildiriş queue (SMS/e-mail randevu xatırlatması)
17. ⬜ CRM / lead / recall
18. ⬜ Filial modeli
19. ⬜ Geniş PDF/Excel export
20. ⬜ E2E testlər (pasiyent → randevu → qəbul → ödəniş)

### Prioritet 6 — Təsdiq mühərrikinin genişləndirilməsi
21. ⬜ Admin hesabat/parametr dəyişiklikləri → Super Admin
22. ⬜ Maliyyə manual düzəliş → mühasib/super admin təsdiqi
23. ⬜ v3 §20 tam iyerarxiya: hər rolun bir üst rəhbəri

---

## 5. Demo giriş məlumatları

| Rol | E-mail | Parol |
|---|---|---|
| Super Admin | `superadmin@lovelydent.demo` | `LD!Super.26#Q7m` |
| Həkim | `doctor@lovelydent.demo` | `LD!Doctor.26#D9k` |
| Anbar | `inventory@lovelydent.demo` | `LD!Inventory.26#I2t` |
| Kassir | `cashier@lovelydent.demo` | `LD!Cashier.26#C6w` |

---

## 6. Növbəti addım

**Faza 2** — bax `LovelyDent-faza1-plan.md` (CRM, WhatsApp, həkim faizi).

---

*Bu sənəd inkişaf zamanı yenilənməlidir. Əsas məhsul tələbləri üçün `LovelyDent_v3.md` istinad götürülür.*
