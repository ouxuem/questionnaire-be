import { Controller, Body, Param, Query } from '@nestjs/common';
import { QuestionService } from './question.service';
import { CreateQuestionVo, DeleteQuestionDto, GetOneQuestionVo, GetQuestionListVo, UpdateQuestionDto } from './dto/question.dto';
import { ApiTags, Method, UniDefine, User } from 'uni-nest';
import { type_jwt_user_data } from '../../typing/jwt_user_data_type';
@ApiTags('问卷信息')
@Controller('question')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}
  @UniDefine({
    summary: '获取单个问卷信息',
    description: '根据questionID获取单个问卷信息',
    method: Method.Get,
    isPublic: true,
    path: '/:id',
    response: {
      model: GetOneQuestionVo
    },
    param: {
      type: String,
      name: 'id',
      description: '问卷ID',
      example: '123123123123'
    }
  })
  async get_question_by_id(@Param('id') question_id: string) {
    return this.questionService.get_question_by_id(question_id);
  }

  @UniDefine({
    summary: '新建问卷',
    description: '新建一个问卷',
    method: Method.Post,
    response: {
      model: CreateQuestionVo
    }
  })
  async create_question(@User() user: type_jwt_user_data) {
    const id = await this.questionService.create_question(user.id);
    return { id };
  }

  @UniDefine({
    summary: '更新单个问卷信息',
    description: '根据questionID更新单个问卷信息',
    method: Method.Patch,
    path: '/:id',
    param: {
      type: String,
      name: 'id',
      description: '问卷ID',
      example: '123123123123'
    },
    body: {
      type: UpdateQuestionDto,
      description: '问卷信息'
    }
  })
  async update_question_by_id(@Param('id') question_id: string, @Body() updateData: UpdateQuestionDto) {
    return this.questionService.update_question_by_id(question_id, updateData);
  }

  @UniDefine({
    summary: '获取问卷列表',
    description: '问卷列表分页',
    method: Method.Get,
    response: {
      type: 'object',
      model: GetQuestionListVo
    }
  })
  async get_question_list(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
    @Query('keyword') keyword: string = '',
    @Query('isStar') isStar?: string,
    @Query('isDeleted') isDeleted?: string
  ) {
    const pageNumber = parseInt(page, 10);
    const pageSizeNumber = parseInt(pageSize, 10);

    // 转换 isStar 和 isDeleted 为布尔值
    const isStarBool = isStar === 'true' ? true : isStar === 'false' ? false : undefined;
    const isDeletedBool = isDeleted === 'true' ? true : isDeleted === 'false' ? false : undefined;
    return this.questionService.get_question_list(pageNumber, pageSizeNumber, keyword, isStarBool, isDeletedBool);
  }

  // 彻底删除问卷
  @UniDefine({
    summary: '删除问卷',
    description: '批量删除问卷',
    method: Method.Delete,
    body: {
      type: DeleteQuestionDto,
      description: '删除问卷id数组'
    }
  })
  async delete_question_by_id(@Body() deleteData: DeleteQuestionDto) {
    return this.questionService.delete_question_by_ids(deleteData.ids);
  }

  @UniDefine({
    summary: '复制问卷',
    description: '根据questionID复制问卷',
    method: Method.Post,
    path: '/copy/:id',
    param: {
      type: String,
      name: 'id',
      description: '问卷ID',
      example: '123123123123'
    }
  })
  async copy_question_by_id(@Param('id') question_id: string) {
    const number_question_id = parseInt(question_id, 10);
    return this.questionService.copy_question_by_id(number_question_id);
  }

  @UniDefine({
    summary: '自动保存问卷',
    description: '自动保存问卷',
    method: Method.Post,
    path: '/autosave/:id',
    param: {
      type: String,
      name: 'id',
      description: '问卷ID',
      example: '123123123123'
    },
    body: {
      type: UpdateQuestionDto,
      description: '问卷信息'
    }
  })
  async auto_save_question(@Param('id') question_id: string, @Body() updateData: UpdateQuestionDto) {
    return this.questionService.auto_save_question(question_id, updateData);
  }
}
