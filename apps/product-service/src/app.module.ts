import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { ModifiersModule } from './modifiers/modifiers.module';
import { AllergensModule } from './allergens/allergens.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    PrismaModule,
    CategoriesModule,
    ProductsModule,
    ModifiersModule,
    AllergensModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
