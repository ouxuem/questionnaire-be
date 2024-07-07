import { Controller, Body, Param, HttpStatus } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiResponse, ApiTags, Method, UniDefine, User } from 'uni-nest';
import { ApiExceptionType } from '../../typing/api_exception.type';
import { ErrorRes } from '../../decorators/error_response.decorator';
import { type_jwt_user_data } from '../../typing/jwt_user_data_type';

@ApiTags('用户')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UniDefine({
    summary: '创建用户',
    description: '创建用户',
    method: Method.Post,
    isPublic: true,
    path: '/register',
    body: {
      type: CreateUserDto
    }
  })
  @ErrorRes(HttpStatus.INTERNAL_SERVER_ERROR, '创建用户失败')
  @ErrorRes(HttpStatus.CONFLICT, '用户名已存在')
  async create_user(@Body() createUserDto: CreateUserDto) {
    await this.userService.create(createUserDto);
    return '注册成功';
  }

  @UniDefine({
    summary: '查询单个用户信息',
    description: '根据token获取用户信息',
    method: Method.Get,
    path: '/info'
  })
  get_user_info(@User() user: type_jwt_user_data) {
    const removeIatExp = ({ iat, exp, ...rest }: type_jwt_user_data) => rest;
    return removeIatExp(user);
  }

  @UniDefine({
    summary: '更新用户',
    method: Method.Patch,
    path: '/:id',
    body: {
      // type: UpdateUserDto
    }
  })
  // update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
  //   return this.userService.update(+id, updateUserDto);
  // }
  @UniDefine({
    summary: '删除用户',
    method: Method.Delete,
    path: '/:id'
  })
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
