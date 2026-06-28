import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(32),
  ADMIN_SETUP_KEY: z.string().min(16),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("0.0.0.0"),
  WHATSAPP_VERIFY_TOKEN: z.string().min(12).optional(),
  WHATSAPP_APP_SECRET: z.string().min(16).optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1).optional(),
  WHATSAPP_CLINIC_ID: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);
