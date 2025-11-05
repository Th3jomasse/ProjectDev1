import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Service Info')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get Product Service information' })
  @ApiResponse({
    status: 200,
    description: 'Service information retrieved successfully',
  })
  getInfo(): {
    name: string;
    version: string;
    description: string;
  } {
    return this.appService.getInfo();
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  healthCheck(): { status: string; service: string } {
    return {
      status: 'healthy',
      service: 'product-service',
    };
  }
}
