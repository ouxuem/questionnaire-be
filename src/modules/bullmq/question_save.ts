import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../db/prisma.service';
import { MyLogger } from '../../my_logger';
import { Inject, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { WINSTON_LOGGER_TOKEN } from '../../winston/winston.module';
import { RedisService } from '../redis/redis.service';
@Processor('question_save')
export class QuestionSaveProcessor extends WorkerHost {
  constructor(
    @Inject(PrismaService)
    private prisma: PrismaService,
    @Inject(WINSTON_LOGGER_TOKEN)
    private logger: MyLogger,
    @Inject(RedisService)
    private redisService: RedisService
  ) {
    super();
  }
  async process(job: Job<any, any, string>): Promise<any> {
    try {
      const { number_question_id, updateData } = job.data;

      // 使用事务来确保所有操作都成功或全部回滚
      return await this.prisma.$transaction(async (prisma) => {
        // 查询数据库中的问卷信息
        const existing_question = await prisma.question.findUnique({
          where: { questionId: number_question_id },
          include: { componentList: true }
        });

        if (!existing_question) {
          throw new NotFoundException('问卷不存在');
        }

        let cacheData: any = {
          id: existing_question.questionId.toString()
        };
        // 准备更新数据
        let updateFields: any = {};
        if (existing_question.isPublished) {
          // 如果问卷已发布，只允许修改 isStar 和 isDeleted
          if (updateData.isStar !== undefined) {
            updateFields.isStar = updateData.isStar;
            cacheData.isStar = updateData.isStar;
          }
          if (updateData.isDeleted !== undefined) {
            updateFields.isDeleted = updateData.isDeleted;
            cacheData.isDeleted = updateData.isDeleted;
          }
          // 如果尝试将 isPublished 从 true 改为 false
          if (updateData.isPublished === false) {
            // 首先删除所有相关的 AnswerItem
            await prisma.answerItem.deleteMany({
              where: {
                answer: {
                  questionId: number_question_id
                }
              }
            });
            // 删除所有相关的答卷
            await prisma.answer.deleteMany({
              where: { questionId: number_question_id }
            });
            updateFields.isPublished = false;
            cacheData.isPublished = false;
            updateFields.answerCount = 0;
            cacheData.answerCount = 0;
          }
        } else {
          const fieldsToUpdate = ['isStar', 'isDeleted', 'isPublished', 'title', 'css', 'js', 'desc'];
          fieldsToUpdate.forEach((field) => {
            if (updateData[field] !== undefined) {
              updateFields[field] = updateData[field];
              cacheData[field] = updateData[field];
            }
          });

          if (updateData.componentList) {
            // 删除原有的组件
            await prisma.component.deleteMany({
              where: { questionId: number_question_id }
            });
            // 按顺序创建新的组件
            // 准备用于批量创建的数据
            const componentsData = updateData.componentList.map((component, i) => ({
              fe_id: component.fe_id,
              isHidden: component.isHidden ?? false,
              isLocked: component.isLocked ?? false,
              title: component.title,
              type: component.type,
              props: JSON.stringify(component.props),
              questionId: number_question_id,
              order: i // 使用索引作为顺序
            }));

            // 批量创建新的组件
            await prisma.component.createMany({
              data: componentsData
            });
            cacheData.componentList = componentsData;
          } else {
            cacheData.componentList = existing_question.componentList;
          }
        }

        if (Object.keys(updateFields).length > 0) {
          // 更新问卷基本信息
          await prisma.question.update({
            where: { questionId: number_question_id },
            data: updateFields
          });

          Object.assign(cacheData, {
            isDeleted: cacheData.isDeleted ?? existing_question.isDeleted,
            isPublished: cacheData.isPublished ?? existing_question.isPublished,
            css: cacheData.css ?? existing_question.css,
            desc: cacheData.desc ?? existing_question.desc,
            js: cacheData.js ?? existing_question.js,
            title: cacheData.title ?? existing_question.title,
            componentList: cacheData.componentList ?? existing_question.componentList
          });
          await this.redisService.cacheQuestionnaireEdit(number_question_id, cacheData);
        }

        this.logger.log(`完成队列更新问卷: ${number_question_id}`, 'QuestionSaveProcessor');
        return true;
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`队列更新问卷失败: ${error}`, 'QuestionSaveProcessor');
      throw new InternalServerErrorException('队列更新问卷失败');
    }
  }
}
