import { NextResponse } from "next/server";

import { loadAccountContext } from "@/lib/auth/account-context";
import { ProjectOwnershipError } from "@/lib/auth/ownership";
import { AuthRequiredError, requireServerUser } from "@/lib/auth/server-user";
import { getIntegrationProvider } from "@/lib/integrations/connections/registry";
import {
  listIntegrationConnections,
  recordIntegrationEvent,
  revokeIntegrationConnection,
} from "@/lib/integrations/connections/store";
import type { IntegrationProvider } from "@/lib/integrations/connections/types";
import { revokeNangoConnection } from "@/lib/integrations/nango/client";
import { NangoProviderConfigurationError } from "@/lib/integrations/nango/errors";
import { getNangoProviderMapping } from "@/lib/integrations/nango/provider-map";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

async function readBody(request: Request) {
  try {
    return (await request.json()) as { projectId?: unknown };
  } catch {
    return {};
  }
}

function jsonError(error: unknown) {
  if (error instanceof AuthRequiredError || error instanceof ProjectOwnershipError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof NangoProviderConfigurationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json({ error: "Unable to disconnect integration." }, { status: 500 });
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

    const [existingConnection] = await listIntegrationConnections({
      supabase: supabase as never,
      ownerId: user.id,
      projectId,
      provider,
    });

    if (!existingConnection) {
      return NextResponse.json({ provider, status: "not_connected" });
    }

    const mapping = getNangoProviderMapping(provider);

    if (existingConnection.connectionId) {
      await revokeNangoConnection({
        nangoIntegrationId: mapping.nangoIntegrationId,
        connectionId: existingConnection.connectionId,
      });
    }

    const adminSupabase = createSupabaseAdminClient();
    const connection = await revokeIntegrationConnection({
      supabase: adminSupabase as never,
      ownerId: user.id,
      projectId,
      provider,
      metadata: {
        nangoIntegrationId: mapping.nangoIntegrationId,
        revokedVia: "settings",
      },
    });

    await recordIntegrationEvent({
      supabase: adminSupabase as never,
      ownerId: user.id,
      projectId,
      integrationConnectionId: connection.id,
      provider,
      eventType: "connection_revoked",
      status: "revoked",
      metadata: {
        nangoIntegrationId: mapping.nangoIntegrationId,
        connectionId: existingConnection.connectionId ?? "",
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
