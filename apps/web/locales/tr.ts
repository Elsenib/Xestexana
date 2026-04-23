const tr = {
  appTitle: "Hospital Platform",
  ui: {
    language: "Dil",
    languages: {
      az: "Azərbaycan dili",
      en: "English",
      ru: "Русский",
      tr: "Türkçe"
    }
  },
  roles: {
    ADMIN: "Admin",
    DOCTOR: "Doktor",
    NURSE: "Hemşire",
    CALL_CENTER: "Kayıt",
    PATIENT: "Hasta"
  },
  auth: {
    tabs: {
      patientLogin: "Hasta girişi",
      patientRegister: "Hasta kaydı",
      staffLogin: "Personel girişi",
      bootstrap: "Admin kurulumu",
      resetPassword: "Şifre sıfırlama"
    },
    headings: {
      patientPortal: "Hasta portalına giriş yapın",
      staffPortal: "Personel panonuza giriş yapın",
      bootstrap: "Sadece ilk admin hesabı için",
      resetPassword: "Admin şifresini güncelleyin",
      secureLogin: "Güvenli giriş"
    },
    descriptions: {
      staffIntro: "Admin yönetim panelini, doktor yalnız kendi hastalarını ve randevularını, kayıt personeli ise kabul akışını yönetir.",
      register: "Çevrimiçi hesap oluşturun ve randevularınızı yönetin.",
      resetHint: "Kurulum anahtarını biliyorsanız admin şifresini sıfırlayabilirsiniz."
    },
    form: {
      email: "E-posta",
      password: "Şifre",
      identityNumber: "Kimlik numarası",
      phone: "Telefon",
      firstName: "Ad",
      lastName: "Soyad",
      gender: "Cinsiyet",
      genderFemale: "Kadın",
      genderMale: "Erkek",
      genderOther: "Diğer",
      birthDate: "Doğum tarihi",
      bloodType: "Kan grubu",
      allergies: "Alerjiler",
      chronicConditions: "Kronik hastalıklar",
      setupKey: "Kurulum anahtarı",
      currentPassword: "Mevcut şifre",
      newPassword: "Yeni şifre",
      confirmPassword: "Şifre doğrulama"
    },
    buttons: {
      login: "Giriş yap",
      logout: "Çıkış yap",
      refresh: "Yenile",
      createAccount: "Hesap oluştur",
      bootstrap: "Admin hesabı oluştur",
      resetPassword: "Şifreyi sıfırla",
      updatePassword: "Şifreyi değiştir",
      addDoctor: "Doktor ekle",
      addPatient: "Hasta ekle"
    }
  },
  landing: {
    heroTitle: "Her rol için ayrı, amaca uygun çalışma ekranları",
    heroDescription: "Hastalar randevularını ve kayıtlarını yönetir, doktorlar yalnızca kendi hastalarını görür, kayıt personeli kabulü verimli şekilde yönlendirir.",
    stats: {
      portals: "Ayrı portallar",
      auth: "Rol tabanlı giriş",
      live: "Canlı API akışı"
    },
    cards: {
      admin: {
        title: "Admin",
        description: "Sistem kontrolü, personel hesapları, doktor ve kayıt denetimi."
      },
      frontdesk: {
        title: "Kayıt",
        description: "Kimlik kontrolü, hasta kabulü, çatışmasız doktor atama."
      },
      doctor: {
        title: "Doktor",
        description: "Günün randevuları, hasta profili, tedavi ve reçeteler."
      },
      patient: {
        title: "Hasta",
        description: "Yeni randevular, geçmiş ziyaretler, raporlar ve reçeteler."
      }
    }
  },
  sidebar: {
    dashboard: "Dashboard",
    staff: "Personel hesapları",
    doctors: "Doktorlar",
    patients: "Hastalar",
    appointments: "Randevular",
    settings: "Ayarlar",
    register: "Hasta kaydı",
    doBooking: "Randevu planlama",
    doctorFlow: "Doktor akışı",
    profile: "Profil",
    history: "Geçmiş ziyaretler",
    reports: "Raporlar"
  },
  shell: {
    adminTitle: "Admin paneli",
    adminSubtitle: "Sistem yönetimi",
    deskTitle: "Kayıt paneli",
    deskSubtitle: "Kimlik doğrulama ve yönlendirme",
    doctorTitle: "Doktor paneli",
    doctorSubtitle: "Bugünün hasta akışı",
    patientTitle: "Hasta portalı",
    patientSubtitle: "Kişisel randevular ve kayıtlar",
    activeSession: "Aktif oturum",
    roleField: "Rol"
  },
  admin: {
    description: "Personel hesaplarını açın, yeni doktor ekleyin, randevu akışını izleyin."
  },
  metrics: {
    totalRequests: "Toplam istek",
    totalErrors: "Hata sayısı",
    averageResponseMs: "Ortalama yanıt",
    p95: "P95",
    liveData: "Canlı API metrikleri",
    trace: "Gözlemlenebilirlik paneli",
    latency: "Gecikme göstergesi",
    load: "Yük sınırı"
  },
  forms: {
    newStaff: "Yeni personel oluştur",
    newDoctor: "Yeni doktor oluştur",
    newPatient: "Yeni hasta",
    patientRegistration: "Hasta kayıt formu",
    appointmentBooking: "Çatışmasız rezervasyon oluştur",
    schedule: "Yakındaki program",
    patientProfile: "Hasta profili",
    patientDetails: "Tıbbi geçmiş",
    newRecord: "Yeni rapor ve reçete"
  },
  status: {
    CONFIRMED: "Onaylandı",
    PENDING: "Beklemede",
    COMPLETED: "Tamamlandı",
    CANCELED: "İptal edildi",
    NO_SHOW: "Gelmeyen"
  },
  channel: {
    web: "Web",
    mobile: "Mobil",
    "call-center": "Çağrı merkezi"
  },
  confirm: {
    deleteStaff: "Bu personeli silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.",
    deleteDoctor: "Bu doktoru silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
  },
  messages: {
    loadingData: "Veriler yükleniyor...",
    loggedOut: "Oturum kapatıldı.",
    deleteSuccess: "Başarıyla silindi.",
    dataLoadError: "Veriler yüklenemedi.",
    loginError: "Giriş başarısız.",
    loginSuccess: "Giriş başarılı.",
    bootstrapError: "Başlatma başarısız.",
    resetPasswordError: "Şifre sıfırlama başarısız.",
    changePasswordError: "Şifre değiştirme başarısız.",
    registerError: "Kayıt başarısız.",
    adminAccountCreated: "Admin hesabı oluşturuldu. Artık admin olarak giriş yapabilirsiniz.",
    patientAccountCreated: "Hasta hesabınız oluşturuldu ve oturum açıldı.",
    patientCreated: "Hasta kaydı tamamlandı.",
    patientCreateError: "Hasta oluşturulamadı.",
    patientAdded: "Hasta başarıyla eklendi.",
    doctorCreated: "Yeni doktor eklendi.",
    doctorCreateError: "Doktor oluşturulamadı.",
    doctorAdded: "Doktor başarıyla eklendi.",
    staffCreateError: "Personel hesabı oluşturulamadı.",
    staffAccountCreated: "{{role}} hesabı oluşturuldu.",
    staffDeactivated: "Personel hesabı devre dışı bırakıldı.",
    deactivationError: "Devre dışı bırakma başarısız.",
    deleteError: "Silme başarısız.",
    doctorDeleted: "Doktor başarıyla silindi.",
    nurseDeleted: "Hemşire başarıyla silindi.",
    appointmentCreated: "Randevu oluşturuldu.",
    appointmentCreateError: "Randevu oluşturulamadı.",
    appointmentBooked: "Randevu talebiniz kaydedildi.",
    appointmentBookingError: "Randevu alınamadı.",
    medicalRecordCreated: "Hasta için tıbbi kayıt eklendi.",
    medicalRecordCreateError: "Tıbbi kayıt oluşturulamadı.",
    medicalRecordAdded: "Hasta için tıbbi kayıt eklendi.",
    medicalRecordError: "Tıbbi kayıt yazılamadı.",
    callCenterUserCreated: "Yeni çağrı merkezi kullanıcısı oluşturuldu.",
    unknownError: "Bilinmeyen bir hata meydana geldi.",
    logoutSuccess: "Oturum kapatıldı."
  }
};

export default tr;
