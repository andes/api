FROM node:8.9-alpine

# Create app directory
WORKDIR /usr/src/app

RUN npm install -g typescript nodemon

COPY package.json ./

COPY . .

EXPOSE 3002
CMD [ "npm", "start" ]

