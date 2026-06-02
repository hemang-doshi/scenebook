import { NextResponse } from "next/server";

import {
  markIntegrationConnected,
  markIntegrationFailed,
  recordIntegrationEvent,
  revokeIntegrationConnection,
} from "@/lib/integrations/connections/store";
import { getIntegrationProvider } from "@/lib/integrations/connections/registry";
import type { IntegrationProvider } from "@/lib/integrations/connections/types";
import { isNangoConfigured } from "@/lib/integrations/nango/config";
import { verifyNangoWebhookRequest } from "@/lib/integrations/nango/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type NangoWebhookPayload = {
  type?: string;
  operation?: string;
  connectionId?: string;
  connection_id?: string;
  providerConfigKey?: string;
  provider_config_key?: string;
  authMode?: string;
  success?: boolean;
  error?: unknown;
  tags?: Record<string, unknown>;
  endUser?: {
    id?: string;
    email?: string;
  };
  end_user?: {
    id?: string;
    email?: string;
  };
};

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function providerFromPayload(payload: NangoWebhookPayload): IntegrationProvider | null {
  const provider = stringValue(payload.tags?.scenebook_provider) as IntegrationProvider | null;

  if (provider && getIntegrationProvider(provider)) {
    return provider;
  }

  return null;
}

function ownerFromPayload(payload: NangoWebhookPayload) {
  return stringValue(payload.tags?.end_user_id)
    ?? stringValue(payload.endUser?.id)
    ?? stringValue(payload.end_user?.id);
}

function eventType(payload: NangoWebhookPayload) {
  return payload.type ?? payload.operation ?? "nango_webhook_received";
}

function statusForPayload(payload: NangoWebhookPayload) {
  if (payload.success === false || payload.error) {
    return "failed";
  }

  const type = eventType(payload).toLowerCase();

  if (type.includes("delete") || type.includes("revoke")) {
    return "revoked";
  }

  if (type.includes("connect") || type.includes("auth")) {
    return "connected";
  }

  return "received";
}

async function updateConnectionFromWebhook(input: {
  payload: NangoWebhookPayload;
  ownerId: string;
  provider: IntegrationProvider;
  projectId?: string;
  supabase: ReturnType<typeof createSupabaseAdminClient>;
}) {
  const status = statusForPayload(input.payload);
  const connectionId = stringValue(input.payload.connectionId) ?? stringValue(input.payload.connection_id);
  const nangoIntegrationId =
    stringValue(input.payload.providerConfigKey) ?? stringValue(input.payload.provider_config_key);
  const metadata = {
    nangoIntegrationId: nangoIntegrationId ?? "",
    lastSyncedAt: null,
  };

  if (status === "connected" && connectionId) {
    return markIntegrationConnected({
      supabase: input.supabase as never,
      ownerId: input.ownerId,
      projectId: input.projectId,
      provider: input.provider,
      connectionId,
      metadata,
    });
  }

  if (status === "failed") {
    return markIntegrationFailed({
      supabase: input.supabase as never,
      ownerId: input.ownerId,
      projectId: input.projectId,
      provider: input.provider,
      metadata,
    });
  }

  if (status === "revoked") {
    return revokeIntegrationConnection({
      supabase: input.supabase as never,
      ownerId: input.ownerId,
      projectId: input.projectId,
      provider: input.provider,
      metadata,
    });
  }

  return null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!isNangoConfigured()) {
    return NextResponse.json({ error: "Nango webhook verification is not configured." }, { status: 503 });
  }

  if (!verifyNangoWebhookRequest(rawBody, request.headers)) {
    return NextResponse.json({ error: "Invalid Nango webhook signature." }, { status: 401 });
  }

  let payload: NangoWebhookPayload;

  try {
    payload = JSON.parse(rawBody) as NangoWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  const provider = providerFromPayload(payload);
  const ownerId = ownerFromPayload(payload);

  if (!provider || !ownerId) {
    return NextResponse.json({ accepted: true, recorded: false });
  }

  const projectId = stringValue(payload.tags?.scenebook_project_id) ?? undefined;
  const supabase = createSupabaseAdminClient();
  const connection = await updateConnectionFromWebhook({
    payload,
    ownerId,
    provider,
    projectId,
    supabase,
  });

  await recordIntegrationEvent({
    supabase: supabase as never,
    ownerId,
    projectId,
    integrationConnectionId: connection?.id,
    provider,
    eventType: eventType(payload),
    status: statusForPayload(payload),
    metadata: {
      connectionId: stringValue(payload.connectionId) ?? stringValue(payload.connection_id) ?? "",
      providerConfigKey: stringValue(payload.providerConfigKey) ?? stringValue(payload.provider_config_key) ?? "",
    },
  });

  return NextResponse.json({ accepted: true, recorded: true });
}
