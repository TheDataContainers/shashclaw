import dotenv from "dotenv";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const envLocalPath = path.join(root, ".env.local");
const envPath = path.join(root, ".env");

const env = { ...process.env };

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = dotenv.parse(raw);
  Object.assign(env, parsed);
  if (!env.DATABASE_URL && /^DATABASE_URL=(.+)/m.test(raw)) {
    env.DATABASE_URL = raw.match(/^DATABASE_URL=(.+)/m)[1].trim().replace(/^["']|["']$/g, "");
  }
}

loadEnvFile(envLocalPath);
loadEnvFile(envPath);

let url = env.DATABASE_URL || env.NEON_DATABASE_URL;
if (!url || typeof url !== "string") {
  console.error("DATABASE_URL is required. Set it in .env.local (or NEON_DATABASE_URL)");
  process.exit(1);
}
const trimmed = url.split(/[\n\r]/)[0].trim().replace(/^\uFEFF/, "").replace(/^["']|["']$/g, "");
if (!/^postgres(ql)?:\/\//i.test(trimmed)) {
  console.error("DATABASE_URL must be a real Postgres URL starting with postgres:// or postgresql://.");
  console.error("Replace the placeholder in .env.local with your Neon connection string from https://console.neon.tech");
  process.exit(1);
}
env.DATABASE_URL = trimmed;
try {
  const u = new URL(trimmed);
  if (!u.hostname || u.hostname === "base" || (!u.hostname.includes(".") && u.hostname.length < 6)) {
    console.error("DATABASE_URL looks like a placeholder or typo (host: " + u.hostname + "). Use a real Neon URL from the Neon dashboard.");
    process.exit(1);
  }
} catch (e) {
  console.error("DATABASE_URL is not a valid URL:", e.message);
  process.exit(1);
}

execSync("pnpm exec drizzle-kit push", { stdio: "inherit", cwd: root, env });
