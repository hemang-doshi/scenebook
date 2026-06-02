type EnvSource = Record<string, string | undefined>;

const publicSecretPattern = /^NEXT_PUBLIC_.*(GEMINI|GOOGLE_GENERATIVE_AI|NIM|NVIDIA_NIM|API_KEY|TOKEN|SECRET)/i;

export function assertServerOnlyModelSecrets(source: EnvSource = process.env) {
  const publicModelSecrets = Object.keys(source).filter((name) => publicSecretPattern.test(name));

  if (publicModelSecrets.length > 0) {
    throw new Error(
      `Model provider secrets must be server-only. Remove public env vars: ${publicModelSecrets.join(", ")}.`,
    );
  }
}

export function getGeminiApiKey(source: EnvSource = process.env) {
  assertServerOnlyModelSecrets(source);
  return source.GOOGLE_GENERATIVE_AI_API_KEY ?? source.GEMINI_API_KEY ?? "";
}

export function getNimApiKey(source: EnvSource = process.env) {
  assertServerOnlyModelSecrets(source);
  return source.NIM_API_KEY ?? source.NVIDIA_NIM_API_KEY ?? "";
}
