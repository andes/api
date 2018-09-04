ARG NODE_VERSION=8-alpine
FROM node:${NODE_VERSION}

ENV node_env=development

RUN apk update && apk upgrade && apk add --no-cache git

RUN npm i -g npm@latest

WORKDIR /usr/src/api

RUN npm i -g npm

COPY package.json  ./

RUN npm install

COPY . .

RUN cp config.private.ts.example config.private.ts

RUN npm run tsc

RUN npm run parse

EXPOSE 3002
CMD [ "npm", "start" ]

