# LovelyDent Dental Clinic ERP + CRM

## Məhsul və İnkişaf Planı — v3

| Sahə | Məlumat |
|---|---|
| Sənəd statusu | İşçi layihə |
| Versiya | 3.0 |
| Tarix | 20 iyun 2026 |
| Məhsul tipi | Dental Clinic ERP + CRM |
| İlkin platforma | Responsive web tətbiqi |
| İlkin dil və valyuta | Azərbaycan dili, AZN |
| İlkin istifadə modeli | Bir klinika, multi-filiala hazır data strukturu |

---

## 1. Məhsulun məqsədi

LovelyDent klinikanın pasiyent, randevu, klinik müalicə, maliyyə, anbar, əməkdaş və kommunikasiya proseslərini vahid, təhlükəsiz və izlənilə bilən sistemdə birləşdirir.

Sistemin əsas məqsədləri:

- Klinik iş axınlarını standartlaşdırmaq və əl əməyini azaltmaq.
- Pasiyentin tibbi və maliyyə tarixçəsini vahid kartda saxlamaq.
- Randevu, müalicə və ödəniş arasında tam əlaqə yaratmaq.
- Rəhbərliyə etibarlı əməliyyat və maliyyə göstəriciləri təqdim etmək.
- Bütün kritik dəyişikliklər üçün audit izi yaratmaq.
- Gələcəkdə multi-filial, mobil tətbiq və xarici inteqrasiyalara hazır olmaq.

## 2. Məhsul prinsipləri

- **Web-first:** əsas məhsul brauzerdə işləyən responsive tətbiq olacaq.
- **Clinical-first:** sistemin nüvəsi odontogram, klinik qəbul və müalicə axınıdır.
- **Security by design:** icazələr, audit, backup və məlumat qorunması sonradan əlavə edilən funksiya deyil.
- **Modular architecture:** hər biznes sahəsi ayrıca modul kimi layihələndiriləcək.
- **Single source of truth:** ödəniş, xidmət, anbar sərfi və həkim faizi eyni təsdiqlənmiş əməliyyatdan yaranacaq.
- **No hard delete:** tibbi və maliyyə məlumatları fiziki silinməyəcək; ləğv, arxiv və düzəliş tarixçəsi saxlanacaq.
- **Configurable business rules:** statuslar, şablonlar, faiz qaydaları və klinika parametrləri mümkün qədər konfiqurasiya ediləcək.

## 3. İlkin fərziyyələr

Bu plan aşağıdakı fərziyyələrlə hazırlanıb:

- İlk buraxılış bir klinikada tətbiq ediləcək.
- Eyni sistemdən receptionist, həkim, kassir və rəhbərlik paralel istifadə edəcək.
- İnternet bağlantısı əsas iş rejimi üçün mövcud olacaq.
- Rentgen və sənədlər fayl anbarında saxlanacaq; böyük fayllar PostgreSQL daxilində saxlanmayacaq.
- Hüquqi, vergi, fiskal kassa və tibbi məlumat tələbləri deployment ölkəsinə uyğun ayrıca təsdiqlənəcək.
- Electron və native mobil tətbiq MVP-yə daxil deyil.

## 4. Uğur göstəriciləri

Pilot istifadədən sonra aşağıdakı göstəricilər ölçüləcək:

- Randevu yaratmaq üçün orta vaxt.
- No-show faizinin dəyişməsi.
- Gecikmiş və borclu ödənişlərin sayı.
- Müalicə planlarının qəbul faizi.
- Gün sonu kassa fərqlərinin sayı.
- Minimum stokdan aşağı düşən məhsullar və stok itkiləri.
- Klinik qeydlərin tamamlanma faizi.
- Sistem xətaları və istifadəçi dəstək müraciətləri.

## 5. İstifadəçi rolları

| Rol | Əsas məsuliyyət |
|---|---|
| Super Admin | Sistem səviyyəli parametrlər və bütün klinikaların idarəsi |
| Klinik Admin | Klinik parametrləri, əməkdaşlar, icazələr və hesabatlar |
| Reception | Pasiyent qeydiyyatı, randevu və kommunikasiya |
| Həkim | Klinik qəbul, odontogram, diaqnoz və müalicə |
| Həkim assistenti | İcazə verilən klinik qeydlər, material sərfi və qəbul dəstəyi |
| Kassir | Ödəniş, refund, depozit, qəbz və kassa növbəsi |
| Anbar məsulu | Məhsul, alış, stok hərəkəti və inventarizasiya |
| Mühasib | Maliyyə baxışı, xərclər, əməkhaqqı və exportlar |
| Rəhbərlik | Dashboard və təsdiqlənmiş idarəetmə hesabatları |

Rollar sabit icazə paketi kimi başlasa da, sistemdə ayrıca permission-lar idarə olunmalıdır. Məsələn, `payment.refund`, `patient.export` və `clinical-note.amend` fərqli icazələrdir.

## 6. Funksional modullar

### 6.1. Klinika və sistem parametrləri

- Klinika adı, ünvanı, əlaqə məlumatları və loqosu.
- Filial, kabinet, stomatoloji kreslo və iş saatları strukturu.
- Dil, saat qurşağı, valyuta və tarix formatı.
- Xidmət kateqoriyaları, xidmətlər, qiymətlər və müddət.
- Ödəniş metodları və kassa parametrləri.
- Randevu, klinik və maliyyə statuslarının idarəsi.
- Bildiriş şablonları və göndəriş qaydaları.
- Sənəd və qəbz nömrələnməsi.

### 6.2. İstifadəçi, giriş və icazələr

- Əməkdaş hesabının yaradılması, bloklanması və arxivlənməsi.
- Rol və permission əsaslı giriş nəzarəti.
- Təhlükəsiz parol saxlama və parol siyasəti.
- Sessiyaların və aktiv cihazların idarəsi.
- Parol sıfırlama və e-mail/telefon təsdiqi.
- Kritik rollar üçün iki mərhələli doğrulama imkanı.
- Uğursuz girişlərin məhdudlaşdırılması.
- Giriş və təhlükəsizlik hadisələrinin audit jurnalı.

### 6.3. Pasiyent idarəetməsi

- Yerli və xarici vətəndaş qeydiyyatı.
- Ad, soyad, doğum tarixi, cins, telefon, e-mail və ünvan.
- Şəxsiyyət sənədi məlumatları; yalnız zəruri sahələr saxlanmalıdır.
- Təcili əlaqə şəxsi.
- Pasiyent nömrəsinin avtomatik yaradılması.
- Dublikat pasiyent aşkarlanması və səlahiyyətli birləşdirmə prosesi.
- Pasiyent statusu: aktiv, deaktiv, arxiv.
- Etiketlər və xüsusi qeydlər.
- Axtarış və filtrləmə.
- Bütün randevu, müalicə, sənəd, ödəniş və kommunikasiya tarixçəsinin vahid kartda görünməsi.
- Pasiyent məlumatlarının export və çapı yalnız ayrıca icazə ilə.

### 6.4. Anamnez və tibbi xəbərdarlıqlar

- Allergiyalar.
- Xroniki və yoluxucu xəstəliklər.
- Daimi istifadə edilən dərmanlar.
- Hamiləlik və digər risk məlumatları.
- Keçmiş əməliyyatlar və tibbi qeydlər.
- Pasiyent tərəfindən verilmiş məlumatın tarixi və təsdiqi.
- Kritik allergiya və risklərin klinik ekranda aydın göstərilməsi.
- Anamnezin dövri yenilənməsi və dəyişiklik tarixçəsi.

### 6.5. CRM və pasiyent əlaqələri

- Potensial pasiyent və müraciət qeydiyyatı.
- Müraciət mənbəyi: sayt, sosial media, tövsiyə, zəng və s.
- Məsul əməkdaş və follow-up tarixi.
- Lead statusları və çevrilmə tarixçəsi.
- Müalicə planının qəbul və rədd səbəbləri.
- Uzun müddət gəlməyən pasiyentlər üçün recall siyahıları.
- Doğum günü və profilaktik müayinə kampaniyaları.
- Kommunikasiya icazələrinin ayrıca saxlanması.
- Pasiyentlə bütün zəng qeydi, SMS, WhatsApp və e-mail tarixçəsi.

### 6.6. Həkim və iş qrafiki

- Həkim profili, ixtisası və işlədiyi xidmətlər.
- Standart həftəlik iş qrafiki.
- Məzuniyyət, fasilə və istisna günləri.
- Filial, kabinet və kreslo təyinatı.
- Xidmət üzrə qəbul müddəti.
- Təqvimdə mövcud vaxtların avtomatik hesablanması.
- Həkimin öz qrafikini görməsi; dəyişiklik yalnız icazə ilə.

### 6.7. Randevu və klinik təqvim

- Günlük, həftəlik və həkimlər üzrə təqvim görünüşü.
- Pasiyent, həkim, xidmət, kabinet/kreslo, başlanğıc vaxtı və müddət.
- Təkrarlanan və əlaqəli randevular.
- Həkim və resurs toqquşmalarının bloklanması.
- Gözləmə siyahısı.
- Randevu qeydləri və daxili qeyd.
- Dəyişiklik və ləğv səbəbləri.
- No-show qeydiyyatı.
- Check-in və gözləmə müddətinin izlənməsi.
- Randevu tarixçəsi və audit.

Randevu status axını:

```text
Planlaşdırıldı → Təsdiqləndi → Pasiyent gəldi
→ Qəbul başladı → Tamamlandı

Alternativ: Ləğv edildi | Gəlmədi | Yenidən planlaşdırıldı
```

### 6.8. Odontogram

- Daimi və süd dişləri üçün diş nömrələmə sistemi.
- Diş və diş səthi səviyyəsində vəziyyət qeydiyyatı.
- Mövcud vəziyyətlə planlaşdırılmış müalicənin vizual fərqləndirilməsi.
- Kariyes, plomb, kanal, kron, implant, çəkilmiş və çatışmayan diş kimi vəziyyətlər.
- Tarix üzrə əvvəlki odontogram görüntülərinin bərpası.
- Hər dəyişiklik üçün həkim, tarix və əlaqəli klinik qəbul.
- Mobil və desktop ekranlarda rahat istifadə.

### 6.9. Klinik qəbul və tibbi qeyd

- Qəbulun randevudan və ya birbaşa yaradılması.
- Şikayət, müayinə nəticəsi, diaqnoz və həkim qeydləri.
- Odontogram dəyişiklikləri.
- Görülmüş prosedurlar və istifadə edilən materiallar.
- Tövsiyələr, resept və növbəti qəbul tarixi.
- Klinik qeydin draft və tamamlanmış vəziyyəti.
- Tamamlanmış qeydin səssiz dəyişdirilməsinin qadağan edilməsi.
- Düzəliş zamanı əvvəlki məzmunun saxlanması və səbəbin daxil edilməsi.
- Həkimin elektron təsdiqi.

### 6.10. Müalicə planı

- Bir pasiyent üçün bir və ya bir neçə alternativ plan.
- Mərhələ, diş/diş səthi, xidmət, miqdar, qiymət və həkim.
- Endirim və yekun məbləğ.
- Pasiyent tərəfindən qəbul, qismən qəbul və rədd.
- Razılıq sənədinin generasiyası və əlavə edilməsi.
- Plan sətrinin icra olunmuş klinik prosedura çevrilməsi.
- Statuslar: draft, təqdim edildi, qəbul edildi, qismən qəbul edildi, icradadır, tamamlandı, ləğv edildi.
- Planın versiyalanması; təsdiqlənmiş planın qiymət dəyişiklikləri tarixçədə qalmalıdır.

### 6.11. Xidmət, implant və zəmanət

- Xidmət kataloqu və kateqoriyalar.
- Standart və xüsusi pasiyent qiyməti.
- Xidmətin təxmini müddəti.
- İmplantın marka, model, lot/seriya və tətbiq tarixi.
- İcra edilmiş xidmət üçün zəmanət qaydası.
- Zəmanətin başlanğıc, bitmə və istisna şərtləri.
- Zəmanət hadisələrinin tarixçəsi.
- sozu geden klinikanin hazirda istifade etdiyi zemanet kitabcasi var. musterilere kitabcani doldurub verirler. bu mentiqe uygun ne edilebilerse onu etmek lazimdi zemanet ucun.

### 6.12. Fayl, rentgen və sənədlər

- Rentgen, foto, PDF və digər icazəli faylların əlavə edilməsi.
- Fayl tipi, təsvir, tarix, müəllif və əlaqəli qəbul.
- Faylların object storage daxilində saxlanması.
- Fayl ölçüsü və format məhdudiyyətləri.
- Zərərli fayl yoxlaması üçün inteqrasiya imkanı.
- Giriş icazəsi, yükləmə və baxış auditinin saxlanması.
- Klinik olaraq vacib faylların versiya və arxiv siyasəti.
- Gələcəkdə DICOM/PACS inteqrasiyası üçün ayrıca adapter imkanı.

### 6.13. Kassa və pasiyent hesabı

- Pasiyentin maliyyə balansı.
- Müalicə planı və icra edilmiş xidmətlər üzrə borc.
- Tam, qismən və qarışıq ödəniş.
- Nağd, kart, bank köçürməsi, depozit və digər metodlar.
- Avans/depozit qəbulu və istifadəsi.
- Endirim və endirim təsdiqi.
- Qəbzin generasiyası və çapı.
- Ödənişin yanlış daxil edilməsi üçün ləğv/reversal prosesi.
- Refund və refund səbəbi.
- Borclu pasiyentlər və son ödəniş tarixi.
- Bütün maliyyə əməliyyatları üçün dəyişdirilməz audit izi.

### 6.14. Kassa növbəsi və maliyyə

- Kassanın açılış qalığı ilə açılması.
- Növbə ərzində mədaxil və məxaric.
- Kassadan-kassaya və ya kassadan-banka transfer.
- Növbənin sayılmış faktiki məbləğlə bağlanması.
- Sistem qalığı ilə faktiki qalıq arasındakı fərq.
- Xərc kateqoriyaları və təsdiq prosesi.
- Günlük, aylıq və period üzrə gəlir-xərc hesabatı.
- Hesablama metodunun açıq göstərilməsi: cash və ya accrual görünüş.
- Fiskal kassa və mühasibat inteqrasiyası ayrıca layihə kimi qiymətləndiriləcək.

### 6.15. Həkim–klinika gəlir bölgüsü

- Həkim sabit maaş almır; görülmüş və ödənmiş xidmət gəlirindən pay alır.
- Həkim, xidmət və ya kateqoriya üzrə faiz qaydası; məsələn 50% həkim, 50% klinika.
- Hazırkı biznes qaydası: bölgü pasiyentdən faktiki alınmış və xidmətə bölüşdürülmüş ödənişə əsaslanır.
- Refund, endirim və laboratoriya xərclərinin bölgüyə təsiri ayrıca ledger əməliyyatı kimi saxlanır.
- Qaydanın qüvvəyə minmə tarixi və əvvəlki versiyaları qorunur.
- Hesablaşma periodunun bağlanması, həkim üzrə settlement və qismən/tam payout tarixçəsi.

### 6.16. Avtomatik hesablama və maliyyə mühərriki

Sistemdə yekun maliyyə və statistika rəqəmləri istifadəçi tərəfindən manual daxil edilməməlidir. İstifadəçi yalnız baş vermiş ilkin biznes əməliyyatını qeyd edir; əlaqəli borc, gəlir, kassa, stok, komissiya və göstəricilər sistem tərəfindən hesablanır.

Əsas hesablama prinsipləri:

- Hesablamalar browser/frontend daxilində deyil, serverdə vahid biznes qaydaları ilə aparılmalıdır.
- Məbləğ, faiz, vergi və miqdar hesablamalarında dəqiq decimal tiplərindən istifadə edilməlidir.
- Hər hesablamanın mənbə əməliyyatı və tətbiq edilən qayda versiyası məlum olmalıdır.
- Tarif, komissiya və digər hesablama qaydalarının qüvvəyə minmə tarixi və versiyası saxlanmalıdır.
- Keçmiş bağlanmış periodun nəticəsi yeni qayda əlavə ediləndə səssiz şəkildə dəyişməməlidir.
- Hər dashboard və hesabat rəqəmindən onu yaradan əməliyyatlara drill-down mümkün olmalıdır.
- Hesablanmış nəticələr istifadəçidən API input-u kimi qəbul edilməməlidir.

Sistem aşağıdakı əlaqəli registrlərə — ledger-lərə əsaslanmalıdır:

- **Pasiyent hesabı ledger-i:** xidmət haqqı, endirim, ödəniş bölgüsü, depozit, refund və qalıq borc.
- **Maliyyə/kassa ledger-i:** mədaxil, məxaric, transfer, refund, kassa və bank hərəkətləri.
- **Stok ledger-i:** alış, sərf, transfer, geri qaytarma, silinmə və inventar düzəlişi.
- **Komissiya ledger-i:** həkim faizini yaradan əməliyyat, düzəliş, refund təsiri və ödəniş statusu.

Avtomatik hesablanacaq əsas maliyyə göstəriciləri:

- İcra edilmiş xidmətlərin ümumi dəyəri.
- Alınmış ödənişlər və ödəniş metodları üzrə bölgü.
- Pasiyentlərin cari və gecikmiş borcları.
- Depozit qalığı və istifadə edilmiş depozit.
- Endirim, refund və ləğv edilmiş əməliyyatlar.
- Kassa və bank üzrə gözlənilən qalıq.
- Material sərfi və satılan xidmətlərin maya dəyəri.
- Laboratoriya və digər birbaşa xidmət xərcləri.
- Həkim komissiyası və ödənilməmiş komissiya.
- Əməliyyat xərcləri, ümumi mənfəət və xalis mənfəət.
- Günlük, həftəlik, aylıq və seçilmiş period üzrə müqayisə.

Avtomatik hesablanacaq əməliyyat və klinik göstəricilər:

- Yeni və təkrar pasiyent sayı.
- Randevu sayı, tamamlanma və no-show faizi.
- Həkim və kreslo üzrə məşğulluq faizi.
- Müalicə planlarının təqdim, qəbul və icra faizi.
- Pasiyent və qəbul başına orta gəlir.
- Həkim, xidmət və filial üzrə gəlir və rentabellik.
- Lead conversion və pasiyent əldəetmə mənbələri.
- Məhsul qalığı, orta sərf, kritik stok və son istifadə riski.

Avtomatik əməliyyat nümunəsi:

```text
Həkim proseduru tamamlayır
→ Pasiyent hesabında xidmət borcu yaranır
→ Material reseptinə əsasən stokdan sərf edilir
→ Maya dəyəri hesablanır
→ Həkim komissiyası qaydaya əsasən yaradılır
→ Maliyyə və performans dashboard-ları yenilənir
```

```text
Kassir ödənişi qəbul edir
→ Ödəniş pasiyentin açıq borclarına bölüşdürülür
→ Pasiyent balansı azalır
→ Kassa qalığı artır
→ Ödənişə əsaslanan komissiya uyğun olduqda yenilənir
→ Qəbz və hesabat göstəriciləri yaranır
```

Manual müdaxilə qaydaları:

- İstifadəçi günlük gəlir, yekun borc, stok qalığı, mənfəət və həkim maaşını birbaşa yaza bilməz.
- Düzəliş yalnız ayrıca permission, səbəb və təsdiq prosesi ilə yeni adjustment əməliyyatı kimi aparılır.
- Əvvəlki əməliyyat silinmir və dəyişdirilmir; reversal və ya kompensasiya əməliyyatı yaradılır.
- Bütün manual düzəlişlər audit jurnalında əvvəlki nəticəyə təsiri ilə görünür.
- Bağlanmış maliyyə perioduna dəyişiklik ayrıca səlahiyyət və periodun yenidən açılması olmadan mümkün deyil.

Nəzarət və uyğunlaşdırma:

- Sistem ledger yekunlarını mənbə əməliyyatlarla dövri avtomatik reconciliation etməlidir.
- Uyğunsuzluq aşkar ediləndə rəqəmi səssiz düzəltməməli, xəta qeydi və xəbərdarlıq yaratmalıdır.
- Real-time dashboard əməliyyat görünüşü ilə bağlanmış rəsmi period hesabatı fərqləndirilməlidir.
- Gəlir, mənfəət, komissiya və vergi formulları klinikanın mühasibat qaydaları təsdiqləndikdən sonra konfiqurasiya edilməlidir.

### 6.17. Anbar və satınalma

- Məhsul, kateqoriya, SKU/barkod və ölçü vahidi.
- Təchizatçı və alış qiymətləri.
- Alış sifarişi və məhsul qəbulu.
- Partiya/lot və son istifadə tarixi.
- Anbar, filial və kabinet üzrə qalıq.
- Giriş, sərf, transfer, geri qaytarma, silinmə və düzəliş hərəkətləri.
- Minimum stok və yaxınlaşan son istifadə tarixi xəbərdarlığı.
- Klinik prosedura bağlı avtomatik və ya manual material sərfi.
- İnventarizasiya və fərq aktı.
- Stok hərəkətlərinin dəyişdirilməz tarixçəsi.

### 6.18. Bildiriş və xatırlatma

- SMS, e-mail və WhatsApp üçün provider-dən asılı olmayan struktur.
- Randevu yaradılması, dəyişdirilməsi və ləğvi bildirişləri.
- Randevudan əvvəl konfiqurasiya edilən xatırlatma.
- Müalicə planı, borc və recall xatırlatmaları.
- Şablonlarda dəyişənlər və dil variantları.
- Pasiyentin kommunikasiya razılığına nəzarət.
- Göndəriş növbəsi, retry və dublikat göndərişdən qorunma.
- Uğurlu, uğursuz və gözləyən göndəriş tarixçəsi.
- Provider cavabları və xəta səbəbləri.

### 6.19. Tapşırıq sistemi

- Başlıq, açıqlama, məsul şəxs, yaradan şəxs və son tarix.
- Prioritet: aşağı, orta, yüksək, kritik.
- Status: gözləyir, icradadır, tamamlandı, ləğv edildi.
- Pasiyent, randevu və ya müalicə planı ilə əlaqələndirmə.
- Şərh və fəaliyyət tarixçəsi.
- Gecikmiş tapşırıqların aşkarlanması.
- Şəxsi və rəhbərlik görünüşləri.

### 6.20. Hesabat və dashboard

- Günlük randevular, gələn pasiyentlər və no-show.
- Yeni və təkrar pasiyentlər.
- Müraciət mənbələri və lead conversion.
- Təqdim və qəbul edilmiş müalicə planları.
- İcra edilmiş xidmətlər və gəlir.
- Ödəniş metodu üzrə kassa.
- Debitor borcları və yaşlandırma hesabatı.
- Həkim məşğulluğu və performansı.
- Həkim faizləri.
- Anbar qalığı, sərf və son istifadə tarixləri.
- Filtrlər: tarix, həkim, xidmət, filial və status.
- İcazə əsasında PDF və Excel export.
- Dashboard rəqəmindən onun mənbə əməliyyatlarına drill-down.

## 7. Əsas biznes axınları

### 7.1. Yeni pasiyentdən tamamlanmış qəbula

```text
Pasiyent qeydiyyatı
→ Anamnez və kommunikasiya razılığı
→ Randevu
→ Check-in
→ Klinik qəbul və odontogram
→ Müalicə planı
→ Pasiyent təsdiqi
→ Prosedurun icrası
→ Ödəniş/qəbz
→ Növbəti randevu və xatırlatma
```

### 7.2. Müalicə planından maliyyəyə

```text
Plan sətri
→ Pasiyent tərəfindən qəbul
→ Klinik prosedur kimi icra
→ Pasiyent hesabında borc
→ Ödəniş və ya depozit tətbiqi
→ Həkim faizi üçün uyğun əməliyyat
```

Planlaşdırılmış xidmət gəlir sayılmır. Gəlir və həkim faizi üçün seçilən biznes qaydası ayrıca təsdiqlənməlidir.

### 7.3. Məhsul alışından klinik sərfə

```text
Alış sifarişi
→ Məhsul qəbulu və lot
→ Anbar qalığı
→ Kabinetə transfer
→ Klinik prosedurda sərf
→ Stok və maya dəyərinin yenilənməsi
```

## 8. Audit və məlumat bütövlüyü

Audit jurnalı ən azı bunları saxlamalıdır:

- İstifadəçi, tarix, IP/cihaz məlumatı və əməliyyat.
- Dəyişən obyekt və obyekt identifikatoru.
- Kritik sahələr üçün əvvəlki və yeni dəyər.
- Ləğv, refund, endirim və manual maliyyə düzəlişinin səbəbi.
- Klinik qeydin düzəliş səbəbi və əvvəlki versiyası.
- Export və həssas fayl baxışları.
- İcazə və rol dəyişiklikləri.

Audit qeydləri adi istifadəçi və admin tərəfindən redaktə və ya silinə bilməz.

## 9. Qeyri-funksional tələblər

### Təhlükəsizlik

- Bütün trafik TLS üzərindən işləməlidir.
- Parollar müasir adaptiv hashing alqoritmi ilə saxlanmalıdır.
- Server bütün permission yoxlamalarını özü etməlidir.
- Həssas məlumatlar loglara yazılmamalıdır.
- Secret-lər source code və repository daxilində saxlanmamalıdır.
- Fayl, API və export endpoint-lərində obyekt səviyyəli icazə yoxlanmalıdır.
- Rate limiting, təhlükəsiz başlıqlar və giriş cəhdlərinin qorunması tətbiq edilməlidir.
- Hüquqi uyğunluq ayrıca hüquq və məlumat təhlükəsizliyi mütəxəssisi ilə təsdiqlənməlidir.

### Etibarlılıq və backup

- Database üçün avtomatik backup.
- Fayl anbarı üçün versioning və backup siyasəti.
- Backup bərpasının dövri test edilməsi.
- Səhv zamanı ödəniş və stok əməliyyatlarının yarımçıq qalmaması üçün transaction-lar.
- SMS/WhatsApp kimi xarici göndərişlər üçün retry və idempotency.
- Kritik servis və backup xətaları üçün xəbərdarlıq.

### Performans

- Əsas ekranlar normal klinika yükündə sürətli açılmalıdır.
- Böyük siyahılarda server-side pagination və filter istifadə edilməlidir.
- Hesabatlar əsas əməliyyat sistemini bloklamamalıdır.
- Fayl yükləmələri ölçü limitləri və mümkün olduqda birbaşa object storage upload ilə idarə edilməlidir.

### İstifadə rahatlığı

- Desktop, tablet və mobil brauzer dəstəyi.
- Azərbaycan dilində vahid terminologiya.
- Klaviatura ilə sürətli randevu və kassa əməliyyatları.
- Təhlükəli əməliyyatlarda aydın təsdiq və səbəb.
- Form validation xətalarının istifadəçiyə anlaşılan göstərilməsi.

### Accessibility

- Klaviatura navigasiyası.
- Kifayət qədər rəng kontrastı.
- Yalnız rənglə ifadə edilməyən statuslar.
- Form sahələri üçün düzgün label və xəta əlaqəsi.

## 10. Tövsiyə edilən texniki arxitektura

### Frontend

- React və TypeScript.
- Responsive web application.
- Server state üçün standart query/cache yanaşması.
- Mərkəzləşdirilmiş form validation və permission-aware UI.
- Electron yalnız gələcəkdə konkret lokal cihaz və ya offline tələbi yaranarsa.

### Backend

- C# və ASP.NET Core.
- Modular Monolith arxitekturası.
- REST API və OpenAPI sənədləşməsi.
- Modul sərhədləri: Identity, Patients, Scheduling, Clinical, Billing, Inventory, CRM, Notifications, Reporting.
- Background job-lar bildiriş, export və ağır hesabatlar üçün.
- Xarici servislər üçün adapter interfeysləri.

Alternativ olaraq komanda TypeScript/Node.js üzrə daha güclüdürsə, backend NestJS ilə qurula bilər. Sadə Express.js strukturu bu miqyas üçün tövsiyə edilmir.

### Məlumat və infrastruktur

- PostgreSQL — əsas transactional database.
- Redis — cache, distributed lock və background job ehtiyacları.
- S3-compatible object storage — rentgen, şəkil və sənədlər.
- Docker — development və deployment mühitləri.
- Nginx və ya cloud load balancer — reverse proxy və TLS termination.
- Strukturlaşdırılmış loglar, metric-lər və error monitoring.
- Development, staging və production mühitlərinin ayrılması.

### Multi-filial hazırlığı

- Klinik və filial konteksti əsas biznes cədvəllərində başlanğıcdan nəzərə alınmalıdır.
- İstifadəçinin hansı filialları görə bildiyi serverdə yoxlanmalıdır.
- Qiymət, anbar, kassa, iş qrafiki və nömrələmə filial üzrə konfiqurasiya edilə bilməlidir.
- Multi-filial UI və idarəetmə funksiyaları sonrakı fazada aktivləşdirilə bilər.

## 11. Əsas məlumat domenləri

Bu siyahı yekun database sxemi deyil, ilkin domen xəritəsidir:

- Organization, Clinic, Branch, Room, Chair.
- User, Employee, Role, Permission, Session.
- Patient, Contact, Consent, Anamnesis, Allergy, MedicalAlert.
- Lead, LeadSource, CRMActivity, Recall.
- Practitioner, Schedule, ScheduleException.
- Appointment, AppointmentStatusHistory, Waitlist.
- Encounter, ClinicalNote, Diagnosis, OdontogramEntry.
- TreatmentPlan, TreatmentPlanVersion, TreatmentPlanItem, Procedure.
- Service, PriceList, Warranty, Implant.
- FileAsset, Document, Prescription.
- PatientAccount, Charge, Payment, PaymentAllocation, Deposit, Refund.
- CashRegister, CashShift, CashTransaction, Expense.
- CommissionRule, CommissionEntry, PayrollPeriod.
- Product, Supplier, PurchaseOrder, StockLot, StockMovement, InventoryCount.
- LedgerEntry, CalculationRule, CalculationRuleVersion, Adjustment.
- AccountingPeriod, PeriodClose, ReconciliationRun, MetricSnapshot.
- NotificationTemplate, Notification, DeliveryAttempt.
- Task, TaskComment, TaskHistory.
- AuditEvent.

## 12. API və inteqrasiya prinsipləri

- API endpoint-ləri versiyalaşdırılmalıdır.
- Bütün list endpoint-lərində pagination, filter və sort standartlaşdırılmalıdır.
- Pul dəyərləri floating-point deyil, dəqiq decimal tipi ilə saxlanmalıdır.
- Borc, gəlir, stok, komissiya və digər törəmə nəticələr client-dən qəbul edilməməli, server tərəfindən hesablanmalıdır.
- Hesablama yaradan əməliyyatlar database transaction daxilində bütöv icra edilməlidir.
- Hesablama qaydaları versiyalanmalı və nəticədə istifadə edilən versiya izlənilə bilməlidir.
- Tarixlər serverdə UTC, klinika ekranında lokal saat qurşağı ilə göstərilməlidir.
- Təkrar göndərilə bilən maliyyə və bildiriş əməliyyatlarında idempotency təmin edilməlidir.
- Webhook-lar imza yoxlaması və təkrar emal qorunması ilə qəbul edilməlidir.
- SMS, WhatsApp, e-mail, fiskal kassa və laboratoriya servisləri adapter kimi qoşulmalıdır.

## 13. İnkişaf fazaları

### Faza 0 — Məhsul təməli

Məqsəd: təhlükəsiz və inkişaf etdirilə bilən əsas yaratmaq.

- Biznes qaydalarının təsdiqi.
- UX wireframe və əsas ekran axınları.
- Repository, coding standards və branching qaydası.
- Development, staging və production konfiqurasiyası.
- Klinika/filial modeli.
- Authentication, rol və permission sistemi.
- Audit infrastrukturu.
- Fayl storage infrastrukturu.
- CI/CD, loglama, monitorinq və backup.

Çıxış meyarı: istifadəçi təhlükəsiz daxil ola, yalnız icazəli modul və klinikanı görə bilər; audit, deployment və backup təməli işləyir.

### Faza 1A — Klinik MVP

Məqsəd: pasiyentin qeydiyyatından tamamlanmış klinik qəbula qədər əsas axını işlətmək.

- Pasiyent kartı və axtarış.
- Anamnez və tibbi xəbərdarlıqlar.
- Həkim və iş qrafiki.
- Randevu təqvimi və status axını.
- Check-in.
- Odontogram.
- Klinik qəbul və versiyalanan həkim qeydi.
- Müalicə planı.
- Fayl və rentgen əlavələri.
- Əsas dashboard.

Çıxış meyarı: real pasiyent üçün randevu yaradılıb qəbul tamamlanır, odontogram və müalicə planı tarixçədə təhlükəsiz saxlanır.

### Faza 1B — Maliyyə MVP

Məqsəd: klinik proseduru pasiyent hesabı və kassa ilə əlaqələndirmək.

- Xidmət və qiymət kataloqu.
- İcra olunmuş prosedurdan borc yaranması.
- Tam, qismən və depozit ödənişləri.
- Qəbz.
- Refund/reversal.
- Kassa növbəsi.
- Avtomatik hesablama mühərriki və əsas ledger-lər.
- Period bağlanması, reconciliation və manual adjustment nəzarəti.
- Gəlir, ödəniş və borc hesabatları.
- Əsas SMS/e-mail randevu xatırlatmaları.

Çıxış meyarı: gün sonu kassası əməliyyat detallarına qədər yoxlanıla və bağlana bilir.

### Faza 2 — Klinik əməliyyatların genişləndirilməsi

- CRM, lead və recall.
- WhatsApp inteqrasiyası.
- 🟡 Anbar, satınalma və material sərfi — məhsul kartı, real stok ledger-i, giriş, sərf, qaytarma, transfer, düzəliş, minimum stok və hərəkət tarixçəsi işləyir; təchizatçı və alış sifarişi qalır.
- Həkim–klinika gəlir bölgüsü və payout.
- İmplant və zəmanət.
- Tapşırıq sistemi.
- Geniş PDF/Excel hesabatları.
- Razılıq formaları və resept şablonları.

### Faza 3 — Böyümə və inteqrasiyalar

- Sayt və online randevu.
- Multi-filial idarəetmə interfeysi.
- Mobil tətbiq və push bildirişlər.
- Laboratoriya iş axını.
- Fiskal və mühasibat inteqrasiyaları.
- DICOM/PACS və digər tibbi inteqrasiyalar.
- Təkmilləşdirilmiş analitika.

## 14. MVP xaricində saxlanılan funksiyalar

- Video və audio zəng.
- Ümumi məqsədli daxili chat.
- Native desktop tətbiqi.
- Tam offline iş rejimi.
- Süni intellektlə avtomatik diaqnoz.
- Sığorta claim emalı.
- Tam mühasibat sistemi.
- Marketplace və mürəkkəb loyalty sistemi.

Bu funksiyalar konkret biznes dəyəri və hüquqi risk qiymətləndirildikdən sonra planlaşdırılmalıdır.

## 15. Test strategiyası

- Biznes qaydaları üçün unit testlər.
- Database və modul qarşılıqlı əlaqələri üçün integration testlər.
- Pasiyent → randevu → qəbul → ödəniş kimi kritik axınlar üçün end-to-end testlər.
- Permission matrix üçün avtomatlaşdırılmış təhlükəsizlik testləri.
- Ödəniş, refund, komissiya və stok hesablamaları üçün ayrıca ssenari testləri.
- Hesablama mühərriki üçün əvvəlcədən məlum nəticəli golden test ssenariləri.
- Ledger balansı, ödəniş bölgüsü və stok hərəkətləri üçün invariant testləri.
- Eyni əməliyyatın təkrar göndərilməsinin rəqəmləri dəyişmədiyini yoxlayan idempotency testləri.
- Period bağlandıqdan sonra tarixi nəticələrin dəyişmədiyini yoxlayan testlər.
- Backup restore testi.
- Staging mühitində pilot istifadəçi acceptance testi.
- Production buraxılışından əvvəl migration və rollback məşqi.

## 16. Definition of Done

Funksiya yalnız aşağıdakılar tamamlandıqda hazır sayılır:

- Qəbul meyarları qarşılanır.
- Permission və audit davranışı müəyyənləşdirilib.
- Funksiyanın maliyyə, stok, komissiya və statistik göstəricilərə təsiri müəyyənləşdirilib və test edilib.
- Validation və xəta halları işlənib.
- Uyğun unit/integration testlər keçir.
- Kritik axın üçün end-to-end test mövcuddur.
- UI desktop və tablet ölçülərində yoxlanıb.
- API və istifadəçi sənədləri yenilənib.
- Migration və rollback riski qiymətləndirilib.
- Staging mühitində məhsul sahibi tərəfindən qəbul edilib.

## 17. Buraxılış və istismar

- Hər dəyişiklik pull request və code review-dan keçməlidir.
- Database migration-ları versiyalanmalıdır.
- Production-a birbaşa manual fayl köçürülməməlidir.
- Release əvvəlcə staging mühitində yoxlanmalıdır.
- Feature flag ilə riskli funksiyalar mərhələli aktivləşdirilməlidir.
- Error monitoring və kritik xəbərdarlıqlar məsul şəxsə çatmalıdır.
- Backup, retention və disaster recovery qaydası yazılı şəkildə saxlanmalıdır.
- Pilot klinika üçün istifadəçi təlimatı və ilkin dəstək prosesi hazırlanmalıdır.

## 18. Əsas risklər

| Risk | Qarşı tədbir |
|---|---|
| MVP-nin həddindən artıq böyüməsi | Faza 1A və 1B sərhədlərini qorumaq |
| Biznes qaydalarının gec müəyyənləşməsi | Koddan əvvəl qərar jurnalı və acceptance criteria |
| Tibbi qeydlərin izsiz dəyişməsi | Versiyalama, elektron təsdiq və audit |
| Kassa və həkim faizi fərqləri | Vahid mənbə əməliyyat və period bağlanması |
| Dublikat pasiyentlər | Aşkarlama və nəzarətli merge prosesi |
| Stokun sistemlə uyğun gəlməməsi | Lot, movement ledger və inventarizasiya |
| Xarici bildiriş servisinin dayanması | Queue, retry və provider adapteri |
| Fayl və məlumat itkisi | Ayrı backup və bərpa testləri |
| Multi-filialın sonradan çətin əlavə edilməsi | Data modelində başlanğıcdan clinic/branch scope |
| İcazəsiz məlumat çıxarışı | Permission, export auditi və giriş məhdudiyyəti |

## 19. Kodlaşdırmadan əvvəl təsdiqlənəcək qərarlar

1. Sistem yalnız LovelyDent üçün olacaq, yoxsa gələcəkdə SaaS məhsuluna çevriləcək?
2. İlk klinikada neçə filial, həkim, kreslo və paralel istifadəçi var?
3. Diş nömrələmə və odontogram işarələri hansı klinik standarta əsaslanacaq?
4. Müalicə qiyməti plan təsdiqində sabitlənir, yoxsa icra tarixində yenilənə bilər?
5. Həkim faizi icra edilmiş xidmətə, alınmış ödənişə, yoxsa period üzrə kassaya əsaslanır?
6. Endirim və refund üçün kimlərin təsdiqi lazımdır?
7. Hansı SMS, WhatsApp, e-mail və ödəniş provider-ləri istifadə ediləcək?
8. Fiskal qəbz və mövcud mühasibat proqramı inteqrasiyası tələb olunurmu?
9. Rentgen cihazı/PACS ilə inteqrasiya, yoxsa sadə fayl upload kifayətdir?
10. Məlumatların saxlanma müddəti, export və pasiyent sorğuları üçün hüquqi tələblər hansılardır?

## 20. İlk development backlog sırası

İzləmə işarələri: `✅ hazır`, `🟡 qismən hazır`, `⬜ başlanmayıb`.

1. 🟡 Klinika, filial və istifadəçi modeli — klinika və istifadəçi modeli var; ayrıca filial modeli tamamlanmalıdır.
2. 🟡 Authentication, permission və audit təməli — giriş, rol üzrə qorunan menyu/marşrut, server dashboard səlahiyyəti və klinika heyəti idarəetməsi işləyir; detallı permission və dəyişdirilməz audit jurnalı tamamlanmalıdır.
3. ✅ Pasiyent və anamnez — pasiyent reyestri, klinik kart və versiyalanan anamnez işləyir.
4. 🟡 Həkim qrafiki və randevu təqvimi — qrafik, uyğun vaxt və status axını var; həftəlik vizual təqvim genişləndirilməlidir.
5. 🟡 Odontogram və klinik qəbul — versiyalanan odontogram, real diş formaları, anamnez, klinik qəbulun qaralama və imzalanmış tamamlanma axını işləyir; imzadan sonrakı klinik düzəliş və müalicə planına keçid tamamlanmalıdır.
6. 🟡 Müalicə planı və xidmət kataloqu — xidmət/qiymət kataloqu, plan sətirləri, diş və miqdar, endirim, serverdə sabitlənən qiymət, plan versiyası və status axını işləyir; endirimli plan təqdim edilməzdən əvvəl rəhbər təsdiqi tələb olunur, qəbul edilmiş plan sətri real prosedur kimi tamamlanıb borca çevrilir; razılıq sənədi qalır.
7. ✅ Pasiyent hesabı, ödəniş və kassa növbəsi — real ledger, tam/qismən ödəniş, depozit, qəbz, kassa növbəsi və konkret qəbzə bağlı refund/reversal işləyir; nağd refund kassa qalığını azaldır və Super Admin təsdiqindən sonra tətbiq olunur.
8. 🟡 Avtomatik hesablama mühərriki, ledger-lər və period bağlanması — prosedur → borc → FIFO ödəniş bölgüsü → qəbz → ödənən hissənin həkim/klinika arasında faizlə bölgüsü, refund reversal ledger-i, hesablaşma periodu və payout tarixçəsi tranzaksiyalı işləyir; maya dəyəri/laboratoriya xərci və mənfəət mühərriki qalır.
9. ✅ Fayl storage və sənədlər — pasiyent faylları verilənlər bazasında saxlanır, önbaxış, açma və endirmə işləyir.
10. 🟡 Bildiriş və kommunikasiya — daxili bildiriş mərkəzi, tapşırıq/təsdiq bildirişləri, pasiyent kartından WhatsApp click-to-chat və imzalı gələn-mesaj webhook-u hazırdır; real gələn cavablar üçün Meta WhatsApp Business məlumatlarının Railway-ə yazılması, SMS/e-mail provider seçimi və randevu göndərişlərinin aktivləşdirilməsi qalır.
11. 🟡 Mənbə əməliyyata qədər açıla bilən avtomatik dashboard və hesabatlar — ilkin əməliyyat göstəriciləri var; maliyyə drill-down-u ledger-dən sonra tamamlanacaq.

Əlavə görülmüş iş: `✅` tapşırıq sistemi və tapşırıq alan işçiyə bildiriş, `✅` təsdiq tələb olunan əməliyyatın rəyçiyə bildirişi, `✅` rol əsaslı iş sahəsi, `✅` Railway API deploy və health yoxlaması.

Rol məntiqi üzrə görülənlər: `✅` Super Admin bütün klinika-admin səlahiyyətlərini və sistem görünüşünü miras alır, `✅` Klinik Admin heyət idarəetməsi, `✅` Rəhbərlik üçün məxfi pasiyent detalları olmadan aqreqat hesabat görünüşü, `✅` qeydiyyat/həkim/assistent/kassir/anbar/mühasib üçün məsuliyyətə uyğun menyu və server icazələri.

Hər backlog elementi ayrıca user story, biznes qaydası, ekran axını və acceptance criteria ilə development üçün hazırlanmalıdır.



#### rollarin isleri
İcra vəziyyəti: 🟡 Ümumi rəhbər təsdiqi mühərriki işləyir. Anbar məsulu/Admin əməliyyatı Super Adminə, assistent stok sərfi isə həkimə düşür; yalnız təsdiqdən sonra stok ledger-i avtomatik yenilənir. Eyni mexanizm maliyyə və klinik dəyişikliklərə genişləndirilir.

- mentiqi duzgun qurmaq lazimdi. super admin icaze veren sexsdi. ondan sonra gelen rollar 
ne edirse super adminin yekun icazesi ile edir. meselen admin hesabat isi gorur deyisiklik edende superadminin ekranina dusur super admin icaze verir ve ya vermir. super adminin icazesi olmadan hec bir deyisiklik edilmir. yada hekim asistani bir is gorur bu hekimin ekranina dusur hekim icaze verir ve ya vermir. mentiq beledi her bir rolun bir ustu onun rehberi sayilir. meselen anbarda deyisiklik olacaq anbar rolu deyisikliyi edir super adminin ekranina dusur ancaq heleki sadece ekranda gorsenir icaze verib vermemek kimi bir funksiyasi yoxdur. anbarda men bir mehsul yerlesdirdim. sonra bir miqdarini geri qaytarma etdim. sisteme bu dusdu. ancaq super admin tesdiqlemelidi ve anbarda o mehsuldan cixarilan miqdar avtomatik hesablanib anbar bilgisi yenilenmelidi. manuel hesablama hecbir yerde olmayacaq. her sey avtomatik olacaq. meselen hekim proseduru bitirdi. sistem avtomatik olaraq pasiyentin hesabina borc yazir. hekim faizi avtomatik hesablanir. kassir o borcu alir. sistem avtomatik olaraq pasiyentin borcunu azaldir, kassa qaligini artirir, hekim faizini yenileyir ve qebz yaradir. bu kimi her bir proses avtomatik olacaq. manual intervention olmayacaq. 

## 21. İcra qeydləri — idarəetmə və real iş axını

Status: `🟡 əsas klinik-maliyyə avtomatikası işləyir / qalan plan maddələri mərhələli bağlanır`.

- `✅` Super admin/admin üçün işçilərə tapşırıq vermə paneli: `/tasks`.
- `✅` İşçilər öz tapşırıqlarını görür və status dəyişir.
- `✅` Rol və icazə xəritəsi: `/permissions`.
- `✅` Audit jurnalı görünüşü: `/audit`.
- `🟡` Backup/update nəzarəti: `/backups`; real off-site dump və bərpa sınağı tamamlanmalıdır.
- `✅` Navbar qruplaşdırıldı: Gündəlik iş, Klinik iş, Maliyyə və resurs, İdarəetmə.
- `✅` Scroll ilə gizlənən uzun navbar yanaşması ləğv edildi; modullar dropdown qruplarında göstərilir.
- `🟡` `MANAGEMENT` rolu hələ klinika tərəfindən təsdiqlənmədiyi üçün genişləndirilmədi.
- `🟡` Approval engine kritik klinik, xidmət, stok, refund və müalicə planı endiriminə bağlıdır; ayrıca manual adjustment yalnız təsdiqli reversal kimi əlavə edilməlidir.
- `✅` Tapşırıq alan işçinin, təsdiq rəyçisinin və təsdiq nəticəsini gözləyən istifadəçinin ekranına daxili bildiriş düşür.
- `🟡` Pasiyent kartından WhatsApp-a hazır mətnlə keçid işləyir; Meta webhook gələn cavabı pasiyent kartında saxlayıb məsul işçiyə bildirir, lakin production aktivləşməsi provider məlumatlarını tələb edir.
- `✅` Odontogramdakı simvolik paxlava işarələri diş tipinə uyğun SVG kəsici, köpək, premolar və molar formaları ilə əvəz edildi.
- `✅` treatment → debt → FIFO payment allocation → receipt → paid doctor commission axını server tranzaksiyasında avtomatik işləyir.
- `✅` Refund əvvəlki allocation-u silmir; ayrıca reversal ledger-i yaradır, pasiyent borcunu və həkim komissiyasını geri hesablayır.
- `✅` Komissiya periodu bağlanır, həkim üzrə settlement yaranır, qismən/tam payout və nağd kassa təsiri tarixçədə saxlanır.
- `✅` Manual xidmət borcu ekranı və açıq endpointi çıxarılıb; borc klinik prosedurun tamamlanmasından yaranır.
