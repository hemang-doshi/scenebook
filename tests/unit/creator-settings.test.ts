import { describe, expect, test, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    geminiApiKey: "env-gemini-secret",
    openrouterApiKey: "",
    nimApiKey: "",
    huggingFaceApiKey: "env-hf-secret",
    settingsEncryptionKey: "test-encryption-key",
  },
}));

import {
  buildSettingsResponse,
  buildSettingsUpsertPayload,
  getStoredProviderToken,
} from "@/lib/creator-settings";

describe("creator settings helpers", () => {
  test("returns masked provider state without exposing raw keys", () => {
    const response = buildSettingsResponse("creator@example.com", {
      user_id: "user-1",
      gemini_api_key: null,
      openrouter_api_key: null,
      nim_api_key: null,
      gemini_api_key_encrypted: null,
      openrouter_api_key_encrypted: null,
      nim_api_key_encrypted: null,
      huggingface_api_key_encrypted: null,
      creator_context: "Fast-paced creator",
      updated_at: "2026-05-25T00:00:00.000Z",
    });

    expect(response.userEmail).toBe("creator@example.com");
    expect(response.providers.gemini.configured).toBe(true);
    expect(response.providers.gemini.maskedValue).not.toContain("env-gemini-secret");
    expect(response.providers.huggingface.source).toBe("env");
  });

  test("encrypts explicit replacements and clears legacy raw fields", () => {
    const payload = buildSettingsUpsertPayload("user-1", null, {
      creatorContext: "Direct and cinematic",
      providerTokens: {
        gemini: "new-gemini-secret",
        nim: null,
      },
    });

    expect(payload.creator_context).toBe("Direct and cinematic");
    expect(payload.gemini_api_key_encrypted).toBeTruthy();
    expect(payload.gemini_api_key).toBeNull();
    expect(payload.nim_api_key_encrypted).toBeNull();
  });

  test("reads encrypted stored tokens when present", () => {
    const payload = buildSettingsUpsertPayload("user-1", null, {
      providerTokens: {
        huggingface: "hf_test_secret",
      },
    });

    const stored = getStoredProviderToken(
      {
        user_id: "user-1",
        gemini_api_key: null,
        openrouter_api_key: null,
        nim_api_key: null,
        gemini_api_key_encrypted: null,
        openrouter_api_key_encrypted: null,
        nim_api_key_encrypted: null,
        huggingface_api_key_encrypted: payload.huggingface_api_key_encrypted ?? null,
        creator_context: null,
        updated_at: "2026-05-25T00:00:00.000Z",
      },
      "huggingface",
    );

    expect(stored).toBe("hf_test_secret");
  });
});
