import { useEffect, useState, ChangeEvent, FormEvent, FC } from "react";

interface Messages {
  id: string;
  receiver?: string;
  sender: string;
  senderNikcname: string;
  message: string;
  date: string;
}

enum WebSocketStatus {
  Connected = "CONNECTED",
  Disconnected = "DISCONNECTED"
}

const Chat: FC = () => {
  const [messages, setMessages] = useState<Messages[]>([]);
  const [message, setMessage] = useState<string>("");
  const [nickname, setNickname] = useState<string>("");
  const [connected, setConnected] = useState<WebSocketStatus>(WebSocketStatus.Disconnected);
  const [clientId, setClientId] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!process.env.REACT_APP_WEBSOCKET) {
      return;
    }

    const newWs = new WebSocket(process.env.REACT_APP_WEBSOCKET);

    newWs.onopen = () => {
      setWs(newWs);
      setConnected(WebSocketStatus.Connected);
    };

    newWs.onclose = () => {
      if (mounted) {
        setWs(null);
        setConnected(WebSocketStatus.Disconnected);
      }
    };

    newWs.onmessage = (event) => {
      const newMessage = event.data && JSON.parse(event.data);

      if (newMessage) {
        if (newMessage.receiver) {
          setClientId(newMessage.receiver);
        }
        setMessages((oldMessages) => [...oldMessages, newMessage]);
      }
    };

    return () => {
      mounted = false;
      if (newWs) {
        newWs.close();
      }
    };
  }, []);

  useEffect(() => {
    if (ws) {
      ws.onmessage = (event) => {
        const newMessage = event.data && JSON.parse(event.data);

        if (newMessage) {
          if (newMessage.receiver) {
            setClientId(newMessage.receiver);
          } else if (newMessage.sender === clientId) {
            newMessage.sender = "You";
          }
          setMessages((oldMessages) => [...oldMessages, newMessage]);
        }
      };
    }
  }, [ws, clientId]);

  const handleChangeMessage = ({
    target: { value },
  }: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(value);
  };

  const handleSendMessage = (event: FormEvent) => {
    event.preventDefault();
    if (ws) {
      ws.send(
        JSON.stringify({
          type: "message",
          message,
        })
      );
      setMessage("");
    }
  };

  const handleChangeNickname = ({
    target: { value },
  }: ChangeEvent<HTMLInputElement>) => {
    setNickname(value);
  };

  const handleSubmitNickname = (event: FormEvent) => {
    event.preventDefault();
    if (ws) {
      ws.send(
        JSON.stringify({
          type: "nickname",
          nickname,
        })
      );
    }
  };

  return (
    <section id="chat" itemScope itemType="https://schema.org/Conversation">
      <h1>Chat</h1>
      <p title={connected}>Status: {connected}</p>
      <ul>
        {messages.map(({ id, sender, senderNikcname, message, date }) => (
          <li
            key={id}
            id={`#message-${id}`}
            itemScope
            itemProp="hasPart"
            itemType="https://schema.org/Message"
          >
            <a href={`#message-${id}`}>
              <time dateTime={date} itemProp="dateCreated">
                {date}
              </time>
            </a>
            <p itemProp="text">
              <b
                itemScope
                itemProp="sender"
                itemType="https://schema.org/Person"
              >
                {senderNikcname ? `${senderNikcname} (${sender})` : sender}:{" "}
              </b>
              {message}
            </p>
          </li>
        ))}
      </ul>
      <form onSubmit={handleSendMessage}>
        <h2>New Message</h2>
        <label htmlFor="message">
          Message
          <textarea onChange={handleChangeMessage} value={message} id="message" />
        </label>
        <button onClick={handleSendMessage} type="submit">
          Send message
        </button>
      </form>
      <form onSubmit={handleSubmitNickname}>
        <h2>Change Nickname</h2>
        <label htmlFor="nickname">
          Nickname
          <input onChange={handleChangeNickname} value={nickname} id="nickname" />
        </label>
        <button onClick={handleSubmitNickname} type="submit">
          Change nickname
        </button>
      </form>
    </section>
  );
};

export default Chat;
