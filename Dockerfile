FROM node:10-alpine
WORKDIR /home/plugtube
COPY ./package*.json ./
RUN npm install --only=production && \
    npm cache clean --force && \
    npm run prod-url
COPY . .
EXPOSE 41900
CMD npm start
