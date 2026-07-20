import { logger } from "../src/lib/logging/logger";

logger.info(
  {
    event: "jobs.worker_idle",
    phase: 0,
  },
  "Faz 0 worker altyapısı hazır; işleyici gerektiren domain işi henüz yok.",
);
