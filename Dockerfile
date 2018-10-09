FROM node:10-jessie
RUN mkdir -p /home/plugtube
WORKDIR /home/plugtube
COPY . ./home/plugtube
RUN apt-get update
RUN apt-get install -y git
RUN npm install --only=production && \
    npm cache clean --force && \
    npm run prod-url
EXPOSE 41900
CMD npm start
