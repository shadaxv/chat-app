import express, { urlencoded } from "express";
import cors from "cors";
import { createServer } from "http";
import WebSocket, { WebSocketServer } from "ws";
import { v4 as uuidv4 } from 'uuid';
// import { createClient } from "redis";

// const redisServer = process.env.REDIS_SERVER || "redis://localhost:6379";

// const redisClient = createClient(redisServer);
// redisClient.subscribe('app:mainChat');

const app = express();
const port = process.env.PORT || 3001;

const server = createServer();
const wss = new WebSocketServer({ server });
server.on("request", app);

app.use(urlencoded({ extended: true }));
app.use(cors());

app.get("/test", async (req, res) => {
  res.send(req.query);
});

wss.on("connection", (ws) => {
  const clientId = uuidv4();
  ws.clientId = clientId;

  ws.send(JSON.stringify({
    message: `Welcome to the Chat App! Your Client ID: ${clientId}`,
    sender: 'CHAT APP BOT',
    receiver: clientId,
    id: uuidv4(),
    date: new Date()
  }));

  ws.on("message", (payload) => {
    const { type, message, nickname } = JSON.parse(payload);

    if (message) {
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            message,
            sender: clientId,
            senderNikcname: ws.nickname,
            id: uuidv4(),
            date: new Date()
          }));
        }
      });
    }

    if (nickname) {
      ws.nickname = nickname;
    }
  });

  // redisClient.on('message', (channel, message) => {
  //   console.log({ channel, message });
  //   ws.send(message);
  // });
  return clientId;
});

server.listen(port, () => {
  console.log(`Simple Chat App listening at http://localhost:${port}`);
  console.log(`WebSocket listening at ws://localhost:${port}`);
});
