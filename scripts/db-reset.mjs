import { spawnSync } from "node:child_process";
import process from "node:process";

if (process.env.NODE_ENV === "production") {
  throw new Error("db:reset is disabled when NODE_ENV=production.");
}

if (process.env.CONFIRM_DB_RESET !== "development-only") {
  throw new Error(
    "Refusing to reset the database. Set CONFIRM_DB_RESET=development-only explicitly.",
  );
}

const composeArgs = ["compose", "--env-file", ".env"];
for (const args of [
  [...composeArgs, "down", "--volumes"],
  [...composeArgs, "up", "-d", "--wait", "postgres"],
]) {
  const result = spawnSync("docker", args, { stdio: "inherit", shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

for (const args of [
  ["--filter", "@workspace/db", "migrate"],
  ["--filter", "@workspace/db", "seed"],
  ["--filter", "@workspace/db", "verify"],
]) {
  const result = spawnSync("pnpm", args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

