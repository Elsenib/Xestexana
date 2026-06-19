export default {
  expo: {
    name: process.env.CLINIC_NAME || "Xəstəxana Mobil",
    slug: "hospital-mobile",
    version: "1.0.0",
    orientation: "portrait",
    // userInterfaceStyle-i sil və ya aşağıdakı kimi yaz:
    extra: {
      clinicId: process.env.CLINIC_ID || "",
      apiUrl: process.env.API_URL || "https://api-production-e6391.up.railway.app/api",
      eas: {
        projectId: "47970f9e-8c50-4624-bfd0-973654282515",
      },
    },
    android: {
      package: "com.dasdanstudio.hospitalmobile",
    },
  },
};
