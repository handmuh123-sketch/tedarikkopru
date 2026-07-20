import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { format } from "prettier";

const document = {
  openapi: "3.1.0",
  info: {
    title: "TedarikKöprü API",
    version: "0.0.0",
    description: "Faz 0 sistem sağlık API sözleşmesi.",
  },
  servers: [{ url: "http://localhost:3000" }],
  paths: {
    "/api/health/live": {
      get: {
        operationId: "getLiveness",
        summary: "Uygulama sürecinin canlılığını döndürür",
        responses: {
          "200": {
            description: "Uygulama süreci canlı",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Liveness" },
              },
            },
          },
        },
      },
    },
    "/api/health/ready": {
      get: {
        operationId: "getReadiness",
        summary: "Uygulamanın veritabanı ile trafik almaya hazır olup olmadığını döndürür",
        responses: {
          "200": { description: "Uygulama hazır" },
          "503": { description: "Uygulama hazır değil; ayrıntılı provider hatası içermez" },
        },
      },
    },
  },
  components: {
    schemas: {
      Liveness: {
        type: "object",
        required: ["status", "service", "requestId", "timestamp"],
        properties: {
          status: { type: "string", const: "ok" },
          service: { type: "string" },
          requestId: { type: "string" },
          timestamp: { type: "string", format: "date-time" },
        },
      },
    },
  },
} as const;

const target = resolve(process.cwd(), "docs", "openapi.json");
const serializedDocument = await format(JSON.stringify(document), { parser: "json" });
await writeFile(target, serializedDocument, "utf8");
console.info(`OpenAPI belgesi üretildi: ${target}`);
