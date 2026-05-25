const rawEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "",
  nimBaseUrl: process.env.NVIDIA_NIM_BASE_URL ?? "",
  nimApiKey: process.env.NVIDIA_NIM_API_KEY ?? "",
  nimModel:
    process.env.NVIDIA_NIM_MODEL ?? "meta/llama-3.1-70b-instruct",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  openrouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
};

export const env = {
  ...rawEnv,
  isSampleMode: false,
  hasAiConfig: Boolean(
    (rawEnv.nimBaseUrl && rawEnv.nimApiKey) ||
    rawEnv.geminiApiKey ||
    rawEnv.openrouterApiKey
  ),
};


