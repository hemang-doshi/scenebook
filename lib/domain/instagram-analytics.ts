const PRE_CONVERSION_MESSAGE =
  "This post was created prior to converting to a creator/professional account, so detailed metrics are unavailable.";

export function isInstagramPreConversionError(message: string | null | undefined) {
  const normalized = message?.toLowerCase() ?? "";

  return (
    normalized.includes("before the most recent time") ||
    normalized.includes("converted to a business account") ||
    normalized.includes("converted to a creator account") ||
    normalized.includes("prior to converting to a creator/professional account")
  );
}

export function normalizeInstagramInsightError(message: string | null | undefined) {
  if (isInstagramPreConversionError(message)) {
    return PRE_CONVERSION_MESSAGE;
  }

  return message || "Unsupported metric or access restricted";
}

export function getInstagramInsightIssueLabel(message: string | null | undefined) {
  return isInstagramPreConversionError(message) ? "Pre-conversion post" : "Insights unavailable";
}
