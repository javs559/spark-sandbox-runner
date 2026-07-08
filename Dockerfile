FROM node:20-bookworm

WORKDIR /app

RUN apt-get update \
  && apt-get install -y tor \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 8080

CMD sh -c "tor --SocksPort 127.0.0.1:9050 --DataDirectory /tmp/tor & node server.js"