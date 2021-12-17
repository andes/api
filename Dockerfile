ARG NODE_VERSION=14-alpine
FROM node:${NODE_VERSION}

ENV node_env=development

RUN apk update && apk upgrade && apk add --no-cache git

WORKDIR /usr/src/api

COPY package.json package-lock.json ./
COPY packages ./packages

RUN MONGOMS_DISABLE_POSTINSTALL=1 npm install

COPY . .

RUN cp config.private.ts.example config.private.ts

RUN npm run tsc 

EXPOSE 3002

CMD [ "npm", "start" ]

