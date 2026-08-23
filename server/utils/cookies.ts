import { Request, Response } from "express";

export function parseCookies(req: Request): Record<string, string> {
  const list: Record<string, string> = {};
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) return list;

  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const name = parts.shift()?.trim();
    if (name) {
      const value = decodeURI(parts.join("=").trim());
      list[name] = value;
    }
  });

  return list;
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string, isProduction: boolean = false): void {
  const sameSite = isProduction ? "Strict" : "Lax";
  const secure = isProduction ? "; Secure" : "";

  // 1 day for access token
  const accessMaxAge = 24 * 60 * 60;
  // 7 days for refresh token
  const refreshMaxAge = 7 * 24 * 60 * 60;

  res.append("Set-Cookie", `accessToken=${accessToken}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${accessMaxAge}${secure}`);
  res.append("Set-Cookie", `refreshToken=${refreshToken}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${refreshMaxAge}${secure}`);
}

export function clearAuthCookies(res: Response, isProduction: boolean = false): void {
  const sameSite = isProduction ? "Strict" : "Lax";
  const secure = isProduction ? "; Secure" : "";

  res.append("Set-Cookie", `accessToken=; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`);
  res.append("Set-Cookie", `refreshToken=; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`);
}
