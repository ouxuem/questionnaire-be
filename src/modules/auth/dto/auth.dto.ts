import { ApiProperty, ApiQuery } from 'uni-nest';
import { IsNotEmpty } from 'class-validator';

export class AuthDto {
  @ApiProperty({
    title: '用户名',
    example: '123456a',
    required: true
  })
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string;

  @ApiProperty({
    title: '密码',
    example: '123456a',
    required: true
  })
  @IsNotEmpty({ message: '密码不能为空' })
  password: string;

  @ApiProperty({
    title: '是否保持登录',
    example: true
  })
  remember: boolean;
}

export class AuthVo {
  @ApiProperty({
    title: 'token'
  })
  access_token: string;
  @ApiProperty({
    title: '刷新token'
  })
  refresh_token: string;
}


export class RefreshTokenVo {
  @ApiProperty({
    title: 'token',
    example: 'xxxxxxxx'
  })
  access_token: string;
}
