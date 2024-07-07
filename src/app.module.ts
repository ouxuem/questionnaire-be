import { Module } from '@nestjs/common';
import { UserModule } from './modules/user/user.module';
import { UploadModule } from './modules/upload/upload.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './modules/db/prisma.service';
import { WinstonModule } from './winston/winston.module';
import { transports, format } from 'winston';
import * as chalk from 'chalk';
import 'winston-daily-rotate-file';
import { PrismaModule } from './modules/db/prisma.module';
import { QuestionModule } from './modules/question/question.module';
import { StatModule } from './modules/stat/stat.module';
import { RedisModule } from './modules/redis/redis.module';
import { BullModule } from '@nestjs/bullmq';
@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379
      }
    }),
   
    RedisModule,
    PrismaModule,
    UserModule,
    UploadModule,
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    WinstonModule.forRoot({
      level: 'debug',
      transports: [
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.printf(({ context, level, message, time }) => {
              const appStr = chalk.green(`[NEST]`);
              const contextStr = chalk.yellow(`[${context}]`);
              return `${appStr} ${time} ${level} ${contextStr} ${message} `;
            })
          )
        }),
        new transports.DailyRotateFile({
          level: 'info',
          filename: 'application-%DATE%.log',
          dirname: 'log',
          maxSize: '1m',
          datePattern: 'YYYY-MM-DD-HH-mm',
          maxFiles: '14d',
          format: format.combine(format.timestamp(), format.json())
        })
      ]
    }),
    QuestionModule,
    StatModule
  ],
  providers: [PrismaService],
  exports: [PrismaService]
})
export class AppModule {}
