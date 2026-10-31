import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env file from root or backend directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  TINKOFF_TOKEN: z.string().default(''),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  HOST: z.string().default('127.0.0.1'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DEFAULT_TICKERS: z
    .string()
    .default('SBER,GAZP,LKOH,GMKN,ROSN')
    .transform((val) =>
      val
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    ),
  TINKOFF_ENDPOINT: z.string().default('invest-public-api.tbank.ru:443'),
  TINKOFF_APP_NAME: z.string().default('moex-screener-pro'),
  TINKOFF_REJECT_UNAUTHORIZED: z
    .string()
    .optional()
    .transform((val) => val === 'true' || val === '1'),
  TELEGRAM_BOT_TOKEN: z.string().default(''),
  TELEGRAM_CHAT_ID: z.string().default(''),
  TELEGRAM_ENABLED: z
    .string()
    .optional()
    .transform((val) => val === 'true' || val === '1'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Format errors cleanly
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
