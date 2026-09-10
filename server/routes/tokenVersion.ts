// R3-02: refresh-token revocation via a tokenVersion embedded in the refresh
// JWT. Current version per user lives in-memory (acceptable this round —
// single-process prod). Bumps happen on logout, admin password reset and OTP
// reset-password. No schema/migration change.
const tokenVersions = new Map<string, number>();

export const getTokenVersion = (userId: string): number => tokenVersions.get(userId) ?? 0;
export const bumpTokenVersion = (userId: string): void => {
  tokenVersions.set(userId, getTokenVersion(userId) + 1);
};
