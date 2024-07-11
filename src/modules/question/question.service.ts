import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { WINSTON_LOGGER_TOKEN } from '../../winston/winston.module';
import { MyLogger } from '../../my_logger';
import { UpdateQuestionDto } from './dto/question.dto';
import { Prisma } from '@prisma/client';
import { convertToChinaTime } from '../../utils';
import { nanoid } from 'nanoid';
import { RedisService } from '../redis/redis.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
@Injectable()
export class QuestionService {
  constructor(@InjectQueue('question_save') private autoSaveQueue: Queue) {}

  @Inject(PrismaService)
  private prisma: PrismaService;

  @Inject(WINSTON_LOGGER_TOKEN)
  private logger: MyLogger;

  @Inject(RedisService)
  private redisService: RedisService;

  async create_question(user_id: number) {
    try {
      // 创建新的问卷
      const new_question = await this.prisma.question.create({
        data: {
          userId: user_id,
          title: '这是问卷标题',
          desc: '这是问卷的描述',
          js: '',
          css: ''
        }
      });
      this.logger.log(`id${user_id}用户创建新问卷,问卷id: ${new_question.questionId}`, 'QuestionService');
      return new_question.questionId;
    } catch (error) {
      this.logger.error(`创建问卷失败: ${error}`, 'QuestionService');
      throw new InternalServerErrorException('创建问卷失败');
    }
  }

  async get_question_by_id(question_id: string) {
    try {
      const cachedData = await this.redisService.getCachedQuestionnaire(question_id);
      if (cachedData) {
        this.logger.log(`从redis获取问卷数据成功`, 'QuestionService');
        return cachedData;
      }
      const number_question_id = parseInt(question_id, 10);
      if (isNaN(number_question_id)) {
        throw new InternalServerErrorException('查询问卷参数错误');
      }

      const question = await this.prisma.question.findUnique({
        where: { questionId: number_question_id },
        include: {
          componentList: {
            orderBy: {
              order: 'asc' // 按 order 升序排列
            }
          }
        }
      });

      if (!question) {
        throw new NotFoundException('问卷不存在');
      }

      return {
        ...question,
        id: question.questionId
      };
    } catch (error) {
      this.logger.error(`查询单个问卷失败: ${error}`, 'QuestionService');
      throw new InternalServerErrorException('系统错误，请联系管理员');
    }
  }

  async update_question_by_id(question_id: string, updateData: UpdateQuestionDto) {
    try {
      const number_question_id = parseInt(question_id, 10);

      if (isNaN(number_question_id)) {
        throw new InternalServerErrorException('更新问卷参数错误');
      }

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

        // 准备更新数据
        let updateFields: any = {};
        // 缓存数据
        let cacheData: any = {
          id: question_id
        };

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
          await this.redisService.cacheQuestionnaireEdit(question_id, cacheData);
        }

        return true;
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`更新问卷失败: ${error}`, 'QuestionService');
      throw new InternalServerErrorException('更新问卷失败');
    }
  }

  async get_question_list(page: number, pageSize: number, keyword: string, id: number, isStar?: boolean, isDeleted?: boolean) {
    try {
      const skip = (page - 1) * pageSize;

      const where: Prisma.QuestionWhereInput = {
        title: {
          contains: keyword
        },
        userId: id
      };

      // 如果 isStar 被指定，添加到查询条件
      if (isStar !== undefined) {
        where.isStar = isStar;
      }

      where.isDeleted = isDeleted === undefined ? false : isDeleted;
      // 查询总数
      const total = await this.prisma.question.count({ where });

      // 查询问卷列表
      const questions = await this.prisma.question.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc' // 假设我们按创建时间降序排序
        },
        select: {
          questionId: true,
          title: true,
          isPublished: true,
          isStar: true,
          answerCount: true,
          createdAt: true,
          isDeleted: true,
          userId: true
        }
      });

      const formattedQuestions = questions.map((q) => ({
        id: q.questionId,
        title: q.title,
        isPublished: q.isPublished,
        isStar: q.isStar,
        answerCount: q.answerCount,
        createdAt: convertToChinaTime(q.createdAt.toISOString()),
        isDeleted: q.isDeleted,
        userId: q.userId // 包含 userId 在返回的数据中
      }));
      return {
        list: formattedQuestions,
        total
      };
    } catch (error) {
      this.logger.error(`查询问卷列表失败: ${error}`, 'QuestionService');
      throw new InternalServerErrorException('查询问卷列表失败');
    }
  }

  async delete_question_by_ids(question_ids: number[]) {
    try {
      // 使用事务来确保数据一致性
      return await this.prisma.$transaction(async (prisma) => {
        await prisma.answerItem.deleteMany({
          where: {
            answer: {
              questionId: {
                in: question_ids
              }
            }
          }
        });
        await prisma.answer.deleteMany({
          where: {
            questionId: {
              in: question_ids
            }
          }
        });
        await prisma.component.deleteMany({
          where: {
            questionId: {
              in: question_ids
            }
          }
        });
        const deleteResult = await prisma.question.deleteMany({
          where: {
            questionId: {
              in: question_ids
            }
          }
        });
        // 检查是否有问卷被删除
        if (deleteResult.count === 0) {
          throw new NotFoundException('未找到与提供ID相匹配的问卷');
        }
        return true;
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      // 记录错误日志
      this.logger.error(`删除问卷时发生错误: ${error}`, 'QuestionService');
      throw new InternalServerErrorException('删除问卷时发生错误');
    }
  }

  async copy_question_by_id(question_id: number) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        // 1. 获取原问卷数据
        const originalQuestion = await prisma.question.findUnique({
          where: { questionId: question_id },
          include: { componentList: true }
        });

        if (!originalQuestion) {
          throw new NotFoundException(`未找到问卷，无法复制`);
        }

        const newQuestion = await prisma.question.create({
          data: {
            userId: originalQuestion.userId,
            answerCount: 0,
            isDeleted: false,
            isPublished: false,
            isStar: false,
            title: `${originalQuestion.title} (副本)`,
            js: originalQuestion.js,
            desc: originalQuestion.desc,
            css: originalQuestion.css
          }
        });

        // 3. 复制组件
        const componentPromises = originalQuestion.componentList.map((component) =>
          prisma.component.create({
            data: {
              fe_id: nanoid(),
              isHidden: component.isHidden,
              isLocked: component.isLocked,
              title: component.title,
              type: component.type,
              props: component.props,
              order: component.order,
              questionId: newQuestion.questionId
            }
          })
        );

        await Promise.all(componentPromises);

        return {
          id: newQuestion.questionId
        };
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`复制问卷时发生错误: ${error}`, 'QuestionService');
      throw new InternalServerErrorException('复制问卷时发生错误');
    }
  }

  async auto_save_question(question_id: string, updateData: UpdateQuestionDto) {
    try {
      const number_question_id = parseInt(question_id, 10);

      if (isNaN(number_question_id)) {
        throw new InternalServerErrorException('问卷参数错误');
      }

      // 添加保存任务到队列
      await this.autoSaveQueue.add('question_save', { number_question_id, updateData });

      return true;
    } catch (error) {
      this.logger.error(`自动保存失败: ${error}`, 'QuestionService');
      throw new InternalServerErrorException('自动保存失败');
    }
  }
}
