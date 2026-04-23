export async function healthRoutes(app) {
    app.get("/health", async () => ({
        status: "işlək",
        timestamp: new Date().toISOString()
    }));
}
