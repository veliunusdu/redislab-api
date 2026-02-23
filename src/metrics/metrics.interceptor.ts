import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ path: string }>();
    const endpoint = req.path; // e.g. "/api/v1/users"

    // Fire-and-forget: never block the response for a metrics write.
    this.metrics.trackRequest(endpoint).catch((err) => {
      console.warn('[metrics] trackRequest failed', err);
    });

    return next.handle();
  }
}
