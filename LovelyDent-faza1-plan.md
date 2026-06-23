# LovelyDent — Faza 1 Tamamlama Planı

| | |
|---|---|
| Status | **✅ Faza 1 tamamlandı** (23 iyun 2026) |
| Növbəti | **Faza 2** — CRM, WhatsApp, həkim faizi, təchizatçı |

---

## Faza 1 Definition of Done — hamısı ✅

### 1A — Klinik MVP
| Tələb | Status |
|---|---|
| Pasiyent kartı + anamnez | ✅ |
| Randevu + status axını | ✅ |
| Həftəlik təqvim UI | ✅ |
| Check-in → klinik kart | ✅ |
| Odontogram | ✅ |
| Klinik qəbul + charges UI | ✅ |
| Fayl/rentgen upload | ✅ |
| Dashboard | ✅ |

### 1B — Maliyyə MVP
| Tələb | Status |
|---|---|
| Ledger + kassa | ✅ |
| Prosedurdan borc | ✅ |
| Ödəniş (nağd/kart/depozit) | ✅ |
| Depozit | ✅ |
| Qəbz (HTML çap) | ✅ |
| Refund | ✅ |
| Period bağlanması | ✅ |
| Maliyyə hesabatları | ✅ |
| SMS xatırlatma queue | ✅ |

### Faza 0 minimum
| Tələb | Status |
|---|---|
| Auth + rol | ✅ |
| Təsdiq mühərriki | ✅ |
| Audit jurnal | ✅ |
| Fayl storage | ✅ |

---

## Faza 2-yə keçid (növbəti işlər)

1. CRM / lead / recall
2. WhatsApp inteqrasiya
3. Həkim faizi + əməkhaqqı
4. Təchizatçı + alış sifarişi
5. Geniş PDF/Excel export
6. Real SMS/e-mail provider (adapter)

---

## Deploy qeydləri

```bash
# Railway / prod
npx prisma migrate deploy
# 3 migration: finance_ledger, audit_log, faza1_files_period_notify
```

Demo axın test: pasiyent → randevu → check-in → klinik kart → qəbul + xidmət → borc → kassa ödəniş → qəbz → period bağla
