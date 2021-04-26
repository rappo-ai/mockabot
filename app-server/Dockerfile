FROM node:12
WORKDIR /home/node/app
COPY . .
EXPOSE 3000
RUN ["npm", "ci"]
CMD ["npm", "run", "start:tunnel"]
