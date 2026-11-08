const { z } = require('zod');
const dotenv = require('dotenv');

dotenv.config();

const envSchema = z
  .object({
    PORT: z.string().default('5000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Supabase
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string(),

    // Frontend URL
    FRONTEND_URL: z.string().url().default('http://localhost:5173'),

    // Auth
    JWT_SECRET: z.string().min(32),

    // SMTP Config — optional in development, REQUIRED in production.
    // In dev: fallback to Ethereal Email preview (see src/config/mailer.js).
    // In production: must point to Brevo SMTP credentials.
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().transform((val) => (val ? Number(val) : undefined)).optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    BREVO_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().email().optional(),
  })
  .superRefine((data, ctx) => {
    // ASSUMPTION: In production, transactional emails are critical system output.
    // Fail fast at startup if SMTP is not configured — do not silently swallow emails.
    if (data.NODE_ENV === 'production') {
      const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'];
      for (const field of required) {
        if (!data[field]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `${field} is required in production. Set it in your environment variables.`,
          });
        }
      }
    }
  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

module.exports = parsedEnv.data;