export type InstagramOAuthReason =
  | "api_access_blocked"
  | "redirect_mismatch"
  | "missing_code"
  | "invalid_state"
  | "account_ineligible"
  | "meta_credentials_missing"
  | "unknown";

export type InstagramOAuthNotice = {
  code: InstagramOAuthReason;
  title: string;
  description: string;
  action: string;
};

function isLocalHost(host: string) {
  return host.includes("localhost") || host.includes("127.0.0.1");
}

export function buildInstagramRequestOrigin(headers: Headers) {
  const host = headers.get("x-forwarded-host") || headers.get("host") || "localhost:3000";
  const forwardedProto = headers.get("x-forwarded-proto") || "http";
  const protocol = isLocalHost(host) ? forwardedProto : "https";
  return `${protocol}://${host}`;
}

export function normalizeInstagramOAuthError(message: string | null | undefined): InstagramOAuthNotice {
  const normalized = message?.toLowerCase() ?? "";

  if (normalized.includes("api access blocked")) {
    return {
      code: "api_access_blocked",
      title: "Meta access blocked",
      description: "Meta blocked this app or account from completing the Instagram connection flow.",
      action: "Confirm Meta app review is complete for the requested scopes and that the Instagram account meets API eligibility requirements.",
    };
  }

  if (normalized.includes("redirect uri") || normalized.includes("redirect mismatch")) {
    return {
      code: "redirect_mismatch",
      title: "Redirect mismatch",
      description: "The callback URL sent to Meta does not match the URL configured on the app.",
      action: "Check the current host, forwarded protocol, and the exact redirect URI configured in Meta.",
    };
  }

  if (normalized.includes("no authorization code")) {
    return {
      code: "missing_code",
      title: "Authorization missing",
      description: "Meta returned to SceneBook without an authorization code.",
      action: "Restart the connection flow and confirm the Meta consent screen completed successfully.",
    };
  }

  if (normalized.includes("invalid oauth state")) {
    return {
      code: "invalid_state",
      title: "State check failed",
      description: "The OAuth state parameter did not match the signed-in SceneBook session.",
      action: "Retry the connection in the same browser session and avoid switching accounts mid-flow.",
    };
  }

  if (normalized.includes("not fully configured")) {
    return {
      code: "meta_credentials_missing",
      title: "Meta configuration missing",
      description: "SceneBook is missing required Meta app credentials on the server.",
      action: "Set the Meta app ID and secret on the server before retrying the Instagram connection.",
    };
  }

  if (
    normalized.includes("app review")
    || normalized.includes("permission")
    || normalized.includes("eligible")
    || normalized.includes("professional account")
  ) {
    return {
      code: "account_ineligible",
      title: "Account or app not eligible",
      description: "The Instagram account or Meta app is missing a required capability for this connection flow.",
      action: "Confirm the account is a professional account and that the requested Meta permissions are approved.",
    };
  }

  return {
    code: "unknown",
    title: "Connection needs attention",
    description: message || "Instagram did not complete the connection flow.",
    action: "Retry the flow and inspect the Meta app configuration if the issue persists.",
  };
}

export function sanitizeInstagramApiError(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { message: "Unknown Instagram API error" };
  }

  const error = (payload as { error?: Record<string, unknown>; error_message?: unknown }).error;

  if (error && typeof error === "object") {
    return {
      message: typeof error.message === "string" ? error.message : null,
      code: typeof error.code === "number" ? error.code : null,
      type: typeof error.type === "string" ? error.type : null,
      fbtraceId: typeof error.fbtrace_id === "string" ? error.fbtrace_id : null,
    };
  }

  return {
    message: typeof (payload as { error_message?: unknown }).error_message === "string"
      ? (payload as { error_message: string }).error_message
      : "Unknown Instagram API error",
  };
}
