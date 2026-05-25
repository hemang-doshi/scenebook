export async function fetchJson<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    let message = payload?.error ?? "Request failed.";

    try {
      if (message.startsWith("[") && message.endsWith("]")) {
        const parsed = JSON.parse(message);
        if (Array.isArray(parsed) && parsed.length > 0 && "message" in parsed[0]) {
          message = (parsed as Array<{ path?: (string | number)[]; message: string }>)
            .map((issue) => {
              const field = issue.path?.join(".") || "field";
              return `${field}: ${issue.message}`;
            })
            .join(", ");
        }
      }
    } catch {
      // Ignored: keep original message
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
