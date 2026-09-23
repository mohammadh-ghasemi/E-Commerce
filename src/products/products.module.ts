import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity.js';
import { PassportModule } from '@nestjs/passport';
import { Category } from '../categories/entities/category.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category]),
    PassportModule.register({}),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
