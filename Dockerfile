FROM node:20-alpine

WORKDIR /app

COPY package.json .

COPY pnpm-lock.yaml* .

RUN npm config set registry https://registry.npmmirror.com/

RUN npm install -g pnpm

RUN pnpm config set registry https://registry.npmmirror.com/

RUN pnpm install

COPY . .

RUN npx prisma generate

RUN npx prisma migrate deploy

RUN npm run build

EXPOSE 3000

CMD [ "node", "./dist/main.js" ]
