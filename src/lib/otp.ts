// OTP UI gating helper: the Login page fetches GET /api/auth/otp/status
// (plain fetch, no auth header) → { enabled: boolean }. The UI must only
// enable the OTP reset flow when the payload explicitly says enabled=true.
// Any missing/non-ok payload, malformed body, or fetch failure resolves to
// enabled=false — fail-safe hide (prod-safe when no SMS provider is wired).
export function resolveOtpStatus(payload: unknown): { otpEnabled: boolean } {
  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    (payload as { enabled?: unknown }).enabled === true
  ) {
    return { otpEnabled: true };
  }
  return { otpEnabled: false };
}
