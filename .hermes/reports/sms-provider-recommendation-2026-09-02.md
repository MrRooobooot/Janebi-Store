# SMS Provider Recommendation: Kavenegar vs Ghasedak (for OTP wiring)

**Date**: 2026-09-02 · **Repo**: Janebi-Store · **Status**: Recommendation only — no code change made.

## Current state
`server/routes/auth.ts` already gates OTP delivery behind `env.SMS_API_KEY` / `env.SMS_PROVIDER`
(`smsProviderEnabled`), falls back to an `[SMS Simulator]` console log, and blocks
reset-by-OTP whenever OTP is disabled. Wiring a real provider is therefore a
single integration point: implement `sendOtp(phone, code)` behind the existing flag and set
`SMS_PROVIDER` + `SMS_API_KEY` in prod env.

## Comparison

| Dimension | Kavenegar | Ghasedak |
|---|---|---|
| Node SDK | Official `kavenegar` npm package (verified on GitHub), active, documented | Community `ghasedak` npm package (`ghasedakapi/ghasedak-node`); thin wrapper, works but less maintained |
| Dedicated OTP endpoint | Yes — `Verify.Lookup` (`/v1/verify/lookup`, templated OTP with token) — designed exactly for this | Yes — `verification/verify/simple` (v2) sends a templated verification code |
| Regulatory standing | Longest-standing licensed Iranian SMS aggregator; standard panel + dedicated OTP lines (e.g. `10004346`) | Licensed aggregator; newer, smaller ecosystem |
| Pricing | Per-SMS credit, tiered by line type; OTP lines cost slightly more than promo lines | Generally similar per-SMS credit model; often slightly cheaper promo lines |
| Reliability for OTP | Highest among Iranian providers; widely used for login OTP at scale | Adequate; fewer large-scale references |
| Deliverability | Strong across all Iranian operators (MCI, Irancell, Rightel) | Good, occasionally slower on MCI |
| Docs/ergonomics | Excellent Persian+English REST docs (`kavenegar.com/rest.html`) | Persian docs (`ghasedak.me/docs`), thinner examples |

## Recommendation
**Primary: Kavenegar** — the official Node SDK plus a purpose-built `Verify.Lookup`
OTP endpoint (template + token, no need to build message strings or manage OTP line
selection manually) is the lowest-risk fit for the existing `sendOtp` seam. Register
at panel.kavenegar.com, obtain an API key, set:

```
SMS_PROVIDER=kavenegar
SMS_API_KEY=<key>
```

**Fallback/secondary: Ghasedak** — worth wiring later as a failover adapter if
deliverability or credit issues arise; its v2 `verification/verify/simple` maps
directly onto the same `sendOtp(phone, code)` signature. This mirrors the existing
payment-gateway failover pattern (`PaymentFailoverRouter`): an `SmsFailoverRouter`
(Kavenegar primary → Ghasedak fallback) is the natural production hardening.

## Verification notes (grounded)
- Kavenegar official Node SDK confirmed via `github.com/kavenegar/kavenegar-node` README (fetch 2026-09-02): `npm install kavenegar`, `api.Send({ message, sender, receptor })`; REST docs at kavenegar.com/rest.html.
- Ghasedak Node SDK confirmed via `ghasedakapi/ghasedak-node` README: `npm install ghasedak`, `send({ message, receptor, linenumber })`.
- Both sites reachable (HTTP 200) from this machine, 2026-09-02.
- Exact current per-SMS pricing for both was **not** verified (pricing pages blocked from this environment); confirm on their panels before purchase.
