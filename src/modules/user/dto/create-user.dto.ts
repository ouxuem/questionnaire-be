import { ApiProperty } from 'uni-nest';
import { Length, Matches, IsNotEmpty, MaxLength, MinLength } from 'class-validator';
export class CreateUserDto {
  @ApiProperty({
    description: '用户名',
    example: 'admin',
    required: true
  })
  @IsNotEmpty({ message: '用户名不能为空' })
  @Length(5, 15, { message: '用户名长度必须在5到15位之间' })
  @Matches(/^\w+$/, { message: '用户名只能包含数字、字母和下划线' })
  username: string;

  @ApiProperty({
    description: '密码',
    example: '123456a',
    required: true
  })
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度不能少于6个字符' })
  @MaxLength(20, { message: '密码长度不能超过20个字符' })
  @Matches(/^(?=.*[a-zA-Z\W])[\w\W]*$/, {
    message: '密码不能为纯数字，请包含字母或特殊字符'
  })
  password: string;

  @ApiProperty({
    description: '昵称',
    example: '123456a',
    required: true
  })
  @IsNotEmpty({ message: '昵称不能为空' })
  @MaxLength(20, { message: '昵称长度不能超过20个字符' })
  nickname: string;
}
