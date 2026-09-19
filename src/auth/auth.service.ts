import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity.js';
import { emit } from 'process';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { RedisService } from '../infrastructure/redis/redis.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('User not exist');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Password wrong');
    }

    return user;
  }

  async signup(email: string, password: string) {
    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const user = await this.usersService.create(email, password);

    return await this.login(user);
  }

  async login(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const jti = randomUUID();

    const refresh_token = this.jwtService.sign(
      { sub: user.id, jti },
      {
        secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
        expiresIn: '7d',
      },
    );

    await this.redisService.set(
      `refresh:${jti}`,
      String(user.id),
      7 * 24 * 60 * 60,
    );

    return { access_token, refresh_token };
  }

  async refresh(user: User, jti: string) {
    const key = `refresh:${jti}`;

    const storeUserId = await this.redisService.getDel(key);

    if (!storeUserId) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (storeUserId !== String(user.id)) {
      throw new UnauthorizedException();
    }

    // Access token
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    // Refresh token
    const newJti = randomUUID();
    const newRefreshToken = this.jwtService.sign(
      {
        sub: user.id,
        jti: newJti,
      },
      {
        secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
        expiresIn: '7d',
      },
    );

    // save in redis  =>  "refresh:uuid": user.id
    await this.redisService.set(
      `refresh:${newJti}`,
      String(user.id),
      7 * 24 * 60 * 60,
    );

    // return { access_token: this.jwtService.sign(payload) };
    return {
      access_token,
      refresh_token: newRefreshToken,
    };
  }

  async logout(jti: string) {
    await this.redisService.del(`refresh:${jti}`);
  }
}
