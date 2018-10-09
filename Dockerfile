FROM node:10-jessie
WORKDIR /home/plugtube
COPY ./package*.json ./
COPY ./clientele ./
COPY ./utils ./
COPY ./view ./
RUN apt-get update
RUN apt-get install -y git
RUN npm install --only=production && \
    npm cache clean --force && \
    npm run prod-url
COPY . .
EXPOSE 41900
CMD npm start
