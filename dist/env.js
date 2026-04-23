import { z } from "zod";
const envSchema = z.object({
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
    JWT_SECRET: z.string().min(12),
    PORT: z.coerce.number().default(4000),
    HOST: z.string().default("0.0.0.0")
});
export const env = envSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    PORT: process.env.PORT,
    HOST: process.env.HOST
});
