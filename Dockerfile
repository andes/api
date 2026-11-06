ARG NODE_VERSION=22-alpine
FROM node:${NODE_VERSION}

# libxmljs2 se compila acá. libxml2 queda en la imagen; el resto es solo para el build.
RUN apk add --no-cache libxml2 git \
    && apk add --no-cache --virtual .build-deps python3 make g++ libxml2-dev

ENV PUPPETEER_SKIP_DOWNLOAD=1
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    fontconfig \
    ttf-freefont \
    ttf-liberation

WORKDIR /usr/src/api

COPY package.json package-lock.json ./
COPY packages ./packages

# El postinstall de mongodb-memory-server baja un binario que la imagen no usa.
RUN MONGOMS_DISABLE_POSTINSTALL=1 npm ci \
    && apk del .build-deps

COPY . .

RUN cp config.private.ts.example config.private.ts

RUN npm run tsc

ENV NODE_ENV=production

EXPOSE 3002

CMD ["node", "index.js"]
