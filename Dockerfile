# 构建阶段
FROM node:18.20-alpine3.19 as build-stage

WORKDIR /app

COPY package.json .

RUN npm config set registry https://registry.npmmirror.com/

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build

# 运行阶段
FROM node:18.20-alpine3.19 as production-stage

COPY --from=build-stage /app/dist /app
COPY --from=build-stage /app/package.json /app/package.json
COPY --from=build-stage /app/prisma /app/prisma

WORKDIR /app

RUN npm config set registry https://registry.npmmirror.com/

RUN npm install pm2 -g

RUN npm install --production

COPY ecosystem.config.js ./

COPY .env ./

RUN npx prisma generate

EXPOSE 3005

CMD npx prisma db push --force-reset && npm run pm2-start
