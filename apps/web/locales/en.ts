const en = {
  appTitle: "Hospital Platform",
  ui: {
    language: "Language",
    languages: {
      az: "Azərbaycan dili",
      en: "English",
      ru: "Русский",
      tr: "Türkçe"
    }
  },
  roles: {
    ADMIN: "Admin",
    DOCTOR: "Doctor",
    NURSE: "Nurse",
    CALL_CENTER: "Front Desk",
    PATIENT: "Patient"
  },
  auth: {
    tabs: {
      patientLogin: "Patient login",
      patientRegister: "Patient register",
      staffLogin: "Staff login",
      bootstrap: "Admin setup",
      resetPassword: "Reset password"
    },
    headings: {
      patientPortal: "Sign in to the patient portal",
      staffPortal: "Sign in to your staff dashboard",
      bootstrap: "First admin account only",
      resetPassword: "Update admin password",
      secureLogin: "Secure login"
    },
    descriptions: {
      staffIntro: "Admin gets management tools, doctor sees only their patients and appointments, front desk manages patient intake.",
      register: "Create an online account and manage your appointments.",
      resetHint: "If you know the setup key, you can reset the admin password."
    },
    form: {
      email: "Email",
      password: "Password",
      identityNumber: "Identity number",
      phone: "Phone",
      firstName: "First name",
      lastName: "Last name",
      gender: "Gender",
      genderFemale: "Female",
      genderMale: "Male",
      genderOther: "Other",
      birthDate: "Birth date",
      bloodType: "Blood type",
      allergies: "Allergies",
      chronicConditions: "Chronic conditions",
      setupKey: "Setup key",
      currentPassword: "Current password",
      newPassword: "New password",
      confirmPassword: "Confirm password"
    },
    buttons: {
      login: "Sign in",
      logout: "Sign out",
      refresh: "Refresh",
      createAccount: "Create account",
      bootstrap: "Create admin account",
      resetPassword: "Reset password",
      updatePassword: "Change password",
      addDoctor: "Add doctor",
      addPatient: "Add patient"
    }
  },
  landing: {
    heroTitle: "Separate, role-specific workspaces for every user",
    heroDescription: "Patients manage appointments and records, doctors see their own patients, and front desk staff route intake efficiently.",
    stats: {
      portals: "Separate portals",
      auth: "Role-based login",
      live: "Live API workflow"
    },
    cards: {
      admin: {
        title: "Admin",
        description: "System control, staff accounts, doctor and front desk oversight."
      },
      frontdesk: {
        title: "Front Desk",
        description: "Identity checks, patient intake, conflict-free doctor assignment."
      },
      doctor: {
        title: "Doctor",
        description: "Daily appointments, patient profile, treatment and prescriptions."
      },
      patient: {
        title: "Patient",
        description: "Book new appointments, view past visits, reports and prescriptions."
      }
    }
  },
  sidebar: {
    dashboard: "Dashboard",
    staff: "Staff accounts",
    doctors: "Doctors",
    patients: "Patients",
    appointments: "Appointments",
    settings: "Settings",
    register: "Patient register",
    doBooking: "Appointment planning",
    doctorFlow: "Doctor flow",
    profile: "Profile",
    history: "Past visits",
    reports: "Reports"
  },
  shell: {
    adminTitle: "Admin panel",
    adminSubtitle: "System management",
    deskTitle: "Front desk panel",
    deskSubtitle: "Identity verification and routing",
    doctorTitle: "Doctor panel",
    doctorSubtitle: "Today’s patient flow",
    patientTitle: "Patient portal",
    patientSubtitle: "Personal appointments and records",
    activeSession: "Active session",
    roleField: "Role"
  },
  admin: {
    description: "Manage staff accounts, add new doctors, monitor appointment flow."
  },
  metrics: {
    totalRequests: "Total requests",
    totalErrors: "Error count",
    averageResponseMs: "Average response",
    p95: "P95",
    liveData: "Live API metrics",
    trace: "Observability panel",
    latency: "Latency indicator",
    load: "Load boundary"
  },
  forms: {
    newStaff: "Create new staff",
    newDoctor: "Create new doctor",
    newPatient: "New patient",
    patientRegistration: "Patient registration form",
    appointmentBooking: "Create conflict-free booking",
    schedule: "Upcoming schedule",
    patientProfile: "Patient profile",
    patientDetails: "Medical history",
    newRecord: "New report and prescription"
  },
  status: {
    CONFIRMED: "Confirmed",
    PENDING: "Pending",
    COMPLETED: "Completed",
    CANCELED: "Canceled",
    NO_SHOW: "No show"
  },
  channel: {
    web: "Web",
    mobile: "Mobile",
    "call-center": "Call center"
  },
  confirm: {
    deleteStaff: "Are you sure you want to delete this staff member? This action cannot be undone.",
    deleteDoctor: "Are you sure you want to delete this doctor? This action cannot be undone."
  },
  messages: {
    loadingData: "Loading data...",
    loggedOut: "Signed out.",
    deleteSuccess: "Deleted successfully.",
    dataLoadError: "Data could not be loaded.",
    loginError: "Login failed.",
    loginSuccess: "Login successful.",
    bootstrapError: "Bootstrap failed.",
    resetPasswordError: "Password reset failed.",
    changePasswordError: "Password change failed.",
    registerError: "Registration failed.",
    adminAccountCreated: "Admin account created. You can now sign in as admin.",
    patientAccountCreated: "Your patient account has been created and you are signed in.",
    patientCreated: "Patient registration completed.",
    patientCreateError: "Patient could not be created.",
    patientAdded: "Patient added successfully.",
    doctorCreated: "New doctor added.",
    doctorCreateError: "Doctor could not be created.",
    doctorAdded: "Doctor added successfully.",
    staffCreateError: "Staff account could not be created.",
    staffAccountCreated: "{{role}} account created.",
    staffDeactivated: "Staff account deactivated.",
    deactivationError: "Deactivation failed.",
    deleteError: "Deletion failed.",
    doctorDeleted: "Doctor deleted successfully.",
    nurseDeleted: "Nurse deleted successfully.",
    appointmentCreated: "Appointment created.",
    appointmentCreateError: "Appointment could not be created.",
    appointmentBooked: "Your appointment request has been recorded.",
    appointmentBookingError: "Appointment could not be booked.",
    medicalRecordCreated: "Medical record added for patient.",
    medicalRecordCreateError: "Medical record could not be created.",
    medicalRecordAdded: "Medical record added for patient.",
    medicalRecordError: "Medical record could not be written.",
    callCenterUserCreated: "New call center user created.",
    unknownError: "An unknown error occurred.",
    logoutSuccess: "Signed out."
  }
};

export default en;
