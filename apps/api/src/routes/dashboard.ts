import type { FastifyInstance } from "fastify";
import type { UserRole } from "@hospital/shared";
import { z } from "zod";
import { todayFinanceSummary } from "../services/finance-service.js";

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
    "/reports/operations",
    { preHandler: [app.authenticate, app.authorize(["ADMIN", "ACCOUNTANT", "MANAGEMENT"])] },
    async (request, reply) => {
      const query = z.object({ startDate: z.string().datetime(), endDate: z.string().datetime() }).parse(request.query);
      const startDate = new Date(query.startDate);
      const endDate = new Date(query.endDate);
      if (endDate <= startDate || endDate.getTime() - startDate.getTime() > 366 * 86400000) {
        return reply.code(400).send({ message: "Hesabat tarix aralığı düzgün deyil." });
      }
      const [appointments, patientCount] = await Promise.all([
        app.prisma.appointment.findMany({
          where: { clinicId: request.user.clinicId, startsAt: { gte: startDate, lte: endDate } },
          select: { status: true, doctor: { select: { branch: true } } },
        }),
        app.prisma.patientProfile.count({ where: { clinicId: request.user.clinicId } }),
      ]);
      const statusCounts: Record<string, number> = {};
      const branchCounts: Record<string, number> = {};
      for (const appointment of appointments) {
        statusCounts[appointment.status] = (statusCounts[appointment.status] ?? 0) + 1;
        branchCounts[appointment.doctor.branch] = (branchCounts[appointment.doctor.branch] ?? 0) + 1;
      }
      return {
        appointmentCount: appointments.length,
        patientCount,
        statusCounts,
        branchCounts: Object.entries(branchCounts).map(([branch, count]) => ({ branch, count })),
      };
    },
  );

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
        case "CASHIER": {
          const finance = await app.prisma.$transaction((tx) => todayFinanceSummary(tx, clinicId));
          metrics = [
            { label: "Bugünkü ödəniş", value: `${finance.todayPayments.toFixed(2)} ₼`, detail: `Nağd: ${finance.todayCashPayments.toFixed(2)} ₼` },
            { label: "Borclu pasiyent", value: String(finance.openDebtors), detail: `Cəmi: ${finance.totalOutstanding.toFixed(2)} ₼` },
            {
              label: "Kassa növbəsi",
              value: finance.openSession ? "Açıq" : "Bağlı",
              detail: finance.openSession
                ? `Gözlənilən: ${(finance.openSession.expectedBalance ?? 0).toFixed(2)} ₼`
                : "Günə başlamaq üçün kassanı açın",
            },
          ];
          actions = [{ label: "Kassa və maliyyəyə keç", href: "/finance" }];
          break;
        }
        case "INVENTORY_MANAGER": {
          const products = await app.prisma.product.findMany({
            where: { clinicId, active: true },
            select: { id: true, minimumStock: true },
          });
          const totals = await app.prisma.stockMovement.groupBy({
            by: ["productId", "type"],
            where: { clinicId },
            _sum: { quantity: true },
          });
          const incomingTypes = new Set(["PURCHASE", "TRANSFER_IN", "RETURN", "ADJUSTMENT_IN"]);
          const critical = products.filter((product) => {
            const balance = totals.filter((row) => row.productId === product.id).reduce(
              (sum, row) => sum + (incomingTypes.has(row.type) ? 1 : -1) * Number(row._sum.quantity ?? 0),
              0,
            );
            return balance <= product.minimumStock.toNumber();
          }).length;
          metrics = [
            { label: "Aktiv material", value: String(products.length), detail: "Məhsul kartları" },
            { label: "Kritik stok", value: String(critical), detail: "Minimum və aşağı" },
            { label: "Alış siqnalı", value: critical ? "Var" : "Yox", detail: "Stok ledger-i üzrə" },
          ];
          actions = [{ label: "Anbar moduluna keç", href: "/inventory" }];
          break;
        }
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
