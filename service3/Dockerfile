FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY app.js .
COPY public ./public

EXPOSE 3000

CMD ["npm", "start"]