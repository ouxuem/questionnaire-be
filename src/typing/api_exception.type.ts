import { ApiProperty } from 'uni-nest';

export class ApiExceptionType {
  @ApiProperty({ example: 400, description: 'HTTP状态码' })
  code: number;
  @ApiProperty({
    example: [
      '用户名只能包含数字、字母和下划线',
      '密码长度不能少于6个字符',
      '密码不能为空',
      '昵称不能为空'
    ],
    description: '错误信息'
  })
  msg: string | string[];
  @ApiProperty({ example: '2024-07-01 21:24:30', description: '请求时间戳' })
  timestamp: string;
  @ApiProperty({ example: '/api/user/register', description: '请求路径' })
  path: string;
}
