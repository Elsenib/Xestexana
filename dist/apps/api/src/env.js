import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { z } from "zod";
const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const envPath = path.resolve(currentDir, "../../..", ".env");
loadEnv({ path: envPath });
const envSchema = z.object({
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
    JWT_SECRET: z.string().min(12),
    ADMIN_SETUP_KEY: z.string().min(8).default("hospital-admin-setup-key"),
    PORT: z.coerce.number().default(4000),
    HOST: z.string().default("0.0.0.0")
});
export const env = envSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    ADMIN_SETUP_KEY: process.env.ADMIN_SETUP_KEY,
    PORT: process.env.PORT,
    HOST: process.env.HOST
});
