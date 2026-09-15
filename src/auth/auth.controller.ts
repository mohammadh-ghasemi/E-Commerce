import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { LocalAuthGuard } from './guards/local-auth.guard.js';
import { AuthService } from './auth.service.js';
import type { Response } from 'express';
import { RefreshTokenGuard } from './guards/refresh-token.guard.js';
import { CreateUserDto } from '../users/dto/create-user.dto.js';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(
    @Body() body: CreateUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token } = await this.authService.signup(
      body.email,
      body.password,
    );

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      // secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh',
    });

    return { access_token };
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  async login(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    const { access_token, refresh_token } = await this.authService.login(
      req.user,
    );

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      // secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh',
    });

    return { access_token };
  }

  @Get('/refresh')
  @UseGuards(RefreshTokenGuard)
  refreshToken(@Request() req: any) {
    return this.authService.refresh(req.user);
  }
}
