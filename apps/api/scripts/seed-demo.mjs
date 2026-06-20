import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const envPath of [path.resolve(process.cwd(), ".env"), path.resolve(__dirname, "../.env"), path.resolve(__dirname, "../../../.env")]) {
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath, override: false });
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL tapılmadı. .env faylında təyin edin.");

const prisma = new PrismaClient({ log: ["warn", "error"] });
const accounts = [
  ["SUPER_ADMIN", "superadmin@lovelydent.demo", "LD!Super.26#Q7m"],
  ["ADMIN", "admin@lovelydent.demo", "LD!Admin.26#K4x"],
  ["CALL_CENTER", "reception@lovelydent.demo", "LD!Reception.26#R8p"],
  ["DOCTOR", "doctor@lovelydent.demo", "LD!Doctor.26#D9k"],
  ["NURSE", "assistant@lovelydent.demo", "LD!Assistant.26#N5v"],
  ["CASHIER", "cashier@lovelydent.demo", "LD!Cashier.26#C6w"],
  ["INVENTORY_MANAGER", "inventory@lovelydent.demo", "LD!Inventory.26#I2t"],
  ["ACCOUNTANT", "accountant@lovelydent.demo", "LD!Accountant.26#A8y"],
  ["MANAGEMENT", "management@lovelydent.demo", "LD!Management.26#M4s"],
  ["PATIENT", "patient@lovelydent.demo", "LD!Patient.26#P3z"]
];

async function upsertUser([role, email, password], clinicId) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({ where: { email }, update: { passwordHash, role, clinicId, active: true }, create: { email, passwordHash, role, clinicId, active: true } });
}

async function main() {
  const clinic = await prisma.clinic.upsert({
    where: { id: "demo-clinic-lovelydent" },
    update: { name: "LovelyDent Demo Klinik", active: true, maxUsers: 20, maxPatients: 1000 },
    create: { id: "demo-clinic-lovelydent", name: "LovelyDent Demo Klinik", address: "Bakı şəhəri", active: true, maxUsers: 20, maxPatients: 1000 }
  });

  const users = new Map();
  for (const account of accounts) users.set(account[0], await upsertUser(account, clinic.id));
  const doctorUser = users.get("DOCTOR");
  const patientUser = users.get("PATIENT");
  const adminUser = users.get("ADMIN");
  const receptionUser = users.get("CALL_CENTER");

  const doctor = await prisma.doctorProfile.upsert({
    where: { userId: doctorUser.id },
    update: { clinicId: clinic.id, title: "Dr.", firstName: "Nigar", lastName: "Əliyeva", branch: "Baş filial", roomNumber: "201", active: true },
    create: { userId: doctorUser.id, clinicId: clinic.id, title: "Dr.", firstName: "Nigar", lastName: "Əliyeva", branch: "Baş filial", roomNumber: "201", active: true }
  });
  const patient = await prisma.patientProfile.upsert({
    where: { userId: patientUser.id },
    update: { clinicId: clinic.id, identityNumber: "AA1234567", firstName: "Aysel", lastName: "Məmmədova", phone: "+994501112233", gender: "FEMALE", birthDate: new Date("1995-04-12T00:00:00.000Z") },
    create: { userId: patientUser.id, clinicId: clinic.id, identityNumber: "AA1234567", firstName: "Aysel", lastName: "Məmmədova", phone: "+994501112233", gender: "FEMALE", birthDate: new Date("1995-04-12T00:00:00.000Z") }
  });
  const startsAt = new Date(); startsAt.setDate(startsAt.getDate() + 1); startsAt.setHours(10, 0, 0, 0);
  await prisma.appointment.upsert({
    where: { id: "demo-appointment-lovelydent" },
    update: { startsAt, endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000), status: "CONFIRMED" },
    create: { id: "demo-appointment-lovelydent", clinicId: clinic.id, patientId: patient.id, doctorId: doctor.id, startsAt, endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000), status: "CONFIRMED", channel: "reception", notes: "Demo qəbul" }
  });
  try {
    await prisma.task.upsert({
      where: { id: "demo-task-lovelydent" },
      update: { assigneeUserId: receptionUser.id, createdByUserId: adminUser.id, status: "PENDING", active: true },
      create: { id: "demo-task-lovelydent", clinicId: clinic.id, title: "Sabahkı qəbulları təsdiqlə", description: "Saat 18:00-a qədər pasiyentlərlə əlaqə saxlanmalıdır.", assigneeUserId: receptionUser.id, createdByUserId: adminUser.id, dueDate: startsAt, priority: "HIGH", status: "PENDING", active: true }
    });
  } catch { console.log("Task migration-u tətbiq edilməyib; demo tapşırıq ötürüldü."); }

  console.log("\nLovelyDent demo hesabları hazırdır:\n");
  for (const [role, email, password] of accounts) console.log(`${role.padEnd(18)} ${email.padEnd(34)} ${password}`);
  console.log("\nBu şifrələr yalnız demo üçündür; production-da istifadə etməyin.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
