import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';
import { Category } from './entities/category.entity.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [TypeOrmModule.forFeature([Category]), PassportModule.register([])],
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
