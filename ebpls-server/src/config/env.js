const { z } = require('zod');
const dotenv = require('dotenv');

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  
  // Auth
  JWT_SECRET: z.string().min(32),
  
  // PayMongo (Added in Phase 5)
  PAYMONGO_SECRET_KEY: z.string().min(1),
  PAYMONGO_WEBHOOK_SECRET: z.string().min(1),
  PAYMONGO_SUCCESS_URL: z.string().url(),
  PAYMONGO_CANCEL_URL: z.string().url(),
  
  // SMTP Config (Optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(val => val ? Number(val) : undefined).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

module.exports = parsedEnv.data;