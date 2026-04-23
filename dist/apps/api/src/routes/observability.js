import { z } from "zod";
const errorQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(200).default(30)
});
export async function observabilityRoutes(app) {
    app.get("/observability/metrics", async () => {
        return app.observability.snapshot();
    });
    app.get("/observability/errors", async (request) => {
        const query = errorQuerySchema.parse(request.query);
        return {
            generatedAt: new Date().toISOString(),
            items: app.observability.listErrors(query.limit)
        };
    });
}
