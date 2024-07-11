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
          include: {
            componentList: {
              orderBy: {
                order: 'asc' // 按 order 升序排列
              }
            }
          }
        });

        if (!existing_question) {
          throw new NotFoundException('问卷不存在');
        }

        let cacheData: any = {
          id: existing_question.questionId.toString()
        };
        // 准备更新数据
        let updateFields: any = {};

        const fieldsToUpdate = ['isDeleted', 'isStar', 'isPublished', 'title', 'css', 'js', 'desc'];
        fieldsToUpdate.forEach((field) => {
          if (updateData[field] !== undefined) {
            updateFields[field] = updateData[field];
            cacheData[field] = updateData[field];
          }
        });

        if (updateData.componentList) {
          const existingComponents = await prisma.component.findMany({
            where: { questionId: number_question_id },
            select: { fe_id: true }
          });

          // 找出要删除的组件的 fe_id
          const existingFeIds = new Set(existingComponents.map((comp) => comp.fe_id));
          const newFeIds = new Set(updateData.componentList.map((comp) => comp.fe_id));
          const feIdsToDelete = [...existingFeIds].filter((id) => !newFeIds.has(id));
          if (feIdsToDelete.length > 0) {
            await prisma.answerItem.deleteMany({
              where: {
                fe_id: { in: feIdsToDelete }
              }
            });

            // 删除组件
            await prisma.component.deleteMany({
              where: {
                fe_id: { in: feIdsToDelete },
                questionId: number_question_id
              }
            });

            // 删除没有关联 AnswerItems 的 Answers
            await prisma.answer.deleteMany({
              where: {
                questionId: number_question_id,
                answerItems: {
                  none: {}
                }
              }
            });
          }

          const answerCount = await prisma.answer.count({
            where: { questionId: number_question_id }
          });
          updateFields.answerCount = answerCount;
          cacheData.answerCount = answerCount;

          const componentsData = updateData.componentList.map((component) => ({
            fe_id: component.fe_id,
            isHidden: component.isHidden ?? false,
            isLocked: component.isLocked ?? false,
            title: component.title,
            type: component.type,
            props: component.props,
            questionId: number_question_id,
            order: component.order // 使用索引作为顺序
          }));

          await Promise.all(
            componentsData.map((component) =>
              prisma.component.upsert({
                where: { fe_id: component.fe_id },
                update: {
                  isHidden: component.isHidden,
                  isLocked: component.isLocked,
                  title: component.title,
                  type: component.type,
                  props: component.props,
                  order: component.order
                },
                create: component
              })
            )
          );

          cacheData.componentList = componentsData;
        } else {
          cacheData.componentList = existing_question.componentList;
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
            componentList: cacheData.componentList ?? existing_question.componentList,
            answerCount: existing_question.answerCount
          });
          // 保存到Redis缓存
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
