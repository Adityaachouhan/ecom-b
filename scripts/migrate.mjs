/**
 * Cross-platform DB migration runner.
 *
 * Usage:
 *   node scripts/migrate.mjs              # apply pending migrations (deploy)
 *   node scripts/migrate.mjs status       # show migration status
 *   node scripts/migrate.mjs reset        # wipe DB, re-apply migrations, seed
 *   node scripts/migrate.mjs resolve      # mark init migration applied (existing db push DBs)
 *
 * Env: loads .env.<NODE_ENV> then .env (same as the API).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const action = process.argv[2] ?? "deploy";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const nodeEnv = process.env.NODE_ENV || "development";
loadEnvFile(resolve(root, `.env.${nodeEnv}`));
loadEnvFile(resolve(root, ".env"));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Set it in .env or .env.development");
  process.exit(1);
}

function run(command, args, { inherit = true } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: inherit ? "inherit" : "pipe",
    shell: true,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  return result;
}

const INIT_MIGRATION = "20260731152003_init";

switch (action) {
  case "deploy":
  case "up":
    console.log("Applying pending migrations…");
    run("npx", ["prisma", "migrate", "deploy"]);
    console.log("Done.");
    break;

  case "status":
    run("npx", ["prisma", "migrate", "status"]);
    break;

  case "dev":
    // Create + apply a new migration from schema changes (interactive name via --name)
    {
      const name = process.argv[3];
      const args = ["prisma", "migrate", "dev"];
      if (name) args.push("--name", name);
      run("npx", args);
    }
    break;

  case "reset":
    console.log("Resetting database (migrations + seed)…");
    run("npx", ["prisma", "migrate", "reset", "--force"]);
    break;

  case "resolve":
    // For DBs that were created with `prisma db push` — baseline the init migration
    console.log(`Marking ${INIT_MIGRATION} as already applied…`);
    run("npx", ["prisma", "migrate", "resolve", "--applied", INIT_MIGRATION]);
    console.log("Baseline set. Future schema changes can use migrate.");
    break;

  default:
    console.error(`Unknown action: ${action}`);
    console.error(
      "Usage: node scripts/migrate.mjs [deploy|status|dev|reset|resolve] [name]"
    );
    process.exit(1);
}
