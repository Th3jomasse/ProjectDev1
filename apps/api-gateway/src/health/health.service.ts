import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface ServiceHealth {
  status: string;
  url: string;
}

interface HealthCheckResponse {
  status: string;
  timestamp: string;
  uptime: number;
  services: { [key: string]: ServiceHealth };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async checkHealth(): Promise<HealthCheckResponse> {
    const services = await this.checkAllServices();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services,
    };
  }

  async checkReadiness(): Promise<{
    status: string;
    services: { [key: string]: { status: string } };
  }> {
    const services = await this.checkAllServices();

    // Check if all critical services are healthy
    const allHealthy = Object.values(services).every(
      (service) => service.status === 'healthy',
    );

    return {
      status: allHealthy ? 'ready' : 'not_ready',
      services: Object.entries(services).reduce(
        (acc, [key, value]) => {
          acc[key] = { status: value.status };
          return acc;
        },
        {} as { [key: string]: { status: string } },
      ),
    };
  }

  private async checkAllServices(): Promise<{ [key: string]: ServiceHealth }> {
    const authServicePort = this.configService.get<number>(
      'AUTH_SERVICE_PORT',
      3001,
    );

    const services: { [key: string]: ServiceHealth } = {};

    // Check Auth Service
    services['auth-service'] = await this.checkService(
      `http://localhost:${authServicePort}/auth/health`,
      'auth-service',
    );

    return services;
  }

  private async checkService(
    url: string,
    serviceName: string,
  ): Promise<ServiceHealth> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          timeout: 2000,
        }),
      );

      return {
        status: response.status === 200 ? 'healthy' : 'unhealthy',
        url,
      };
    } catch (error) {
      this.logger.warn(`Service ${serviceName} health check failed: ${url}`);
      return {
        status: 'unhealthy',
        url,
      };
    }
  }
}
