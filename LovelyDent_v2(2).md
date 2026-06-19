# LovelyDent Klinik İdarəetmə Sistemi (v2)

## Layihənin Məqsədi
LovelyDent diş klinikasının bütün əsas iş proseslərini vahid sistemdə birləşdirmək, mövcud çoxsaylı proqramlardan asılılığı azaltmaq və pasiyent, maliyyə, anbar və müalicə məlumatlarını mərkəzləşdirilmiş şəkildə idarə etmək.

---

# Faza 1 (Əsas Sistem)

## Pasiyent İdarəetməsi
- Pasiyent qeydiyyatı
- Xarici vətəndaş qeydiyyatı
- Pasiyent kartı
- Müalicə tarixçəsi
- Rentgen və sənəd əlavələri
- Pasiyent axtarışı və filtrlənməsi
- Doğum günü bildirişləri

## Həkim İdarəetməsi
- Həkim profilləri
- İş qrafikləri
- Faiz sistemi
- Performans statistikası
- Maaş hesablamaları

## Randevu Sistemi
- Təqvim görünüşü
- Randevu yaratmaq
- Randevu dəyişmək
- Randevu ləğv etmək
- SMS və Email xatırlatmaları
- Həkim məşğulluq nəzarəti

## Müalicə Modulu
- Müalicə planları
- Xidmət siyahısı
- Qiymətləndirmə
- Zəmanət kartları
- İmplant məlumatları
- Rentgen görüntülərinin saxlanması

## Kassa Modulu
- Ödənişlər
- Qismən ödənişlər
- Depozit sistemi
- Borclu pasiyentlər
- Qəbzlər

## Maliyyə Modulu
- Gəlirlər
- Xərclər
- Maaşlar
- Digər gəlirlər
- Gündəlik hesabatlar
- Aylıq hesabatlar

## Anbar Modulu
- Məhsullar
- Təchizatçılar
- Alış tarixçəsi
- İstifadə tarixçəsi
- Minimum stok xəbərdarlıqları

## İstifadəçi Rolları
- Super Admin
- Admin
- Reception
- Həkim
- Kassir

## Tapşırıq Sistemi
- admin tərəfindən işçilərə tapşırıq verilməsi
- Tapşırığın başlığı, açıqlaması, məsul işçi və son tarixinin qeyd edilməsi
- Tapşırıqların aktiv və deaktiv edilməsi
- Tapşırıq statusları: gözləyir, icradadır, tamamlandı, ləğv edildi
- Tapşırıqlar üzrə prioritet dərəcəsi: aşağı, orta, yüksək
- İşçi üzrə tapşırıq siyahısı
- Gecikmiş tapşırıqların izlənməsi
- Tapşırıq tarixçəsi və rəhbərlik üçün hesabat


## Bildiriş və Xatırlatma Sistemi
- Randevu yaradıldıqda avtomatik SMS bildirişi
- Randevudan əvvəl avtomatik SMS xatırlatması
- Randevu yaradıldıqda WhatsApp bildirişi
- Randevudan əvvəl WhatsApp xatırlatması
- Randevu dəyişdirildikdə bildiriş
- Randevu ləğv edildikdə bildiriş
- Müalicə planı üzrə xatırlatmalar
- Ödəniş gecikmələri üzrə bildirişlər
- Bildiriş şablonlarının idarə olunması
- Göndərilən bildirişlərin tarixçəsi
- Uğurlu və uğursuz göndərişlərin izlənməsi

## Hesabatlar
- Pasiyent statistikası
- Həkim statistikası
- Maliyyə statistikası
- Randevu statistikası
- PDF Export
- Excel Export

---

# Faza 2

## Sayt İnteqrasiyası
- Online randevu
- Həkim səhifələri
- Xidmətlər
- Blog


---

# Faza 3

## Əlavə Funksiyalar
- WhatsApp inteqrasiyası
- Push bildirişlər
- API inteqrasiyaları
- Multi-filial dəstəyi
- Təkmilləşdirilmiş analitika

---

## Texnologiyalar

### Frontend
- React
- Electron
- HTML5
- CSS3
- JavaScript

### Backend
- Node.js
- Express.js

### Database
- PostgreSQL

### Authentication
- JWT
- bcrypt

### Deployment
- Docker
- Nginx
- AWS və ya VPS

---

## Qeyd
Bu sənəd MVP və real biznes ehtiyaclarına uyğunlaşdırılmış versiyadır. Video zəng, audio zəng, daxili mesajlaşma və digər yüksək mürəkkəblikli funksiyalar ilkin mərhələdən çıxarılmış və sonrakı fazalara saxlanılmışdır.
