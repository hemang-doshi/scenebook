import { NextResponse } from "next/server";

import { AuthRequiredError, requireServerUser } from "@/lib/auth/server-user";
import { loadAccountContext } from "@/lib/auth/account-context";
import { ProjectOwnershipError } from "@/lib/auth/ownership";
import { getIntegrationProvider } from "@/lib/integrations/connections/registry";
import {
  markIntegrationPending,
  recordIntegrationEvent,
} from "@/lib/integrations/connections/store";
import type { IntegrationProvider } from "@/lib/integrations/connections/types";
import { createNangoConnectSession } from "@/lib/integrations/nango/client";
import { getNangoConfig } from "@/lib/integrations/nango/config";
import { NangoConfigurationError, NangoProviderConfigurationError } from "@/lib/integrations/nango/errors";
import { getNangoProviderMapping } from "@/lib/integrations/nango/provider-map";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

function jsonError(error: unknown) {
  if (error instanceof AuthRequiredError || error instanceof ProjectOwnershipError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof NangoConfigurationError || error instanceof NangoProviderConfigurationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json({ error: "Unable to create integration connect session." }, { status: 500 });
}

async function readBody(request: Request) {
  try {
    return (await request.json()) as { projectId?: unknown };
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
    const { connectSession } = await createNangoConnectSession({ provider, user, projectId });
    const connection = await markIntegrationPending({
      supabase: supabase as never,
      ownerId: user.id,
      projectId,
      provider,
      scopes: mapping.defaultScopes,
      metadata: {
        nangoIntegrationId: mapping.nangoIntegrationId,
        connectedVia: "settings",
      },
    });

    await recordIntegrationEvent({
      supabase: supabase as never,
      ownerId: user.id,
      projectId,
      integrationConnectionId: connection.id,
      provider,
      eventType: "connect_session_created",
      status: "pending",
      metadata: {
        nangoIntegrationId: mapping.nangoIntegrationId,
        expiresAt: connectSession.expiresAt,
      },
    });

    return NextResponse.json({
      provider,
      status: connection.status,
      connectSession,
      nango: {
        apiUrl: getNangoConfig().host,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
