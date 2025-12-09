import fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const config = z
  .object({
    PORT: z.coerce.number().default(4000),
    NODE_ENV: z.string().optional(),
    DATABASE_URL: z.string().optional(),
    TYPESENSE_API_KEY: z.string().default("dev-typesense-key"),
    TYPESENSE_HOST: z.string().default("http://localhost:8108"),
    AWS_REGION: z.string().optional(),
  })
  .parse(process.env);

const app = fastify({
  logger: {
    transport:
      config.NODE_ENV === "production"
        ? undefined
        : {
            target: "pino-pretty",
            options: { colorize: true, translateTime: "HH:MM:ss" },
          },
  },
});

await app.register(cors, {
  origin: true,
});
await app.register(sensible);

app.get("/health", async () => ({ status: "ok" }));

app.get("/v1/status", async () => ({
  service: "selj-api",
  search: {
    primary: "typesense",
    fallback: "postgres trigram",
  },
  ttl: "90d listings with expire job",
}));

app.get("/v1/listings/preview", async () => {
  return {
    items: [
      {
        id: "demo-1",
        title: "Volvo XC60 T8 R-Design",
        county: "Stockholm",
        created_at: new Date().toISOString(),
        status: "active",
      },
      {
        id: "demo-2",
        title: "Elcykel pendling 2023",
        county: "Skåne",
        created_at: new Date().toISOString(),
        status: "active",
      },
    ],
    cursor: null,
  };
});

const start = async () => {
  try {
    await app.listen({ port: config.PORT, host: "0.0.0.0" });
    app.log.info(`API up on ${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

await start();
