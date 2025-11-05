import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo(): {
    name: string;
    version: string;
    description: string;
  } {
    return {
      name: 'Product Service',
      version: '1.0.0',
      description: 'Product and Menu Management Service for Restaurant POS System',
    };
  }
}
