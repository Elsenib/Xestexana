import type { FastifyInstance } from "fastify";
import { z } from "zod";

const errorQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(30)
});

export async function observabilityRoutes(app: FastifyInstance) {
  app.get("/observability/metrics", {
    preHandler: [app.authenticate, app.authorize(["ADMIN"])]
  }, async (request) => {
    const { from, to } = request.query as { from?: string; to?: string };
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
        return app.observability.getMetricsByDateRange(fromDate, toDate);
      }
    }
    return app.observability.snapshot();
  });

  app.get("/observability/errors", {
    preHandler: [app.authenticate, app.authorize(["ADMIN"])]
  }, async (request) => {
    const query = errorQuerySchema.parse(request.query);
    return {
      generatedAt: new Date().toISOString(),
      items: app.observability.listErrors(query.limit)
    };
  });
}
