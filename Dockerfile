FROM node:10-alpine as build-art
WORKDIR /buildtube/
COPY view /buildtube/
COPY clientele /clientele/
ARG NOW_URL
ENV REACT_APP_NOW_URL ${NOW_URL}
ENV REACT_APP_PORT 41900
RUN npm i
RUN npm run build

FROM node:10-alpine
WORKDIR /plugtube/
COPY package.json /plugtube/
RUN npm i --only=production
COPY . /plugtube/
#ARG NOW_URL
#ENV REACT_APP_NOW_URL ${NOW_URL}
ENV PORT 41900
#ENV REACT_APP_PORT 41900
ENV HOST 0.0.0.0
ENV DEBUG user-media-plug:*
ENV NODE_ENV production
EXPOSE 41900
#RUN cd /plugtube/view/ && npm i && npm run build && rm -rf /plugtube/view/node_modules && cd /plugtube
COPY --from=build-art /buildtube/build/ /plugtube/view/build/
CMD npm start
