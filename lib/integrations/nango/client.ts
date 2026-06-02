import { Nango } from "@nangohq/node";

import type { ServerUser } from "@/lib/auth/server-user";
import type { IntegrationProvider } from "@/lib/integrations/connections/types";
import { getNangoConfig } from "@/lib/integrations/nango/config";
import { getNangoProviderMapping } from "@/lib/integrations/nango/provider-map";

export type SafeNangoConnectSession = {
  token: string;
  connectLink: string | null;
  expiresAt: string;
};

export function createNangoClient() {
  const config = getNangoConfig();

  return new Nango({
    secretKey: config.secretKey,
    host: config.host,
  });
}

function safeSession(data: Record<string, unknown>): SafeNangoConnectSession {
  return {
    token: String(data.token ?? ""),
    connectLink: typeof data.connect_link === "string" ? data.connect_link : null,
    expiresAt: String(data.expires_at ?? ""),
  };
}

export async function createNangoConnectSession(input: {
  provider: IntegrationProvider;
  user: ServerUser;
  projectId?: string;
}) {
  const nango = createNangoClient();
  const mapping = getNangoProviderMapping(input.provider);
  const session = await nango.createConnectSession({
    allowed_integrations: [mapping.nangoIntegrationId],
    tags: {
      end_user_id: input.user.id,
      end_user_email: input.user.email ?? "",
      scenebook_provider: input.provider,
      ...(input.projectId ? { scenebook_project_id: input.projectId } : {}),
    },
  });

  return {
    nangoIntegrationId: mapping.nangoIntegrationId,
    connectSession: safeSession(session.data as Record<string, unknown>),
  };
}

export function verifyNangoWebhookRequest(body: string, headers: Headers) {
  const nango = createNangoClient();
  const headerRecord = Object.fromEntries(headers.entries());

  return nango.verifyIncomingWebhookRequest(body, headerRecord);
}
