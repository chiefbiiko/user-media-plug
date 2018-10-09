FROM node:10
RUN mkdir -p /home/plugtube
WORKDIR /home/plugtube
COPY . /home/plugtube
RUN npm install --only=production
COPY . .
EXPOSE 41900
RUN npm run prod-url
CMD npm start
