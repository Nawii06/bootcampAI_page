import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "vite";

interface FakeDataSet {
  dataSetId: string;
  businessYears: unknown[];
  courses: unknown[];
  programs: unknown[];
  companies: unknown[];
  performanceResults: unknown[];
  content: Array<{ contentType: string }>;
}

function json(res: import("node:http").ServerResponse, dataSetId: string, body: unknown) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Fake-Data-Set", dataSetId);
  res.end(JSON.stringify(body));
}

export function fakeDataPreviewPlugin(dataSetId?: string): Plugin {
  return {
    name: "bootcamp-fake-data-preview",
    apply: "serve",
    configureServer(server) {
      if (!dataSetId) return;
      if (process.env.NODE_ENV === "production") {
        throw new Error("Fake data preview cannot run in production.");
      }
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        try {
          const fixturePath = path.resolve(
            import.meta.dirname,
            "..",
            "fake-data",
            `${dataSetId}.json`,
          );
          const fixture = JSON.parse(
            await readFile(fixturePath, "utf8"),
          ) as FakeDataSet;
          const url = new URL(req.url, "http://127.0.0.1");
          if (url.pathname === "/api/v1/reference/business-years") {
            return json(res, fixture.dataSetId, { data: fixture.businessYears });
          }
          if (url.pathname === "/api/v1/courses") {
            return json(res, fixture.dataSetId, {
              data: fixture.courses,
              meta: {
                page: 1,
                pageSize: 100,
                total: fixture.courses.length,
              },
            });
          }
          if (url.pathname === "/api/v1/programs") {
            return json(res, fixture.dataSetId, { data: fixture.programs });
          }
          if (url.pathname === "/api/v1/public/companies") {
            return json(res, fixture.dataSetId, { data: fixture.companies });
          }
          if (url.pathname === "/api/v1/public/performance-results") {
            return json(res, fixture.dataSetId, {
              data: fixture.performanceResults,
            });
          }
          if (url.pathname === "/api/v1/public/content") {
            const contentType = url.searchParams.get("contentType");
            const data = fixture.content.filter(
              (item) => item.contentType === contentType,
            );
            return json(res, fixture.dataSetId, {
              data,
              meta: { page: 1, pageSize: 100, total: data.length },
            });
          }
          return next();
        } catch (error) {
          server.config.logger.error(
            `Failed to load fake data set ${dataSetId}: ${String(error)}`,
          );
          res.statusCode = 503;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(
            JSON.stringify({
              error: {
                code: "FAKE_DATA_SET_UNAVAILABLE",
                message: `Fake data set ${dataSetId} is unavailable.`,
              },
            }),
          );
        }
      });
    },
  };
}
