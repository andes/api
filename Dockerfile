ARG NODE_VERSION=8.9-alpine
FROM node:${NODE_VERSION}

RUN npm install -g typescript nodemon

WORKDIR /usr/src/api

COPY package.json ./

RUN npm install

COPY . .

RUN cp config.private.ts.example config.private.ts

RUN npm run tsc

RUN npm run parse

EXPOSE 3002
CMD [ "npm", "start" ]

