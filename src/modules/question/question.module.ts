import { Module } from '@nestjs/common';
import { QuestionService } from './question.service';
import { QuestionController } from './question.controller';
import { QuestionSaveProcessor } from '../bullmq/question_save';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'question_save'
    }),
  ],
  controllers: [QuestionController],
  providers: [QuestionService, QuestionSaveProcessor]
})
export class QuestionModule {}
