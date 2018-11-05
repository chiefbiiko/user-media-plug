# building react app
FROM node:10-alpine as build-art
WORKDIR /buildtube/view/
#ARG NOW_URL
#ENV REACT_APP_NOW_URL=${NOW_URL} REACT_APP_PORT=41900
COPY view /buildtube/view/
COPY clientele /buildtube/clientele/
RUN npm i
RUN npm run build
RUN ls /buildtube/view/build/

# running servers
FROM node:10-alpine
WORKDIR /plugtube/
COPY package.json /plugtube/
RUN npm i --only=production
COPY . /plugtube/
COPY --from=build-art /buildtube/view/build /plugtube/view/build/
RUN ls /plugtube/view/build/
# get the env var (env arg) NOW_URL_HUB_PASSWORD
ARG NOW_URL_HUB_PASSWORD
ENV NOW_URL_HUB_PASSWORD=${NOW_URL_HUB_PASSWORD}
# run the now-url-hub cli with env var NOW_URL_HUB_PASSWORD in place
RUN now-url-hub
ENV NOW_URL_HUB_PASSWORD=""
ENV NODE_ENV=production HOST=0.0.0.0 PORT=41900 DEBUG=user-media-plug:*
EXPOSE 41900
CMD npm start
