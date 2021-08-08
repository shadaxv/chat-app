import express, { urlencoded } from "express";
import cors from "cors";
import { createServer } from "http";
import WebSocket, { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "redis";
import { promisify } from "util";

const redisClient = createClient({
  host: process.env.REDIS_SERVER || "chat_cache",
  port: process.env.REDIS_PORT || 6379,
});

const RPUSH = promisify(redisClient.RPUSH).bind(redisClient);
const LPOP = promisify(redisClient.LPOP).bind(redisClient);
const LLEN = promisify(redisClient.LLEN).bind(redisClient);
const LRANGE = promisify(redisClient.LRANGE).bind(redisClient);
const pushWithLimit = async (key, value) => {
  await RPUSH(key, value);

  const cacheLength = await LLEN("main-chat");
  if (cacheLength > 100) {
    for (let i = 0; i < cacheLength - 100; i++) {
      LPOP("main-chat");
    }
  }
};

const app = express();
const port = process.env.PORT || 3001;

const server = createServer();
const wss = new WebSocketServer({ server });
server.on("request", app);

app.use(urlencoded({ extended: true }));
app.use(cors());

app.get("/message-history", async (req, res) => {
  res.send(req.query);
});

wss.on("connection", async (ws) => {
  const clientId = uuidv4();
  ws.clientId = clientId;

  ws.send(
    JSON.stringify({
      message: `Welcome to the Chat App! Your Client ID: ${clientId}`,
      sender: "CHAT APP BOT",
      receiver: clientId,
      id: uuidv4(),
      date: new Date(),
    })
  );

  const oldMessages = await LRANGE("main-chat", 0, -1);

  oldMessages.forEach((oldMessage) => {
    ws.send(oldMessage);
  });

  const connectionMessagePayload = JSON.stringify({
    message: "Joined the chatroom!",
    sender: clientId,
    id: uuidv4(),
    date: new Date(),
  });

  await pushWithLimit("main-chat", connectionMessagePayload);

  wss.clients.forEach((client) => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(connectionMessagePayload);
    }
  });

  ws.on("close", async () => {
    const messagePayload = JSON.stringify({
      message: "Left the chat room!",
      sender: clientId,
      senderNickname: ws.nickname,
      id: uuidv4(),
      date: new Date(),
    });

    await pushWithLimit("main-chat", messagePayload);

    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(messagePayload);
      }
    });
  });

  ws.on("message", async (payload) => {
    const { type, message, nickname } = JSON.parse(payload);

    if (type === "message") {
      const messagePayload = JSON.stringify({
        message,
        sender: clientId,
        senderNickname: ws.nickname,
        id: uuidv4(),
        date: new Date(),
      });

      await pushWithLimit("main-chat", messagePayload);

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messagePayload);
        }
      });
    }

    if (type === "nickname") {
      ws.nickname = nickname;

      const messagePayload = JSON.stringify({
        message: `My new name is ${nickname}`,
        sender: clientId,
        senderNickname: nickname,
        id: uuidv4(),
        date: new Date(),
      });

      await pushWithLimit("main-chat", messagePayload);

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messagePayload);
        }
      });
    }
  });

  return clientId;
});

server.listen(port, () => {
  console.log(`Simple Chat App listening at http://localhost:${port}`);
  console.log(`WebSocket listening at ws://localhost:${port}`);
});
