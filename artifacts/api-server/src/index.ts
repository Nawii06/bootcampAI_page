import { loadRuntimeSecrets } from "./config/secrets";

loadRuntimeSecrets();

const [{ default: app }, { pool }, { logger }, { env }] = await Promise.all([
  import("./app"),
  import("@workspace/db"),
  import("./lib/logger"),
  import("./config/env"),
]);

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "Server listening");
});

server.on("error", (error) => {
  logger.fatal({ err: error }, "HTTP server failed");
  process.exit(1);
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Graceful shutdown started");
  const forceExit = setTimeout(() => {
    logger.error("Graceful shutdown timed out");
    process.exit(1);
  }, 15_000);
  forceExit.unref();
  server.close(async (error) => {
    if (error) logger.error({ err: error }, "HTTP server close failed");
    await pool.end().catch((poolError: unknown) => {
      logger.error({ err: poolError }, "Database pool close failed");
    });
    clearTimeout(forceExit);
    process.exit(error ? 1 : 0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
