import type { FastifyInstance } from "fastify";
import type { UserRole } from "@hospital/shared";

const staffRoles: UserRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "CALL_CENTER",
  "DOCTOR",
  "NURSE",
  "CASHIER",
  "INVENTORY_MANAGER",
  "ACCOUNTANT",
  "MANAGEMENT",
];

type Metric = { label: string; value: string; detail: string };

export async function dashboardRoutes(app: FastifyInstance) {
  app.get(
    "/dashboard/summary",
    { preHandler: [app.authenticate, app.authorize(staffRoles)] },
    async (request) => {
      const { clinicId, role, sub: userId } = request.user;
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const doctor = role === "DOCTOR"
        ? await app.prisma.doctorProfile.findFirst({
            where: { clinicId, userId },
            select: { id: true },
          })
        : null;
      const appointmentWhere = {
        clinicId,
        startsAt: { gte: start, lt: end },
        ...(role === "DOCTOR" ? { doctorId: doctor?.id ?? "__none__" } : {}),
      };

      const [appointments, patientCount, activeStaff, pendingTasks, draftEncounters] =
        await Promise.all([
          app.prisma.appointment.findMany({
            where: appointmentWhere,
            orderBy: { startsAt: "asc" },
            take: 12,
            include: {
              patient: { select: { firstName: true, lastName: true } },
              doctor: { select: { firstName: true, lastName: true } },
            },
          }),
          app.prisma.patientProfile.count({ where: { clinicId } }),
          app.prisma.user.count({ where: { clinicId, active: true } }),
          app.prisma.task.count({
            where: {
              clinicId,
              active: true,
              status: { in: ["PENDING", "IN_PROGRESS"] },
              ...(role === "ADMIN" ? {} : { assigneeUserId: userId }),
            },
          }),
          app.prisma.clinicalEncounter.count({
            where: {
              clinicId,
              status: "DRAFT",
              ...(role === "DOCTOR" ? { doctorUserId: userId } : {}),
            },
          }),
        ]);

      const count = (status: string) => appointments.filter((item) => item.status === status).length;
      let metrics: Metric[];
      let actions: Array<{ label: string; href: string }>;

      switch (role) {
        case "SUPER_ADMIN": {
          const [clinics, users] = await Promise.all([
            app.prisma.clinic.count({ where: { active: true } }),
            app.prisma.user.count({ where: { active: true } }),
          ]);
          metrics = [
            { label: "Aktiv klinikalar", value: String(clinics), detail: "Platforma üzrə" },
            { label: "Aktiv hesablar", value: String(users), detail: "Bütün klinikalar" },
            { label: "Sistem vəziyyəti", value: "İşlək", detail: "API cavab verir" },
          ];
          actions = [{ label: "Sistem hesabatlarına bax", href: "/reports" }];
          break;
        }
        case "ADMIN":
          metrics = [
            { label: "Bugünkü qəbullar", value: String(appointments.length), detail: "Klinika üzrə" },
            { label: "Aktiv əməkdaş", value: String(activeStaff), detail: "İşçi hesabları" },
            { label: "Açıq tapşırıqlar", value: String(pendingTasks), detail: "Komanda üzrə" },
          ];
          actions = [
            { label: "Klinika heyətini idarə et", href: "/administration" },
            { label: "Qəbul təqviminə keç", href: "/appointments" },
          ];
          break;
        case "CALL_CENTER":
          metrics = [
            { label: "Bugünkü qəbullar", value: String(appointments.length), detail: "Təqvim üzrə" },
            { label: "Təsdiq gözləyən", value: String(count("PENDING")), detail: "Əlaqə saxlanmalıdır" },
            { label: "Pasiyent bazası", value: String(patientCount), detail: "Klinika üzrə" },
          ];
          actions = [
            { label: "Yeni qəbul yarat", href: "/appointments" },
            { label: "Pasiyent qeydiyyatı", href: "/patients" },
          ];
          break;
        case "DOCTOR":
          metrics = [
            { label: "Bugünkü qəbullarım", value: String(appointments.length), detail: "Şəxsi qrafik" },
            { label: "Qəbula hazır", value: String(count("CHECKED_IN")), detail: "Pasiyent klinikadadır" },
            { label: "Qaralama qeydlər", value: String(draftEncounters), detail: "Tamamlanmalıdır" },
          ];
          actions = [{ label: "Klinik iş növbəsinə keç", href: "/clinical" }];
          break;
        case "NURSE":
          metrics = [
            { label: "Bugünkü qəbullar", value: String(appointments.length), detail: "Klinika üzrə" },
            { label: "Gələn pasiyent", value: String(count("CHECKED_IN")), detail: "Hazırlıq gözləyir" },
            { label: "Prosedurda", value: String(count("IN_TREATMENT")), detail: "Aktiv qəbul" },
          ];
          actions = [
            { label: "Klinik növbəyə keç", href: "/clinical" },
            { label: "Materiallara bax", href: "/inventory" },
          ];
          break;
        case "CASHIER":
          metrics = [
            { label: "Tamamlanan qəbullar", value: String(count("COMPLETED")), detail: "Ödəniş yoxlanmalıdır" },
            { label: "Kassa növbəsi", value: "—", detail: "Ledger modulu qurulmalıdır" },
            { label: "Gün sonu fərqi", value: "—", detail: "Real əməliyyatdan hesablanacaq" },
          ];
          actions = [{ label: "Kassa və maliyyəyə keç", href: "/finance" }];
          break;
        case "INVENTORY_MANAGER":
          metrics = [
            { label: "Kritik stok", value: "—", detail: "Stok ledger-i qurulmalıdır" },
            { label: "Gözləyən alış", value: "—", detail: "Satınalma modulu qurulmalıdır" },
            { label: "Son istifadə riski", value: "—", detail: "Lot məlumatından hesablanacaq" },
          ];
          actions = [{ label: "Anbar moduluna keç", href: "/inventory" }];
          break;
        case "ACCOUNTANT":
          metrics = [
            { label: "Təsdiqli gəlir", value: "—", detail: "Maliyyə ledger-i qurulmalıdır" },
            { label: "Açıq period", value: "—", detail: "Period bağlanması qurulmalıdır" },
            { label: "Reconciliation", value: "—", detail: "Uyğunlaşdırma mühərriki qurulmalıdır" },
          ];
          actions = [
            { label: "Maliyyəyə keç", href: "/finance" },
            { label: "Hesabatlara bax", href: "/reports" },
          ];
          break;
        default:
          metrics = [
            { label: "Bugünkü qəbullar", value: String(appointments.length), detail: "Klinika üzrə" },
            { label: "Tamamlanan", value: String(count("COMPLETED")), detail: "Bugünkü nəticə" },
            { label: "No-show", value: String(count("NO_SHOW")), detail: "Gəlməyən pasiyent" },
          ];
          actions = [{ label: "İdarəetmə hesabatlarına bax", href: "/reports" }];
      }

      const showPatientDetails = ["ADMIN", "CALL_CENTER", "DOCTOR", "NURSE"].includes(role);
      return {
        role,
        metrics,
        actions,
        appointments: showPatientDetails
          ? appointments.map((item) => ({
              id: item.id,
              startsAt: item.startsAt,
              status: item.status,
              patientName: `${item.patient.firstName} ${item.patient.lastName}`,
              doctorName: `${item.doctor.firstName} ${item.doctor.lastName}`,
            }))
          : [],
      };
    },
  );
}
