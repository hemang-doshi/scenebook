import { afterEach, describe, expect, test } from "vitest";

import { getNangoConfig, isNangoConfigured } from "@/lib/integrations/nango/config";
import { getNangoProviderMapping, isNangoProviderConfigured } from "@/lib/integrations/nango/provider-map";

const originalEnv = { ...process.env };

describe("Nango configuration", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test("missing NANGO_SECRET_KEY disables connect", () => {
    delete process.env.NANGO_SECRET_KEY;
    process.env.NANGO_INTEGRATION_GOOGLE_DRIVE = "google-drive";

    expect(isNangoConfigured()).toBe(false);
    expect(() => getNangoConfig()).toThrow("NANGO_SECRET_KEY is required");
  });

  test("NANGO_SECRET_KEY is rejected when exposed as a public env var", () => {
    process.env.NANGO_SECRET_KEY = "server-secret";
    process.env.NEXT_PUBLIC_NANGO_SECRET_KEY = "leaked-secret";

    expect(isNangoConfigured()).toBe(false);
    expect(() => getNangoConfig()).toThrow("must never be exposed");
  });

  test("provider mappings are read from env-configurable Nango integration ids", () => {
    process.env.NANGO_INTEGRATION_GOOGLE_DRIVE = "scene-google-drive";

    expect(isNangoProviderConfigured("google_drive")).toBe(true);
    expect(getNangoProviderMapping("google_drive")).toEqual({
      provider: "google_drive",
      nangoIntegrationId: "scene-google-drive",
      defaultScopes: [],
    });
  });
});
