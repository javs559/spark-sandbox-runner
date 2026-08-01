FROM node:20-bookworm

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends tor netcat-openbsd \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 8080

ENV TOR_REQUIRED=true
ENV SOCKS5_PROXY_URL=socks5h://127.0.0.1:9050

CMD ["sh", "-c", "tor --SocksPort 127.0.0.1:9050 --DataDirectory /tmp/tor & for i in $(seq 1 60); do nc -z 127.0.0.1 9050 && exec node server.js; sleep 1; done; echo 'Tor SOCKS port failed to start' >&2; exit 1"]
