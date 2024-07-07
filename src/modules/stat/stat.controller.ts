import { Body, Controller, Param, Query } from '@nestjs/common';
import { StatService } from './stat.service';
import { ApiTags, Method, UniDefine } from 'uni-nest';
import { GetStatListVo, PostAnswerDto } from './dto/stat.dto';

@ApiTags('统计及提交问卷')
@Controller('stat')
export class StatController {
  constructor(private readonly statService: StatService) {}

  @UniDefine({
    method: Method.Post,
    summary: '提交答卷',
    description: '提交答卷接口',
    isPublic: true,
    path: '/submitAnswer',
    body: {
      type: PostAnswerDto
    }
  })
  async submit_answer(@Body() submit_data: PostAnswerDto) {
    return this.statService.submit_answer(submit_data);
  }

  @UniDefine({
    method: Method.Get,
    summary: '获取统计列表',
    description: '获取统计列表',
    path: '/:id',
    param: {
      type: String,
      name: 'id',
      description: '问卷ID',
      example: '123123123123'
    },
    response: {
      model: GetStatListVo
    }
  })
  async get_stat_list(@Query('page') page: string = '1', @Query('pageSize') pageSize: string = '10', @Param('id') question_id: string) {
    return this.statService.get_stat_list(page, pageSize, question_id);
  }

  @UniDefine({
    method: Method.Get,
    summary: '获取单个问题统计',
    description: '获取单个问题统计',
    path: '/:id/:fe_id',
    param: {
      type: String,
      name: 'id',
      description: '问卷ID',
      example: '123123123123'
    },
    response: {
      model: GetStatListVo
    }
  })
  async get_question_stat_by_id(@Param('id') question_id: string, @Param('fe_id') fe_id: string) {
    return this.statService.get_question_stat_by_id(question_id, fe_id);
  }

  @UniDefine({
    path: '/questionCount',
    method: Method.Post,
    summary: '获取首页统计',
    description: '获取首页统计',
    isPublic: true
  })
  async get_question_count_stat() {
    return this.statService.get_question_count();
  }
}
