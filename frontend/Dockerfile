FROM docker.m.daocloud.io/library/node:20-alpine

WORKDIR /app

# 使用淘宝 npm 镜像
RUN npm config set registry https://registry.npmmirror.com

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# NEXT_PUBLIC_* 变量在构建期被内联进客户端产物，必须在 build 前注入；
# 不传时为空字符串，前端自动回退到相对路径 /api（生产走 nginx 反代）
ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# 生产构建
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
