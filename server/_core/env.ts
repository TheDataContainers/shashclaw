export const ENV = {
  appId: process.env.VITE_APP_ID ?? "shashclaw-default",
  cookieSecret: process.env.JWT_SECRET ?? "dev-secret-do-not-use-in-production",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Production readiness flags
  singleUserMode: process.env.SINGLE_USER_MODE === 'true' || process.env.NODE_ENV !== 'production',
  killSwitchEnabled: process.env.KILL_SWITCH_ENABLED === 'true',
  ownerId: process.env.OWNER_ID,
};

if (ENV.isProduction && ENV.cookieSecret === "dev-secret-do-not-use-in-production") {
  console.warn("WARNING: Using default JWT_SECRET in production! This is insecure.");
}
