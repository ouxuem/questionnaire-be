import { ApiProperty } from 'uni-nest';
import { QuestionnaireResponse } from '../../../typing/stat_list_type';
import { IsNotEmpty } from 'class-validator';

export class PostAnswerDto {
  @ApiProperty({
    title: '问卷id',
    example: '123456',
    required: true
  })
  @IsNotEmpty({ message: 'id不能为空' })
  questionId: string;
  @ApiProperty({
    title: '答案列表',
    example: [{ fe_id: 'xxx', value: 'yyy' }],
    required: true
  })
  @IsNotEmpty({ message: '答案不能为空' })
  answerList: Array<{ fe_id: string; value: string }>;

  @ApiProperty({
    title: '浏览器指纹',
    example: 'xxxx',
    required: true
  })
  @IsNotEmpty({ message: 'fingerprint不能为空' })
  fingerprint: string;
}

export class GetStatListVo {
  @ApiProperty({
    title: '问卷id',
    example: '123456',
    required: true
  })
  total: number;
  @ApiProperty({
    title: '统计选项列表',
    example: [{ id: 'xxx', xxx: '男' }],
    required: true
  })
  list: Array<QuestionnaireResponse>;
}
