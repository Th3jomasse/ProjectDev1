import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo(): {
    name: string;
    version: string;
    description: string;
    documentation: string;
  } {
    return {
      name: 'Restaurant POS System API Gateway',
      version: '1.0.0',
      description:
        'Single entry point for all microservices in the Restaurant POS System',
      documentation: '/api/docs',
    };
  }
}
