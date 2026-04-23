const az = {
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
    DOCTOR: "Həkim",
    NURSE: "Tibb bacısı",
    CALL_CENTER: "Qeydiyyat",
    PATIENT: "Pasiyent"
  },
  auth: {
    tabs: {
      patientLogin: "Pasiyent girişi",
      patientRegister: "Pasiyent qeydiyyatı",
      staffLogin: "Personel girişi",
      bootstrap: "Admin qurulumu",
      resetPassword: "Şifrəni sıfırla"
    },
    headings: {
      patientPortal: "Pasiyent portalına daxil olun",
      staffPortal: "Rolunuza uyğun iş ekranına daxil olun",
      bootstrap: "Yalnız ilk admin hesabı üçün",
      resetPassword: "Admin şifrəsini yenilə",
      secureLogin: "Təhlükəsiz giriş"
    },
    descriptions: {
      staffIntro: "Admin yalnız idarəetmə panelini, həkim yalnız öz pasiyent və randevu ekranını, qeydiyyat isə qəbul axınını görür.",
      register: "Onlayn hesab yarat və öz randevularını idarə et",
      resetHint: "Qurulum açarını bilirsinizsə admin şifrəsini sıfırlaya bilərsiniz."
    },
    form: {
      email: "E-poçt",
      password: "Şifrə",
      identityNumber: "Şəxsiyyət nömrəsi",
      phone: "Telefon",
      firstName: "Ad",
      lastName: "Soyad",
      gender: "Cins",
      genderFemale: "Qadın",
      genderMale: "Kişi",
      genderOther: "Digər",
      birthDate: "Doğum tarixi",
      bloodType: "Qan qrupu",
      allergies: "Allergiyalar",
      chronicConditions: "Xroniki xəstəliklər",
      setupKey: "Qurulum açarı",
      currentPassword: "Cari şifrə",
      newPassword: "Yeni şifrə",
      confirmPassword: "Şifrə təsdiqi"
    },
    buttons: {
      login: "Giriş et",
      logout: "Çıxış et",
      refresh: "Yenilə",
      createAccount: "Hesab yarat",
      bootstrap: "Admin hesabı yarat",
      resetPassword: "Şifrəni sıfırla",
      updatePassword: "Şifrəni dəyişdir",
      addDoctor: "Həkim əlavə et",
      addPatient: "Pasiyent əlavə et"
    }
  },
  landing: {
    heroTitle: "Hər rol üçün ayrı, məqsədə uyğun iş ekranı",
    heroDescription: "Pasiyent randevu və tibbi qeydlərini izləyir, həkim yalnız öz pasiyentlərini görür, qeydiyyat masası isə kimlik yoxlayıb doğru həkimə yönləndirmə aparır.",
    stats: {
      portals: "Ayrı portal",
      auth: "Rol əsaslı giriş",
      live: "API və qeyd axını"
    },
    cards: {
      admin: {
        title: "Admin",
        description: "Sistem idarəsi, işçi hesabları, həkim və qeydiyyat nəzarəti."
      },
      frontdesk: {
        title: "Qeydiyyat",
        description: "Kimlik yoxlama, pasiyent açılışı, uyğun həkimə çakışmasız qeyd."
      },
      doctor: {
        title: "Həkim",
        description: "Günün randevuları, pasiyent profili, müalicə və təyinat qeydi."
      },
      patient: {
        title: "Pasiyent",
        description: "Yeni randevu, keçmiş görüşlər, rapor və reseptlərin görünüşü."
      }
    }
  },
  sidebar: {
    dashboard: "Dashboard",
    staff: "İşçi hesabları",
    doctors: "Həkimlər",
    patients: "Pasiyentlər",
    appointments: "Randevular",
    settings: "Tənzimləmələr",
    register: "Pasiyent qeydiyyatı",
    doBooking: "Randevu planlama",
    doctorFlow: "Həkim axını",
    profile: "Profil",
    history: "Keçmiş görüşlər",
    reports: "Rapor və reseptlər"
  },
  shell: {
    adminTitle: "Admin panel",
    adminSubtitle: "Sistem idarəetməsi",
    deskTitle: "Qeydiyyat paneli",
    deskSubtitle: "Kimlik yoxlama və yönləndirmə",
    doctorTitle: "Həkim paneli",
    doctorSubtitle: "Günün pasiyent axını",
    patientTitle: "Pasiyent portalı",
    patientSubtitle: "Şəxsi randevu və rapor görünüşü",
    activeSession: "Aktiv sessiya",
    roleField: "Rol"
  },
  admin: {
    description: "Isçi hesablarını açın, yeni həkim əlavə edin, qəbul axınını izləyin."
  },
  metrics: {
    totalRequests: "Toplam sorğu",
    totalErrors: "Xəta sayı",
    averageResponseMs: "Orta cavab",
    p95: "P95",
    liveData: "Canlı API statistikası",
    trace: "İzləmə paneli",
    latency: "Gecikmə göstəricisi",
    load: "Yüklənmə sərhədi"
  },
  forms: {
    newStaff: "Yeni personal yarat",
    newDoctor: "Yeni həkim yarat",
    newPatient: "Yeni pasiyent",
    patientRegistration: "Qeydiyyat formu",
    appointmentBooking: "Çakışmasız randevu yarat",
    schedule: "Yaxın təqvim",
    patientProfile: "Pasiyent profili",
    patientDetails: "Tibbi tarixçə",
    newRecord: "Yeni rapor və təyinat"
  },
  status: {
    CONFIRMED: "Təsdiqlənib",
    PENDING: "Gözləyir",
    COMPLETED: "Tamamlanıb",
    CANCELED: "Ləğv edilib",
    NO_SHOW: "Gəlməyib"
  },
  channel: {
    web: "Veb",
    mobile: "Mobil",
    "call-center": "Qeydiyyat"
  },
  confirm: {
    deleteStaff: "Bu işçini silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarılmayacaq.",
    deleteDoctor: "Bu həkimi silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarılmayacaq."
  },
  messages: {
    loadingData: "Məlumatlar yüklənir...",
    loggedOut: "Çıxış edildi.",
    deleteSuccess: "Uğurla silindi.",
    dataLoadError: "Veri yüklənmədi.",
    loginError: "Giriş uğursuz oldu.",
    loginSuccess: "Giriş uğurla tamamlandı.",
    bootstrapError: "Bootstrap uğursuz oldu.",
    resetPasswordError: "Şifrə sıfırlama uğursuz oldu.",
    changePasswordError: "Şifrə dəyişdirmə uğursuz oldu.",
    registerError: "Qeydiyyat mümkün olmadı.",
    adminAccountCreated: "Admin hesabı yaradıldı. İndi admin girişi edə bilərsiniz.",
    patientAccountCreated: "Pasiyent hesabınız yaradıldı və giriş edildi.",
    patientCreated: "Pasiyent qeydiyyatı tamamlandı.",
    patientCreateError: "Pasiyent yaradılmadı.",
    patientAdded: "Pasiyent uğurla əlavə edildi.",
    doctorCreated: "Yeni həkim əlavə edildi.",
    doctorCreateError: "Həkim yaradılmadı.",
    doctorAdded: "Həkim uğurla əlavə edildi.",
    staffCreateError: "İşçi hesabı yaradılmadı.",
    staffAccountCreated: "{{role}} hesabı yaradıldı.",
    staffDeactivated: "İşçi hesabı deaktiv edildi.",
    deactivationError: "Deaktivasiya mumkun olmadi.",
    deleteError: "Silinmə uğursuz oldu.",
    doctorDeleted: "Həkim uğurla silindi.",
    nurseDeleted: "Hemşire uğurla silindi.",
    appointmentCreated: "Randevu yaradıldı.",
    appointmentCreateError: "Randevu yaradılmadı.",
    appointmentBooked: "Randevu sorğunuz qeydə alındı.",
    appointmentBookingError: "Randevu alına bilmədi.",
    medicalRecordCreated: "Pasiyent üçün tibbi qeyd əlavə edildi.",
    medicalRecordCreateError: "Tibbi qeyd yazılmadı.",
    medicalRecordAdded: "Pasiyent üçün tibbi qeyd əlavə edildi.",
    medicalRecordError: "Tibbi qeyd yazılmadı.",
    callCenterUserCreated: "Yeni çağrı mərkəzi istifadəçisi yaradıldı.",
    unknownError: "Naməlum xəta baş verdi.",
    logoutSuccess: "Çıxış edildi."
  }
};

export default az;
