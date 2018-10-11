FROM node:10-alpine
WORKDIR /plugtube/
COPY package.json /plugtube/
RUN npm i --only=production
COPY . /plugtube/
RUN npm run prod-url
ARG NOW_URL
ENV NODE_ENV production
ENV PORT 41900
ENV HOST 0.0.0.0
ENV DEBUG user-media-plug:*
EXPOSE 41900
CMD npm start
