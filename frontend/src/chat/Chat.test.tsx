import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WS from "jest-websocket-mock";

import Chat from "./Chat";

test("renders Chat component", () => {
  render(<Chat />);
  const chatTitle = screen.getByRole("heading", { level: 1, name: /chat/i });
  const newMessageTitle = screen.getByRole("heading", {
    level: 2,
    name: /new message/i,
  });
  const changeNicknameTitle = screen.getByRole("heading", {
    level: 2,
    name: /change nickname/i,
  });
  const sendMessageButton = screen.getByRole("button", {
    name: /send message/i,
  });
  const changeNicknameButton = screen.getByRole("button", {
    name: /change nickname/i,
  });
  const messageInput = screen.getByRole("textbox", { name: /message/i });
  const nicknameInput = screen.getByRole("textbox", { name: /nickname/i });

  expect(chatTitle).toBeInTheDocument();
  expect(newMessageTitle).toBeInTheDocument();
  expect(changeNicknameTitle).toBeInTheDocument();
  expect(sendMessageButton).toBeInTheDocument();
  expect(changeNicknameButton).toBeInTheDocument();
  expect(messageInput).toBeInTheDocument();
  expect(nicknameInput).toBeInTheDocument();
});

if (process.env.REACT_APP_RUN_INTEGRATION_TESTS === "true") {
  describe("tests with WebSocket connection", () => {
    test("get a welcome message", async () => {
      render(<Chat />);
      const welcomeTest = "Welcome to the Chat App!";

      await screen.findByTitle("CONNECTED");

      const welcomeMessage = (await screen.findAllByRole("listitem")).find(
        (entry) => entry.textContent?.includes(welcomeTest)
      );

      expect(welcomeMessage).toBeInTheDocument();
    });

    test("send a message", async () => {
      render(<Chat />);
      const testText = "Test Message";

      await screen.findByTitle("CONNECTED");

      const messageInput = screen.getByRole("textbox", { name: /message/i });
      const sendMessageButton = screen.getByRole("button", {
        name: /send message/i,
      });
      userEvent.type(messageInput, testText);
      userEvent.click(sendMessageButton);

      const testMessage = await screen.findByText(testText);

      expect(testMessage).toBeInTheDocument();
    });

    test("change a nickname", async () => {
      render(<Chat />);
      const testNickname = "Super Nickname";

      await screen.findByTitle("CONNECTED");

      const nicknameInput = screen.getByRole("textbox", { name: /nickname/i });
      const changeNicknameButton = screen.getByRole("button", {
        name: /change nickname/i,
      });
      userEvent.type(nicknameInput, testNickname);
      userEvent.click(changeNicknameButton);

      const testMessage = await screen.findByText(`My new name is ${testNickname}`);

      expect(testMessage).toBeInTheDocument();
    });

    test("someone joined the chat", async () => {
      render(<Chat />);

      await screen.findByTitle("CONNECTED");

      expect(process.env.REACT_APP_WEBSOCKET).toBeTruthy();

      const newWs = new WebSocket(process.env.REACT_APP_WEBSOCKET || "");

      const connectMessage = await screen.findByText("Joined the chatroom!");

      expect(connectMessage).toBeInTheDocument();

      newWs.close();

      // will return an error due to caching on the backend
      const disconnectMessage = await screen.findByText("Left the chat room!");

      expect(disconnectMessage).toBeInTheDocument();
    });
  });
}

describe("tests with mocked WebSocket connection", () => {
  let wss: WS;
  beforeEach(() => {
    if (process.env.REACT_APP_WEBSOCKET) {
      wss = new WS(process.env.REACT_APP_WEBSOCKET);
    }
  });

  afterEach(() => {
    WS.clean();
  });

  test("check connection", async () => {
    render(<Chat />);

    await wss.connected;

    expect(screen.getByTitle("CONNECTED")).toBeInTheDocument();

    wss.close();

    expect(screen.getByTitle("DISCONNECTED")).toBeInTheDocument();
  });

  test("send a message", async () => {
    render(<Chat />);

    await wss.connected;

    const messageInput = screen.getByRole("textbox", { name: /message/i });
    const sendMessageButton = screen.getByRole("button", {
      name: /send message/i,
    });
    userEvent.type(messageInput, "Test Message");
    userEvent.click(sendMessageButton);

    await expect(wss).toReceiveMessage(
      JSON.stringify({
        type: "message",
        message: "Test Message",
      })
    );
  });
});
