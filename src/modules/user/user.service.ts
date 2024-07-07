import { Injectable, Inject, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { MyLogger } from '../../my_logger';
import { WINSTON_LOGGER_TOKEN } from '../../winston/winston.module';
import { PrismaService } from '../db/prisma.service';
@Injectable()
export class UserService {
  @Inject(PrismaService)
  private prisma: PrismaService;

  @Inject(WINSTON_LOGGER_TOKEN)
  private logger: MyLogger;
  async create(data: Prisma.UserCreateInput) {
    const { username, password, nickname } = data;
    try {
      const hashed_password = await argon2.hash(password);
      await this.prisma.user.create({
        data: {
          username,
          password: hashed_password,
          nickname
        }
      });
      this.logger.log(`创建${username}用户成功`, 'UserService');
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          this.logger.error(`${username}用户已存在`, 'UserService');
          throw new ConflictException('用户名已存在');
        }
      }
      this.logger.error(error, '创建用户失败');
      throw new InternalServerErrorException('创建用户失败');
    }
  }

  async get_user_info(id: number) {}
  findAll() {
    return `This action returns all user`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  // update(id: number, updateUserDto: UpdateUserDto) {
  //   console.log(updateUserDto);
  //   return `This action updates a #${id} user`;
  // }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
