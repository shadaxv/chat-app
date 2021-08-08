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
