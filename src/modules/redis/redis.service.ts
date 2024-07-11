import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redisClient: Redis
  ) {}

  async cacheQuestionnaireEdit(questionId: string, data: any): Promise<void> {
    await this.redisClient.set(`questionId:${questionId}`, JSON.stringify(data), 'EX', 3600); // 1小时过期
  }

  async getCachedQuestionnaire(questionId: string): Promise<any> {
    const data = await this.redisClient.get(`questionId:${questionId}`);
    return data ? JSON.parse(data) : null;
  }

  async checkFingerprint(fingerprint: string): Promise<boolean> {
    const value = await this.redisClient.get(fingerprint);
    return value !== null;
  }

  async addFingerprint(fingerprint: string): Promise<void> {
    const expireTimeInSeconds: number = 1800;
    await this.redisClient.set(fingerprint, '1', 'EX', expireTimeInSeconds);
  }
}
