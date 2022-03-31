import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { authConstants } from './constants';

@Injectable()
export class JwtAuthGuard extends AuthGuard(authConstants.jwtStrategy) {}
