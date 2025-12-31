import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]),
  BASE_URL: z.string().optional(),
  BASE_URL_OTHER_PORT: z.string().optional(),
  ADMIN_PASSWORD: z.string(),
  JWT_SECRET: z.string(),
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_PUBLISHABLE_KEY: z.string(),
  MERCURY_API_KEY: z.string(),
  OPENPHONE_API_KEY: z.string().optional(), // Optional for now to avoid breaking dev if not set
});

export const env = envSchema.parse(process.env);
