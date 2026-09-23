import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity.js';
import { Brackets, Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { Category } from '../categories/entities/category.entity.js';
import { ProductQueryDto } from './dto/product-query.dto.js';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async create(createProductDto: CreateProductDto) {
    const category = await this.categoriesRepository.findOne({
      where: { id: createProductDto.categoryId, isActive: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const product = this.productRepository.create({
      name: createProductDto.name,
      description: createProductDto.description,
      price: createProductDto.price,
      stock: createProductDto.stock,
      category,
    });

    return this.productRepository.save(product);
  }

  async findAll(query: ProductQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.isActive = :isActive', {
        isActive: true,
      });

    if (search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('product.name ILIKE :search', {
            search: `%${search}%`,
          }).orWhere('product.description ILIKE :search', {
            search: `%${search}%`,
          });
        }),
      );
    }

    if (category) {
      queryBuilder.andWhere('category.slug = :category', {
        category,
      });
    }

    if (minPrice !== undefined) {
      queryBuilder.andWhere('product.price >= :minPrice', {
        minPrice,
      });
    }

    if (maxPrice !== undefined) {
      queryBuilder.andWhere('product.price <= :maxPrice', {
        maxPrice,
      });
    }

    queryBuilder.orderBy(`product.${sortBy}`, sortOrder);

    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [products, total] = await queryBuilder.getManyAndCount();

    return {
      data: products,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const product = await this.productRepository.findOne({
      where: { id, isActive: true },
      relations: { category: true },
    });

    if (!product) {
      throw new NotFoundException('Product no found');
    }

    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const product = await this.productRepository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const { categoryId, ...productData } = updateProductDto;

    Object.assign(product, productData);

    if (categoryId !== undefined) {
      const category = await this.categoriesRepository.findOne({
        where: { id: categoryId, isActive: true },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }

      product.category = category;
    }

    return this.productRepository.save(product);
  }

  async remove(id: number) {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    product.isActive = false;

    await this.productRepository.save(product);

    return {
      message: 'Product deactivated successfully',
    };
  }
}
