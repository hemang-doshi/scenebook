import { NangoConfigurationError } from "@/lib/integrations/nango/errors";

export type NangoConfig = {
  secretKey: string;
  publicKey: string | null;
  host: string;
};

const defaultNangoHost = "https://api.nango.dev";

function envValue(name: string) {
  return process.env[name]?.trim() || null;
}

export function hasPublicNangoSecretLeak() {
  return Boolean(envValue("NEXT_PUBLIC_NANGO_SECRET_KEY"));
}

export function getNangoConfig(): NangoConfig {
  if (hasPublicNangoSecretLeak()) {
    throw new NangoConfigurationError("NANGO_SECRET_KEY must never be exposed through NEXT_PUBLIC_NANGO_SECRET_KEY.");
  }

  const secretKey = envValue("NANGO_SECRET_KEY");

  if (!secretKey) {
    throw new NangoConfigurationError("NANGO_SECRET_KEY is required to create Nango connect sessions.");
  }

  return {
    secretKey,
    publicKey: envValue("NANGO_PUBLIC_KEY"),
    host: envValue("NANGO_HOST") ?? defaultNangoHost,
  };
}

export function isNangoConfigured() {
  return Boolean(envValue("NANGO_SECRET_KEY")) && !hasPublicNangoSecretLeak();
}
