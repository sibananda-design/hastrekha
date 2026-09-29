// Server-only environment access. Throws a clear error when a required secret is missing.
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  serviceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  openaiKey: () => required("OPENAI_API_KEY"),
  readingModel: () => process.env.OPENAI_READING_MODEL || "gpt-4.1",
  chatModel: () => process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini",
  razorpayKeyId: () => process.env.RAZORPAY_KEY_ID || "",
  razorpayKeySecret: () => process.env.RAZORPAY_KEY_SECRET || "",
  razorpayWebhookSecret: () => process.env.RAZORPAY_WEBHOOK_SECRET || "",
};

export const PRICE_PAISE = 9900;
export const PAID_QUESTIONS = 10;
export const FREE_QUESTIONS = 1;
export const LIMITS = {
  readingsPerHour: 5,
  chatPerHour: 30,
  otpPerPhonePerHour: 5,
};
