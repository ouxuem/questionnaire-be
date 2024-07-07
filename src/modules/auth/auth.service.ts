import { BadRequestException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthDto } from './dto/auth.dto';
import { PrismaService } from '../db/prisma.service';
import { WINSTON_LOGGER_TOKEN } from '../../winston/winston.module';
import { MyLogger } from '../../my_logger';
import * as argon2 from 'argon2';
import { type_jwt_user_data } from '../../typing/jwt_user_data_type';
@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  @Inject(PrismaService)
  private prisma: PrismaService;

  @Inject(WINSTON_LOGGER_TOKEN)
  private logger: MyLogger;

  @Inject(ConfigService)
  private configService: ConfigService;

  private generate_access_token(payload: type_jwt_user_data): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('ACCESS_TOKEN_EXPIRES')
    });
  }

  private generate_refresh_token(payload: type_jwt_user_data): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRES')
    });
  }

  async user_login(data: AuthDto) {
    const { username, password, remember } = data;
    const user = await this.prisma.user.findUnique({
      where: { username }
    });
    if (!user) {
      this.logger.error(`用户不存在: ${username}`, 'AuthService');
      throw new BadRequestException('用户名或密码错误');
    }
    const { id, nickname } = user;
    const is_password_valid = await argon2.verify(user.password, password);
    if (!is_password_valid) {
      this.logger.error(`用户输入密码错误: ${username}`, 'AuthService');
      throw new BadRequestException('用户名或密码错误');
    }
    try {
      const access_token = this.generate_access_token({ id, username, nickname });
      if (remember) {
        const refresh_token = this.generate_refresh_token({ id, username, nickname });
        return { access_token, refresh_token };
      } else {
        return { access_token };
      }
    } catch (error) {
      this.logger.error(`生成token失败: ${error}`, 'AuthService');
      throw new InternalServerErrorException('系统错误，请联系管理员');
    }
  }

  async refresh_token(token: string) {
    try {
      const data = this.jwtService.verify<type_jwt_user_data>(token, {
        secret: this.configService.get('JWT_SECRET')
      });
      const { id, username, nickname } = data;
      const access_token = this.generate_access_token({ id, username, nickname });
      return { access_token };
    } catch (e) {
      this.logger.error(`刷新token失败: ${e}`, 'AuthService');
      throw new BadRequestException('token 已失效，请重新登录');
    }
  }
}
