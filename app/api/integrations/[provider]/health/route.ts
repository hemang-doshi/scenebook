import { NextResponse } from "next/server";

import { AuthRequiredError, requireServerUser } from "@/lib/auth/server-user";
import { getIntegrationProvider } from "@/lib/integrations/connections/registry";
import {
  listIntegrationConnections,
  markIntegrationFailed,
  recordIntegrationEvent,
} from "@/lib/integrations/connections/store";
import type { IntegrationProvider } from "@/lib/integrations/connections/types";
import { verifyNangoConnectionOwnership } from "@/lib/integrations/nango/client";
import { NangoProviderConfigurationError } from "@/lib/integrations/nango/errors";
import { getNangoProviderMapping } from "@/lib/integrations/nango/provider-map";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

function jsonError(error: unknown) {
  if (error instanceof AuthRequiredError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof NangoProviderConfigurationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json({ error: "Unable to check integration health." }, { status: 500 });
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { provider: providerParam } = await context.params;
    const provider = providerParam as IntegrationProvider;

    if (!getIntegrationProvider(provider)) {
      return NextResponse.json({ error: "Unsupported integration provider." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const user = await requireServerUser({ supabase: supabase as never });
    const adminSupabase = createSupabaseAdminClient();
    const [storedConnection] = await listIntegrationConnections({
      supabase: supabase as never,
      ownerId: user.id,
      provider,
    });

    if (!storedConnection) {
      await recordIntegrationEvent({
        supabase: adminSupabase as never,
        ownerId: user.id,
        provider,
        eventType: "connection_health_checked",
        status: "not_connected",
        metadata: {},
      });

      return NextResponse.json({ provider, status: "not_connected" });
    }

    const mapping = getNangoProviderMapping(provider);
    let connection = storedConnection;

    if (storedConnection.status === "connected") {
      const verified = storedConnection.connectionId
        ? await verifyNangoConnectionOwnership({
          nangoIntegrationId: mapping.nangoIntegrationId,
          connectionId: storedConnection.connectionId,
          userId: user.id,
          provider,
          projectId: storedConnection.projectId ?? undefined,
        })
        : false;

      if (!verified) {
        connection = await markIntegrationFailed({
          supabase: adminSupabase as never,
          ownerId: user.id,
          provider,
          metadata: {
            nangoIntegrationId: mapping.nangoIntegrationId,
            failedVia: "health_check",
          },
        });
      }
    }

    await recordIntegrationEvent({
      supabase: adminSupabase as never,
      ownerId: user.id,
      integrationConnectionId: connection.id,
      provider,
      eventType: "connection_health_checked",
      status: connection.status,
      metadata: {
        nangoIntegrationId: mapping.nangoIntegrationId,
        connectionId: connection.connectionId ?? "",
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
