import { Body, Controller, Query } from '@nestjs/common';
import { ApiTags, Method, UniDefine } from 'uni-nest';
import { AuthService } from './auth.service';
import { AuthDto, AuthVo, RefreshTokenVo } from './dto/auth.dto';

@Controller('auth')
@ApiTags('授权')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UniDefine({
    method: Method.Post,
    summary: '授权接口',
    description: '登录并获取token',
    isPublic: true,
    response: {
      model: AuthVo
    },
    body: {
      type: AuthDto
    }
  })
  login(@Body() data: AuthDto) {
    return this.authService.user_login(data);
  }

  @UniDefine({
    method: Method.Get,
    summary: '刷新token接口',
    description: '获取新token',
    isPublic: true,
    response: {
      model: RefreshTokenVo
    },
    path: '/refresh',
    query: {
      name: 'refreshToken',
      type: String,
      description: '刷新 token',
      required: true,
      example: 'xxxxxxxx'
    }
  })
  refresh_token(@Query('refreshToken') refreshToken: string) {
    return this.authService.refresh_token(refreshToken);
  }
}
