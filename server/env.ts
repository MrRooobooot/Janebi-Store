import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_ACCESS_SECRET: z.string().min(10, 'JWT_ACCESS_SECRET must be at least 10 characters long'),
  JWT_REFRESH_SECRET: z.string().min(10, 'JWT_REFRESH_SECRET must be at least 10 characters long'),
  ZARINPAL_MERCHANT_ID: z.string().length(36, 'ZARINPAL_MERCHANT_ID must be 36 characters long').optional().or(z.literal('')),
  ZARINPAL_SANDBOX: z.string().default('true').transform((val: string) => val === 'true'),
  DATABASE_URL: z.string().default('./data/janebi.db'),
  GEMINI_API_KEY: z.string().optional().or(z.literal('')),
  APP_URL: z.string().url().default('http://localhost:3000'),
  ALLOWED_ORIGINS: z.string().optional().default(''),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production') {
    if (!data.JWT_ACCESS_SECRET || data.JWT_ACCESS_SECRET.length < 16) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_ACCESS_SECRET'],
        message: 'JWT_ACCESS_SECRET must be at least 16 characters in production',
      });
    }
    if (!data.JWT_REFRESH_SECRET || data.JWT_REFRESH_SECRET.length < 16) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_REFRESH_SECRET'],
        message: 'JWT_REFRESH_SECRET must be at least 16 characters in production',
      });
    }
  }
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Fatal Environment Configuration Error:');
  const sanitizedErrors = parsedEnv.error.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
  console.error(JSON.stringify(sanitizedErrors, null, 2));
  process.exit(1);
}

const parsedData = parsedEnv.data;

// Compute allowed origins list
const extraOrigins = parsedData.ALLOWED_ORIGINS
  ? parsedData.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : [];
const computedAllowedOrigins = Array.from(new Set([parsedData.APP_URL, ...extraOrigins]));

export const env = {
  ...parsedData,
  allowedOrigins: computedAllowedOrigins,
};
