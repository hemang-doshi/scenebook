import { NextResponse } from "next/server";

import { loadAccountContext } from "@/lib/auth/account-context";
import { ProjectOwnershipError } from "@/lib/auth/ownership";
import { AuthRequiredError, requireServerUser } from "@/lib/auth/server-user";
import { getIntegrationProvider } from "@/lib/integrations/connections/registry";
import {
  markIntegrationConnected,
  recordIntegrationEvent,
} from "@/lib/integrations/connections/store";
import type { IntegrationProvider } from "@/lib/integrations/connections/types";
import { NangoProviderConfigurationError } from "@/lib/integrations/nango/errors";
import { getNangoProviderMapping } from "@/lib/integrations/nango/provider-map";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

type StatusBody = {
  connectionId?: unknown;
  projectId?: unknown;
  providerConfigKey?: unknown;
  scopes?: unknown;
  connectionLabel?: unknown;
  providerAccountHint?: unknown;
};

function jsonError(error: unknown) {
  if (error instanceof AuthRequiredError || error instanceof ProjectOwnershipError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof NangoProviderConfigurationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json({ error: "Unable to update integration connection status." }, { status: 500 });
}

async function readBody(request: Request): Promise<StatusBody> {
  try {
    return (await request.json()) as StatusBody;
  } catch {
    return {};
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { provider: providerParam } = await context.params;
    const provider = providerParam as IntegrationProvider;

    if (!getIntegrationProvider(provider)) {
      return NextResponse.json({ error: "Unsupported integration provider." }, { status: 400 });
    }

    const body = await readBody(request);
    const connectionId = typeof body.connectionId === "string" && body.connectionId.trim()
      ? body.connectionId
      : null;

    if (!connectionId) {
      return NextResponse.json({ error: "connectionId is required." }, { status: 400 });
    }

    const projectId = typeof body.projectId === "string" && body.projectId.trim()
      ? body.projectId
      : undefined;
    const supabase = await createSupabaseServerClient();
    const user = await requireServerUser({ supabase: supabase as never });

    if (projectId) {
      const account = await loadAccountContext({
        supabase: supabase as never,
        userId: user.id,
        projectId,
      });

      if (!account.permissions.canManageIntegrations) {
        return NextResponse.json({ error: "You cannot manage integrations for this project." }, { status: 403 });
      }
    }

    const mapping = getNangoProviderMapping(provider);
    const providerConfigKey = typeof body.providerConfigKey === "string" ? body.providerConfigKey : null;

    if (providerConfigKey && providerConfigKey !== mapping.nangoIntegrationId) {
      return NextResponse.json({ error: "Nango integration id does not match provider." }, { status: 400 });
    }

    const scopes = Array.isArray(body.scopes) ? body.scopes.filter((scope): scope is string => typeof scope === "string") : [];
    const connection = await markIntegrationConnected({
      supabase: supabase as never,
      ownerId: user.id,
      projectId,
      provider,
      connectionId,
      scopes,
      metadata: {
        nangoIntegrationId: mapping.nangoIntegrationId,
        connectedVia: "settings",
        connectionLabel: typeof body.connectionLabel === "string" ? body.connectionLabel : "",
        providerAccountHint: typeof body.providerAccountHint === "string" ? body.providerAccountHint : "",
        lastSyncedAt: null,
      },
    });

    await recordIntegrationEvent({
      supabase: supabase as never,
      ownerId: user.id,
      projectId,
      integrationConnectionId: connection.id,
      provider,
      eventType: "connection_connected",
      status: "connected",
      metadata: {
        nangoIntegrationId: mapping.nangoIntegrationId,
        connectionId,
      },
    });

    return NextResponse.json({
      provider,
      status: connection.status,
      connectionId: connection.connectionId,
    });
  } catch (error) {
    return jsonError(error);
  }
}
