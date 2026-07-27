import { readFileSync } from "node:fs";

export function readSecretValue(environment, name) {
  const direct = environment[name];
  const filePath = environment[`${name}_FILE`];
  if (direct && filePath) throw new Error(`${name} and ${name}_FILE must not both be set.`);
  if (direct) return direct;
  if (!filePath) throw new Error(`${name} or ${name}_FILE is required.`);
  const value = readFileSync(filePath, "utf8").replace(/\r?\n$/, "");
  if (!value) throw new Error(`${name}_FILE is empty.`);
  return value;
}

export function parsePostgresConnection(connectionString) {
  const url = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Only PostgreSQL connection URLs are supported.");
  }
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!url.hostname || !database || !url.username) {
    throw new Error("PostgreSQL URL must include host, user, and database.");
  }
  const pgEnvironment = {
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGDATABASE: database,
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
  };
  const sslMode = url.searchParams.get("sslmode");
  if (sslMode) pgEnvironment.PGSSLMODE = sslMode;
  return {
    database,
    host: url.hostname,
    user: pgEnvironment.PGUSER,
    pgEnvironment,
  };
}

export function sanitizeDatabaseName(database) {
  return database.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}
