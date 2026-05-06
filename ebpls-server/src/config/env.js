const { z } = require('zod');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Define the schema for our environment variables
// ASSUMPTION: We validate at startup to fail-fast if config is missing
const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(), // Used for backend admin bypass (like creating users)
  
  // Auth
  JWT_SECRET: z.string().min(32),
  
  // SMTP Config (Optional for development)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(val => val ? Number(val) : undefined).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
});

// Parse and validate the environment variables
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1); // Fail closed if environment is improperly configured
}

module.exports = parsedEnv.data;
