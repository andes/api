ARG NODE_VERSION=8.9-alpine
FROM node:${NODE_VERSION}

RUN npm install -g typescript @angular/cli@1.4.0 nodemon

WORKDIR /usr/src/api

COPY package.json ./

RUN npm install

COPY . .

RUN cp config.private.ts.example config.private.ts

RUN npm run tsc

EXPOSE 3002
CMD [ "npm", "start" ]

