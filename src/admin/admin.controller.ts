import { Controller, Get } from '@nestjs/common';
import { MetricsService } from '../metrics/metrics.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly metrics: MetricsService) {}

  /**
   * GET /admin/metrics
   *
   * Returns per-minute request counters for the last ~2 hours.
   * Example response:
   * {
   *   "global": [
   *     { "minute": "2026-02-23T14:03", "count": 12 }
   *   ],
   *   "byEndpoint": {
   *     "/api/v1/users": [
   *       { "minute": "2026-02-23T14:03", "count": 5 }
   *     ]
   *   }
   * }
   */
  @Get('metrics')
  getMetrics() {
    return this.metrics.getMetrics();
  }
}
