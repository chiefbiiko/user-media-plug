FROM node:10-jessie
RUN mkdir -p /home/plugtube
WORKDIR /home/plugtube
COPY . /home/plugtube
RUN npm install --only=production && npm run prod-url
COPY . .
EXPOSE 41900
CMD npm start
