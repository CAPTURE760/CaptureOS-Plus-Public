FROM docker.m.daocloud.io/library/node:20-alpine

WORKDIR /app

# 使用淘宝 npm 镜像
RUN npm config set registry https://registry.npmmirror.com

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# 生产构建
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
