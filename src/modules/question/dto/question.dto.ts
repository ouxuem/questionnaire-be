import { ApiProperty, OmitType, PartialType } from 'uni-nest';
import { component_list_type } from '../../../typing/component_list_type';
import { question_list_type } from '../../../typing/question_list_type';

export class CreateQuestionVo {
  @ApiProperty({
    title: '问卷id',
    example: '61a0d1d0c7d5d1001b1d5d1d'
  })
  id: string;
}

export class GetOneQuestionVo {
  @ApiProperty({
    title: 'css样式',
    example: 'background-color: #f0f0f0;'
  })
  css: string;
  @ApiProperty({
    title: '脚本代码',
    example: 'console.log("hello world");'
  })
  js: string;
  @ApiProperty({
    title: '问卷标题',
    example: '问卷标题'
  })
  title: string;
  @ApiProperty({
    title: '问卷描述',
    example: '问卷描述'
  })
  desc: string;
  @ApiProperty({
    title: '问卷是否发布',
    example: true
  })
  isPublished: boolean;
  @ApiProperty({
    title: '问卷是否删除',
    example: false
  })
  isDeleted: boolean;
  @ApiProperty({
    title: '问卷id',
    example: '310000201801153634'
  })
  id: string;
  @ApiProperty({
    title: '问卷问题列表',
    example: []
  })
  componentList: component_list_type[];
}

export class UpdateQuestionDto extends PartialType(OmitType(GetOneQuestionVo, ['id'] as const)) {
  @ApiProperty({
    title: '标星问卷',
    example: false,
    required: false
  })
  isStar?: boolean;
}

export class DeleteQuestionDto {
  @ApiProperty({
    title: '删除问卷id列表',
    example: [1,2,3,4],
    required: true
  })
  ids: number[];
}

export class GetQuestionListVo {
  @ApiProperty({
    title: '问卷列表',
    example: []
  })
  list: question_list_type[];
  @ApiProperty({
    title: '总数',
    example: 0
  })
  total: number;
}
