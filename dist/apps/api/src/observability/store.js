import os from "node:os";
const MAX_RESPONSE_SAMPLES = 2000;
const MAX_ERROR_EVENTS = 200;
export class ObservabilityStore {
    startedAtMs = Date.now();
    totalRequests = 0;
    totalErrors = 0;
    slowRequests = 0;
    responseTimesMs = [];
    errorEvents = [];
    recordRequest(durationMs, statusCode) {
        this.totalRequests += 1;
        if (statusCode >= 500) {
            this.totalErrors += 1;
        }
        if (durationMs >= 1000) {
            this.slowRequests += 1;
        }
        this.responseTimesMs.push(durationMs);
        if (this.responseTimesMs.length > MAX_RESPONSE_SAMPLES) {
            this.responseTimesMs.shift();
        }
    }
    recordError(event) {
        const finalEvent = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            timestamp: new Date().toISOString(),
            ...event
        };
        this.totalErrors += 1;
        this.errorEvents.unshift(finalEvent);
        if (this.errorEvents.length > MAX_ERROR_EVENTS) {
            this.errorEvents.pop();
        }
    }
    listErrors(limit = 30) {
        return this.errorEvents.slice(0, Math.max(1, Math.min(limit, MAX_ERROR_EVENTS)));
    }
    snapshot() {
        const uptimeSeconds = process.uptime();
        const sorted = [...this.responseTimesMs].sort((a, b) => a - b);
        const avg = this.responseTimesMs.length
            ? this.responseTimesMs.reduce((sum, ms) => sum + ms, 0) / this.responseTimesMs.length
            : 0;
        const p95Index = sorted.length ? Math.floor(sorted.length * 0.95) - 1 : 0;
        const p95 = sorted.length ? sorted[Math.max(0, p95Index)] : 0;
        const max = sorted.length ? sorted[sorted.length - 1] : 0;
        const usage = process.cpuUsage();
        const cpuCores = Math.max(1, os.cpus().length);
        const elapsedCpuMicros = usage.user + usage.system;
        const totalCapacityMicros = Math.max(1, uptimeSeconds * 1_000_000 * cpuCores);
        const cpuPercentEstimate = (elapsedCpuMicros / totalCapacityMicros) * 100;
        const memory = process.memoryUsage();
        const elapsedMinutes = Math.max(1 / 60, (Date.now() - this.startedAtMs) / 60_000);
        const rpm = this.totalRequests / elapsedMinutes;
        return {
            generatedAt: new Date().toISOString(),
            uptimeSeconds,
            totalRequests: this.totalRequests,
            totalErrors: this.totalErrors,
            slowRequests: this.slowRequests,
            averageResponseMs: Number(avg.toFixed(2)),
            p95ResponseMs: Number(p95.toFixed(2)),
            maxResponseMs: Number(max.toFixed(2)),
            requestsPerMinuteEstimate: Number(rpm.toFixed(2)),
            process: {
                pid: process.pid,
                nodeVersion: process.version,
                cpuPercentEstimate: Number(cpuPercentEstimate.toFixed(2)),
                memory: {
                    rssBytes: memory.rss,
                    heapUsedBytes: memory.heapUsed,
                    heapTotalBytes: memory.heapTotal,
                    externalBytes: memory.external
                }
            },
            system: {
                loadAverage: os.loadavg(),
                cpuCores,
                freeMemoryBytes: os.freemem(),
                totalMemoryBytes: os.totalmem()
            }
        };
    }
}
