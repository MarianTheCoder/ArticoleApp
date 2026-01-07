FROM node:18

RUN apt-get update && apt-get install -y \
  build-essential \
  python3 \
  pkg-config \
  libvips-dev \
  poppler-utils \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

ENV npm_config_os=linux \
    npm_config_cpu=x64 \
    npm_config_libc=glibc
RUN npm ci --include=optional

COPY . .

RUN npm rebuild sharp --force --unsafe-perm

EXPOSE 3000
CMD ["node", "server.js"]