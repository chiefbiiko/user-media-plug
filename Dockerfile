FROM node:10-alpine
WORKDIR /plugtube/
COPY package.json /plugtube/
RUN npm i --only=production
COPY . /plugtube/
ARG NOW_URL
ENV REACT_APP_NOW_URL=${NOW_URL}
ENV PORT 41900
ENV REACT_APP_PORT 41900
ENV HOST 0.0.0.0
ENV DEBUG user-media-plug:*
ENV NODE_ENV production
EXPOSE 41900
RUN cd /plugtube/view/ && npm i && npm run build && rm -rf /plugtube/view/node_modules && cd /plugtube
CMD npm start
