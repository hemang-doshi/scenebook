import type { Database } from "@/lib/supabase/types";
import { env } from "@/lib/env";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/secure-settings";

export const providerKeys = ["gemini", "openrouter", "nim", "huggingface"] as const;

export type ProviderKey = (typeof providerKeys)[number];
export type CreatorSettingsRow = Database["public"]["Tables"]["creator_settings"]["Row"];

export type ProviderTokenPatch = Partial<Record<ProviderKey, string | null>>;

export type ProviderDescriptor = {
  configured: boolean;
  source: "user" | "env" | "none";
  maskedValue: string | null;
};

export type SettingsResponse = {
  userEmail: string | null;
  creatorContext: string;
  providers: Record<ProviderKey, ProviderDescriptor>;
};

const encryptedColumns: Record<ProviderKey, keyof CreatorSettingsRow> = {
  gemini: "gemini_api_key_encrypted",
  openrouter: "openrouter_api_key_encrypted",
  nim: "nim_api_key_encrypted",
  huggingface: "huggingface_api_key_encrypted",
};

const legacyColumns: Partial<Record<ProviderKey, keyof CreatorSettingsRow>> = {
  gemini: "gemini_api_key",
  openrouter: "openrouter_api_key",
  nim: "nim_api_key",
};

const envFallbacks: Record<ProviderKey, string> = {
  gemini: env.geminiApiKey,
  openrouter: env.openrouterApiKey,
  nim: env.nimApiKey,
  huggingface: env.huggingFaceApiKey,
};

export function getStoredProviderToken(
  row: CreatorSettingsRow | null | undefined,
  provider: ProviderKey,
) {
  if (!row) {
    return "";
  }

  const encryptedValue = row[encryptedColumns[provider]];

  if (typeof encryptedValue === "string" && encryptedValue.trim()) {
    return decryptSecret(encryptedValue);
  }

  const legacyColumn = legacyColumns[provider];
  const legacyValue = legacyColumn ? row[legacyColumn] : null;

  return typeof legacyValue === "string" ? legacyValue : "";
}

export function getActiveProviderToken(
  row: CreatorSettingsRow | null | undefined,
  provider: ProviderKey,
) {
  return getStoredProviderToken(row, provider) || envFallbacks[provider] || "";
}

export function buildSettingsResponse(
  userEmail: string | null | undefined,
  row: CreatorSettingsRow | null | undefined,
): SettingsResponse {
  const providers = Object.fromEntries(
    providerKeys.map((provider) => {
      const stored = getStoredProviderToken(row, provider);
      const fallback = envFallbacks[provider];

      const descriptor: ProviderDescriptor = stored
        ? { configured: true, source: "user", maskedValue: maskSecret(stored) }
        : fallback
          ? { configured: true, source: "env", maskedValue: maskSecret(fallback) }
          : { configured: false, source: "none", maskedValue: null };

      return [provider, descriptor];
    }),
  ) as Record<ProviderKey, ProviderDescriptor>;

  return {
    userEmail: userEmail ?? null,
    creatorContext: row?.creator_context ?? "",
    providers,
  };
}

export function buildSettingsUpsertPayload(
  userId: string,
  previous: CreatorSettingsRow | null | undefined,
  input: {
    creatorContext?: string;
    providerTokens?: ProviderTokenPatch;
  },
) {
  const payload = {
    user_id: userId,
    creator_context: input.creatorContext ?? previous?.creator_context ?? "",
    updated_at: new Date().toISOString(),
  } as Database["public"]["Tables"]["creator_settings"]["Update"] & { user_id: string };
  const mutablePayload = payload as Record<string, string | null | undefined>;

  for (const provider of providerKeys) {
    const nextToken = input.providerTokens?.[provider];

    if (nextToken === undefined) {
      continue;
    }

    const encryptedColumn = encryptedColumns[provider];
    const legacyColumn = legacyColumns[provider];
    mutablePayload[encryptedColumn] = encryptSecret(nextToken);

    if (legacyColumn) {
      mutablePayload[legacyColumn] = null;
    }
  }

  return payload;
}
