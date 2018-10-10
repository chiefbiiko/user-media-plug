FROM node:10-alpine
RUN mkdir -p /home/plugtube
WORKDIR /home/plugtube
COPY . /home/plugtube
RUN npm install --only=production
COPY . .
ENV PORT 41900
ENV HOST 0.0.0.0
ENV DEBUG user-media-plug:*
EXPOSE 41900
CMD npm run prod-url && npm start
