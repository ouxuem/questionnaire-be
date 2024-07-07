import { AppModule } from './app.module';
import { bootstrap } from 'uni-nest';
import { WINSTON_LOGGER_TOKEN } from './winston/winston.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggerInterceptor } from './logger.interceptor';
bootstrap(AppModule, {
  swaggerOptions: {
    title: '浅浅问卷接口文档',
    description: '这是浅浅问卷的接口文档',
    version: '1.0.0',
    license: ['MIT'],
    swaggerPathPrefix: '/api/docs'
  },
  jwtVerifyOptions: {
    secret: process.env.JWT_SECRET
  },
  appOptions: {
    cors: {
      // origin: ['http://localhost:5173']
      origin: '*'
    },
    port: 3005
  },
  beforeAppListen(app) {
    app.useLogger(app.get(WINSTON_LOGGER_TOKEN));
    app.useGlobalInterceptors(new LoggerInterceptor(app.get(WINSTON_LOGGER_TOKEN)));
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix('/api');
  }
});
