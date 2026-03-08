import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "shashclaw-default",
  cookieSecret: process.env.JWT_SECRET ?? "dev-secret-do-not-use-in-production",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  anthropicKey: process.env.ANTHROPIC_KEY ?? "",
  ownerEmail: process.env.OWNER_EMAIL ?? "",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Production readiness flags
  singleUserMode: process.env.SINGLE_USER_MODE === 'true' || process.env.NODE_ENV !== 'production',
  killSwitchEnabled: process.env.KILL_SWITCH_ENABLED === 'true',
  ownerId: process.env.OWNER_ID,
};

console.log("[ENV DEBUG] DATABASE_URL loaded:", ENV.databaseUrl ? "YES" : "NO");
console.log("[ENV DEBUG] DATABASE_URL length:", ENV.databaseUrl.length);
console.log("[ENV DEBUG] JWT_SECRET loaded:", ENV.cookieSecret ? "YES" : "NO");

if (ENV.isProduction && ENV.cookieSecret === "dev-secret-do-not-use-in-production") {
  console.warn("WARNING: Using default JWT_SECRET in production! This is insecure.");
}
