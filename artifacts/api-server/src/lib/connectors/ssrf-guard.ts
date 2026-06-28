// Shared SSRF guard — reused by any connector that accepts user-controlled URLs/hostnames.
// Mirrors and centralises the logic from webhook-connector.ts.

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "0.0.0.0",
  "metadata.google.internal",
  "169.254.169.254",  // AWS/Azure/GCP IMDS
  "fd00::ec2",        // AWS IPv6 IMDS
]);

export function isBlockedUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return true; // Unparseable = blocked
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return true;

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) return true;

  // Block numeric IPv4 private/loopback/link-local ranges
  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [, a, b] = ipv4.map(Number);
    if (
      a === 127 ||
      a === 0 ||
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    ) return true;
  }

  // Block IPv6 loopback and private ranges
  if (
    hostname === "::1" ||
    hostname.startsWith("fe80:") ||
    hostname.startsWith("fc") ||
    hostname.startsWith("fd")
  ) return true;

  return false;
}

export function validateExternalUrl(url: string | undefined, label: string): string | null {
  if (!url) return `${label} not configured`;
  if (isBlockedUrl(url)) {
    return `${label} targets a private, loopback, or reserved address — only external URLs are allowed`;
  }
  return null;
}
