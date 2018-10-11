FROM node:10-alpine as build-art
WORKDIR /buildtube/view
COPY view /buildtube/view/
COPY clientele /buildtube/clientele/
ARG NOW_URL
ENV REACT_APP_NOW_URL ${NOW_URL}
ENV REACT_APP_PORT 41900
RUN npm i
RUN npm run build
RUN ls /buildtube/view/build/

FROM node:10-alpine
WORKDIR /plugtube/
COPY package.json /plugtube/
RUN npm i --only=production
COPY . /plugtube/
ENV PORT 41900
ENV HOST 0.0.0.0
ENV DEBUG user-media-plug:*
ENV NODE_ENV production
EXPOSE 41900
COPY --from=build-art /buildtube/view/build/ /plugtube/view/build/
RUN ls /plugtube/view/build/
CMD npm start
