import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    // const requiredRoles = this.reflector.get<string[]>(
    //   'roles',
    //   context.getHandler(),
    // );
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(), // اول متد رو چک کن
      context.getClass(), // اگه نبود، کلاس رو چک کن
    ]);
    console.log('1');
    if (!requiredRoles) {
      return true;
    }
    console.log('2');

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }
    console.log('3');

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException();
    }
    return true;
  }
}
