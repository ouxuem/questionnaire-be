import { ApiProperty } from 'uni-nest';
import { QuestionnaireResponse } from '../../../typing/stat_list_type';
export class PostAnswerDto {
  @ApiProperty({
    title: '问卷id',
    example: '123456',
    required: true
  })
  questionId: string;
  @ApiProperty({
    title: '答案列表',
    example: [{ fe_id: 'xxx', value: 'yyy' }],
    required: true
  })
  answerList: Array<{ fe_id: string; value: string }>;
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
