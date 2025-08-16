// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
  isError?: boolean;
}

interface ChatProps {
  user?: any;
}

const Chat: React.FC<ChatProps> = ({ user }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userMessage, setUserMessage] = useState("");
  const [isResponseGenerating, setIsResponseGenerating] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const predefinedResponses = {
    hello:
      "Hello! Welcome to EventVerse. I can help you discover and manage events.",
    events:
      "I can help you find upcoming events, create new events, or manage your existing events.",
    "create event":
      "To create an event, I'll need some details like the event name, date, location, and description.",
    help: "I'm here to assist you with EventVerse! You can ask me about finding events, creating events, or managing your profile.",
    payment:
      "EventVerse supports secure payments through the Internet Computer Protocol for event tickets and services.",
  };

  const suggestions = [
    { text: "Find events near me", key: "events", icon: "📍" },
    { text: "Create a new event", key: "create event", icon: "➕" },
    { text: "View my events", key: "events", icon: "📅" },
    { text: "Help with payments", key: "payment", icon: "💳" },
  ];

  const cleanMarkdownResponse = (content: string) => {
    content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$2");
    content = content.replace(/\*\*([^*]+)\*\*/g, "$1");
    content = content.replace(/\*([^*]+)\*/g, "$1");
    content = content.replace(/__([^_]+)__/g, "$1");
    content = content.replace(/_([^_]+)_/g, "$1");
    content = content.replace(/^#{1,6}\s+/gm, "");
    return content.trim();
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("chatTheme");
    if (savedTheme === "light") {
      setIsLightMode(true);
      document.body.classList.add("light_mode");
    }
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setShowSettingsModal(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const createMessage = (
    content: string,
    isUser: boolean,
    options?: Partial<Message>
  ): Message => ({
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content,
    isUser,
    timestamp: new Date(),
    ...options,
  });

  const addMessage = (message: Message) => {
    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1];
      if (
        lastMessage &&
        lastMessage.content === message.content &&
        lastMessage.isUser === message.isUser &&
        !message.isLoading
      ) {
        console.log("Duplicate message detected, skipping:", message.content);
        return prev;
      }
      return [...prev, message];
    });
  };

  const showTypingEffect = (text: string, messageId: string) => {
    const words = text.split(" ");
    let currentWordIndex = 0;

    const interval = setInterval(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                content: words.slice(0, currentWordIndex + 1).join(" "),
                isLoading: false,
              }
            : msg
        )
      );

      currentWordIndex++;
      if (currentWordIndex >= words.length) {
        clearInterval(interval);
        setIsResponseGenerating(false);
      }
    }, 100);
  };

  const getPredefinedResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase();
    for (const [key, response] of Object.entries(predefinedResponses)) {
      if (lowerInput.includes(key)) {
        return response;
      }
    }
    return "I'm here to help with EventVerse! You can ask me about finding events, creating events, managing your profile, or making payments.";
  };

  const sendToAgent = async (userInput: string): Promise<string> => {
    try {
      const response = await fetch("http://0.0.0.0:8001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput }),
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const rawMessage = data?.message || JSON.stringify(data);
      return cleanMarkdownResponse(rawMessage);
    } catch (error) {
      console.error("Agent API error:", error);
      return getPredefinedResponse(userInput);
    }
  };

  const handleSendMessage = async () => {
    if (!userMessage.trim() || isResponseGenerating) return;

    const messageToSend = userMessage.trim();
    addMessage(createMessage(messageToSend, true));

    setIsResponseGenerating(true);
    setUserMessage("");

    const loadingMsg = createMessage("", false, { isLoading: true });
    addMessage(loadingMsg);

    try {
      const response = await sendToAgent(messageToSend);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMsg.id
            ? { ...msg, content: response, isLoading: false }
            : msg
        )
      );
      showTypingEffect(response, loadingMsg.id);
    } catch (error) {
      console.error("Failed to get response:", error);
      setMessages((prev) => prev.filter((msg) => msg.id !== loadingMsg.id));
      addMessage(
        createMessage(
          "Sorry, I'm having trouble connecting to the agent. Please try again.",
          false,
          { isError: true }
        )
      );
      setIsResponseGenerating(false);
    }
  };

  const handleSuggestionClick = async (
    suggestionText: string,
    key?: string
  ) => {
    if (isResponseGenerating) return;

    addMessage(createMessage(suggestionText, true));
    setIsResponseGenerating(true);
    setUserMessage("");

    const loadingMsg = createMessage("", false, { isLoading: true });
    addMessage(loadingMsg);

    try {
      let response: string;
      if (key && predefinedResponses[key]) {
        response = predefinedResponses[key];
      } else {
        response = await sendToAgent(suggestionText);
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMsg.id
            ? { ...msg, content: response, isLoading: false }
            : msg
        )
      );
      showTypingEffect(response, loadingMsg.id);
    } catch (error) {
      console.error("Failed to get response:", error);
      setMessages((prev) => prev.filter((msg) => msg.id !== loadingMsg.id));
      addMessage(
        createMessage(
          "Sorry, I'm having trouble connecting to the agent. Please try again.",
          false,
          { isError: true }
        )
      );
      setIsResponseGenerating(false);
    }
  };

  const toggleTheme = () => {
    setIsLightMode(!isLightMode);
    document.body.classList.toggle("light_mode");
    localStorage.setItem("chatTheme", !isLightMode ? "light" : "dark");
    setShowSettingsModal(false);
  };

  const copyMessage = (content: string) =>
    navigator.clipboard.writeText(content);

  const toggleSettingsModal = () => setShowSettingsModal(!showSettingsModal);

  return (
    <div
      className={`h-screen relative ${
        isLightMode ? "bg-white" : "bg-[#242424]"
      }`}
    >
      {messages.length === 0 && (
        <header className="flex flex-col items-center py-24 px-4 overflow-x-hidden">
          <div className="w-full max-w-3xl text-center">
            <h1 className="text-5xl font-medium bg-gradient-to-r from-blue-500 to-pink-400 bg-clip-text text-transparent">
              Hello, {user?.name || "there"}
            </h1>
            <p
              className={`${
                isLightMode ? "text-gray-500" : "text-[#828282]"
              } text-3xl font-medium mt-2`}
            >
              How can I help you with EventVerse today?
            </p>

            <ul className="flex gap-5 mt-24 overflow-x-auto snap-x scrollbar-hide">
              {suggestions.map((s, idx) => (
                <li
                  key={idx}
                  className={`flex flex-col items-end justify-between flex-shrink-0 w-56 p-5 rounded-lg cursor-pointer transition ${
                    isLightMode
                      ? "bg-gray-100 hover:bg-gray-200"
                      : "bg-[#383838] hover:bg-[#444]"
                  }`}
                  onClick={() => handleSuggestionClick(s.text, s.key)}
                >
                  <p
                    className={`${
                      isLightMode ? "text-gray-800" : "text-[#E3E3E3]"
                    }`}
                  >
                    {s.text}
                  </p>
                  <span
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      isLightMode
                        ? "bg-white text-gray-800"
                        : "bg-[#242424] text-[#E3E3E3]"
                    }`}
                  >
                    {s.icon}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </header>
      )}

      <div
        ref={chatContainerRef}
        className="overflow-y-auto max-h-[calc(100vh-160px)] px-4 py-8 flex flex-col gap-6 w-full max-w-3xl mx-auto"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${
              msg.isUser ? "justify-end" : "justify-start"
            } ${msg.isLoading ? "opacity-60" : ""}`}
          >
            {!msg.isUser && (
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center">
                🤖
              </div>
            )}

            <div
              className={`flex flex-col gap-2 max-w-[70%] ${
                msg.isUser ? "items-end" : "items-start"
              }`}
            >
              <p
                className={`${
                  msg.isError
                    ? "text-red-500"
                    : isLightMode
                    ? "text-gray-900"
                    : "text-[#E3E3E3]"
                } whitespace-pre-wrap`}
              >
                {msg.content}
              </p>

              {!msg.isUser && !msg.isLoading && (
                <span
                  className="material-symbols-rounded absolute right-0 top-0 cursor-pointer hover:bg-[#444] rounded-full p-1 transition"
                  onClick={() => copyMessage(msg.content)}
                  title="Copy message"
                >
                  content_copy
                </span>
              )}

              {msg.isLoading && (
                <div className="flex flex-col gap-2">
                  <div className="h-3 rounded bg-gradient-to-r from-blue-500 to-[#242424] animate-loading"></div>
                  <div className="h-3 rounded w-3/4 bg-gradient-to-r from-blue-500 to-[#242424] animate-loading"></div>
                  <div className="h-3 rounded bg-gradient-to-r from-blue-500 to-[#242424] animate-loading"></div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div
        className={`fixed bottom-0 left-0 w-full py-4 px-4 border-t ${
          isLightMode
            ? "bg-white border-gray-200"
            : "bg-[#242424] border-[#383838]"
        }`}
      >
        <div
          ref={settingsRef}
          className="absolute left-10 top-1/2 -translate-y-1/2"
        >
          <button
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow transition transform ${
              isLightMode
                ? "bg-gray-100 text-gray-800 hover:bg-gray-200"
                : "bg-[#383838] text-[#E3E3E3] hover:bg-[#444]"
            }`}
            onClick={toggleSettingsModal}
          >
            <span className="material-symbols-rounded">settings</span>
          </button>

          {showSettingsModal && (
            <div
              className={`absolute bottom-16 left-0 rounded-xl shadow-lg overflow-hidden border ${
                isLightMode
                  ? "bg-white border-gray-200"
                  : "bg-[#242424] border-[#383838]"
              }`}
            >
              <div className="px-4 py-2 border-b">
                <h3
                  className={`${
                    isLightMode ? "text-gray-900" : "text-[#E3E3E3]"
                  } text-base font-medium`}
                >
                  Settings
                </h3>
              </div>
              <div className="flex flex-col">
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#444] transition"
                  onClick={toggleTheme}
                >
                  <span className="material-symbols-rounded">
                    {isLightMode ? "dark_mode" : "light_mode"}
                  </span>
                  <span className="text-white">
                    {isLightMode ? "Dark Mode" : "Light Mode"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <form
          className="flex gap-3 max-w-3xl mx-auto relative"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <input
            type="text"
            placeholder="Enter a prompt here"
            className={`flex-1 h-14 px-6 rounded-full focus:outline-none ${
              isLightMode
                ? "bg-gray-100 text-gray-900 placeholder-gray-400"
                : "bg-[#383838] text-[#E3E3E3] placeholder-[#A6A6A6]"
            }`}
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            required
          />
        </form>

        <p
          className={`text-sm mt-2 text-center ${
            isLightMode ? "text-gray-500" : "text-[#828282]"
          }`}
        >
          © {new Date().getFullYear()} EventVerse. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Chat;
