const SENSITIVE_KEY =
  /(password|secret|token|authorization|cookie|account|bank|resident|rrn|phone|email|address)/i;

export function maskAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(maskAuditValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
      key,
      SENSITIVE_KEY.test(key) ? "[MASKED]" : maskAuditValue(nested),
    ]),
  );
}

export function maskIpAddress(value: string | null) {
  if (!value) return null;
  if (value.includes(":")) {
    const segments = value.split(":");
    return `${segments.slice(0, 3).join(":")}::/48`;
  }
  const segments = value.split(".");
  return segments.length === 4
    ? `${segments[0]}.${segments[1]}.${segments[2]}.0/24`
    : "[MASKED]";
}

export function csvCell(value: unknown) {
  let text =
    value === null || value === undefined
      ? ""
      : typeof value === "string"
        ? value
        : JSON.stringify(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
