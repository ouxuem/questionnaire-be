import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { WINSTON_LOGGER_TOKEN } from '../../winston/winston.module';
import { MyLogger } from '../../my_logger';
import { PostAnswerDto } from './dto/stat.dto';

@Injectable()
export class StatService {
  @Inject(PrismaService)
  private prisma: PrismaService;

  @Inject(WINSTON_LOGGER_TOKEN)
  private logger: MyLogger;

  async submit_answer(submit_data: PostAnswerDto) {
    const { questionId, answerList } = submit_data;
    const number_question_id = parseInt(questionId, 10);
    try {
      await this.prisma.$transaction(async (prisma) => {
        // 创建新的 Answer
        const newAnswer = await prisma.answer.create({
          data: {
            questionId: number_question_id
          }
        });
        // 创建 AnswerItems
        const answerItems = answerList.map((item) => ({
          answerId: newAnswer.answerId,
          fe_id: item.fe_id,
          value: item.value
        }));

        await prisma.answerItem.createMany({
          data: answerItems
        });

        await prisma.question.update({
          where: { questionId: number_question_id },
          data: { answerCount: { increment: 1 } }
        });

        return true;
      });
    } catch (error) {
      this.logger.error(`提交问卷失败: ${error}`, 'StatService');
      throw new InternalServerErrorException('提交问卷失败');
    }
  }

  async get_stat_list(page: string, pageSize: string, question_id: string) {
    try {
      const pageNumber = parseInt(page, 10);
      const pageSizeNumber = parseInt(pageSize, 10);
      const questionIdNumber = parseInt(question_id, 10);

      if (isNaN(pageNumber) || isNaN(pageSizeNumber) || isNaN(questionIdNumber)) {
        throw new BadRequestException('参数错误');
      }

      // 首先检查问卷是否存在
      const question = await this.prisma.question.findUnique({
        where: { questionId: questionIdNumber },
        include: { componentList: true }
      });

      if (!question) {
        throw new NotFoundException('问卷不存在');
      }

      // 获取总答卷数量
      const total = await this.prisma.answer.count({
        where: { questionId: questionIdNumber }
      });

      // 获取分页的答卷列表
      const answers = await this.prisma.answer.findMany({
        where: { questionId: questionIdNumber },
        include: {
          answerItems: {
            include: {
              component: true
            }
          }
        },
        skip: (pageNumber - 1) * pageSizeNumber,
        take: pageSizeNumber
      });

      // 转换答卷列表为所需的格式
      const list = answers.map((answer) => {
        const result: { [key: string]: string } = { id: question_id };
        answer.answerItems.forEach((item) => {
          result[item.component.fe_id] = item.value;
        });
        return result;
      });

      return {
        list,
        total
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error; // 直接重新抛出 BadRequestException
      } else if (error instanceof NotFoundException) {
        throw error; // 直接重新抛出 NotFoundException
      } else {
        this.logger.error(`获取问卷统计失败: ${error}`, 'StatService');
        throw new InternalServerErrorException('获取问卷统计失败');
      }
    }
  }

  async get_question_stat_by_id(question_id: string, fe_id: string) {
    try {
      const questionIdNumber = parseInt(question_id, 10);
      if (isNaN(questionIdNumber)) {
        throw new NotFoundException('参数错误');
      }
      // 检查问卷是否存在
      const question = await this.prisma.question.findUnique({
        where: { questionId: questionIdNumber },
        include: { componentList: true }
      });

      if (!question) {
        throw new NotFoundException('问卷不存在');
      }

      // 检查组件是否存在
      const component = question.componentList.find((comp) => comp.fe_id === fe_id);
      if (!component) {
        throw new NotFoundException('问卷问题不存在');
      }

      // 获取该组件的所有答案
      const answerItems = await this.prisma.answerItem.findMany({
        where: {
          fe_id: fe_id,
          answer: {
            questionId: questionIdNumber
          }
        },
        select: {
          value: true
        }
      });

      // 统计答案
      const statMap = new Map<string, number>();
      answerItems.forEach((item) => {
        const count = statMap.get(item.value) || 0;
        statMap.set(item.value, count + 1);
      });

      // 转换为所需的格式
      const stat = Array.from(statMap.entries()).map(([name, count]) => ({
        name,
        count
      }));

      return { stat };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      } else {
        this.logger.error(`获取问卷题目统计失败: ${error}`, 'StatService');
        throw new InternalServerErrorException('获取问卷题目统计失败');
      }
    }
  }

  async get_question_count() {
    const question_total = await this.prisma.question.count({
      where:{
        isDeleted: false
      }
    });
    const published_question_total = await this.prisma.question.count({
      where: {
        isPublished: true
      }
    });
    const answer_count = await this.prisma.answer.count();

    return {
      question_total,
      published_question_total,
      answer_count
    };
  }
}
