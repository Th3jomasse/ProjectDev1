import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

interface HealthCheckResponse {
  status: string;
  timestamp: string;
  uptime: number;
  services: {
    [key: string]: {
      status: string;
      url: string;
    };
  };
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check API Gateway health status' })
  @ApiResponse({
    status: 200,
    description: 'Health check successful',
  })
  async checkHealth(): Promise<HealthCheckResponse> {
    return this.healthService.checkHealth();
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Liveness probe for Kubernetes' })
  @ApiResponse({
    status: 200,
    description: 'Service is alive',
  })
  checkLiveness(): { status: string } {
    return { status: 'alive' };
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Readiness probe for Kubernetes' })
  @ApiResponse({
    status: 200,
    description: 'Service is ready',
  })
  async checkReadiness(): Promise<{
    status: string;
    services: { [key: string]: { status: string } };
  }> {
    return this.healthService.checkReadiness();
  }
}
