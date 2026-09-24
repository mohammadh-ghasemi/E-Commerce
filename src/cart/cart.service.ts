import { Max } from 'class-validator';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cart } from './entities/cart.entity.js';
import { Repository } from 'typeorm';
import { CartItem } from './entities/cart-item.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private readonly cartsRepository: Repository<Cart>,

    @InjectRepository(CartItem)
    private readonly cartItemsRepository: Repository<CartItem>,

    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  private async getOrCreateCart(userId: number) {
    let cart = await this.cartsRepository.findOne({
      where: {
        user: {
          id: userId,
        },
      },
    });

    if (!cart) {
      cart = this.cartsRepository.create({
        user: {
          id: userId,
        },
      });
      cart = await this.cartsRepository.save(cart);
    }

    return cart;
  }

  async getCart(userId: number) {
    const cart = await this.getOrCreateCart(userId);

    const items = await this.cartItemsRepository.find({
      where: {
        cart: {
          id: cart.id,
        },
      },
      relations: {
        product: true,
      },
    });

    const data = items.map((item) => ({
      id: item.id,
      productId: item.product.id,
      name: item.product.name,
      unitPrice: item.product.price,
      quantity: item.quantity,
      subtotal: item.product.price * item.quantity,
    }));

    const total = data.reduce((sum, item) => sum + item.subtotal, 0);

    return {
      id: cart.id,
      items: data,
      total,
    };
  }

  async addItem(userId: number, addCartItemDto: AddCartItemDto) {
    const product = await this.productsRepository.findOne({
      where: {
        id: addCartItemDto.productId,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const cart = await this.getOrCreateCart(userId);

    const existingItem = await this.cartItemsRepository.findOne({
      where: {
        cart: {
          id: cart.id,
        },
        product: {
          id: product.id,
        },
      },
      relations: {
        product: true,
      },
    });

    const newQuantity = (existingItem?.quantity ?? 0) + addCartItemDto.quantity;

    if (newQuantity > product.stock) {
      throw new BadRequestException('Insufficient product stock');
    }

    if (existingItem) {
      existingItem.quantity = newQuantity;

      return this.cartItemsRepository.save(existingItem);
    }

    const cartItem = this.cartItemsRepository.create({
      cart,
      product,
      quantity: addCartItemDto.quantity,
    });

    return this.cartItemsRepository.save(cartItem);
  }

  async updateItem(
    userId: number,
    productId: number,
    updateCartItemDto: UpdateCartItemDto,
  ) {
    const cart = await this.getOrCreateCart(userId);

    const cartItem = await this.cartItemsRepository.findOne({
      where: {
        cart: {
          id: cart.id,
        },
        product: {
          id: productId,
        },
      },
      relations: {
        product: true,
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    if (!cartItem.product.isActive) {
      throw new BadRequestException('Product is no longer active');
    }

    if (updateCartItemDto.quantity > cartItem.product.stock) {
      throw new BadRequestException('Insufficient product stock');
    }

    cartItem.quantity = updateCartItemDto.quantity;

    return this.cartItemsRepository.save(cartItem);
  }

  async removeItem(userId: number, productId: number) {
    const cart = await this.getOrCreateCart(userId);

    const cartItem = await this.cartItemsRepository.findOne({
      where: {
        cart: {
          id: cart.id,
        },
        product: {
          id: productId,
        },
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartItemsRepository.remove(cartItem);

    return {
      message: 'Cart item removed successfully',
    };
  }

  async clearCart(userId: number) {
    const cart = await this.getOrCreateCart(userId);

    await this.cartItemsRepository.delete({
      cart: {
        id: cart.id,
      },
    });

    return {
      message: 'Cart cleared successfully',
    };
  }
}
