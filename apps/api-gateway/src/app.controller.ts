import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Gateway')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get API Gateway information' })
  @ApiResponse({
    status: 200,
    description: 'API Gateway information retrieved successfully',
  })
  getInfo(): {
    name: string;
    version: string;
    description: string;
    documentation: string;
  } {
    return this.appService.getInfo();
  }
}
