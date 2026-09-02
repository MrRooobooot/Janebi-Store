import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const INSECURE_DEFAULT_SECRETS = [
  "generate-a-strong-secret-key-here-for-access",
  "generate-a-strong-secret-key-here-for-refresh",
  "secret",
  "changeme",
  "password",
  "1234567890",
];

const envSchema = z.object({
  PORT: z.string().default("3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  JWT_ACCESS_SECRET: z.string().min(10, "JWT_ACCESS_SECRET must be at least 10 characters long"),
  JWT_REFRESH_SECRET: z.string().min(10, "JWT_REFRESH_SECRET must be at least 10 characters long"),
  ZARINPAL_MERCHANT_ID: z.string().length(36, "ZARINPAL_MERCHANT_ID must be 36 characters long").optional().or(z.literal("")),
  ZARINPAL_SANDBOX: z.string().default("true").transform((val: string) => val === "true"),
  DATABASE_URL: z.string().default("./data/janebi.db"),
  GEMINI_API_KEY: z.string().optional().or(z.literal("")),
  APP_URL: z.string().url().default("http://localhost:3000"),
  CORS_ORIGIN: z.string().optional(),
  // SMS provider credentials — OTP delivery stays disabled (dead feature in
  // prod, audit §3.1) until one of these is configured.
  SMS_API_KEY: z.string().optional().or(z.literal("")),
  SMS_PROVIDER: z.string().optional().or(z.literal("")),
  SMS_TEMPLATE_ID: z.string().optional().or(z.literal("")),
  // Bale (بله) bot — product upload assistant. Empty = bot disabled.
  BALE_BOT_TOKEN: z.string().optional().or(z.literal("")),
  BALE_ADMIN_CHAT_IDS: z.string().default("").transform((val: string) =>
    val.split(",").map((s) => parseInt(s.trim(), 10)).filter(Number.isFinite)
  ),
}).transform((data) => ({
  ...data,
  allowedOrigins: data.CORS_ORIGIN
    ? data.CORS_ORIGIN.split(",").map((o) => o.trim())
    : [data.APP_URL, "http://localhost:3000", "http://localhost:5173"],
})).superRefine((data, ctx) => {
  if (data.NODE_ENV === "production") {
    if (INSECURE_DEFAULT_SECRETS.includes(data.JWT_ACCESS_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Default placeholder JWT_ACCESS_SECRET cannot be used in production",
        path: ["JWT_ACCESS_SECRET"],
      });
    }
    if (INSECURE_DEFAULT_SECRETS.includes(data.JWT_REFRESH_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Default placeholder JWT_REFRESH_SECRET cannot be used in production",
        path: ["JWT_REFRESH_SECRET"],
      });
    }
  }
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:");
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;

// Allowed CORS origins, derived from environment configuration
export const allowedOrigins: string[] = env.allowedOrigins;
