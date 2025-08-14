// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

function Home() {
  const [chatMessage, setChatMessage] = useState(
    "What's the balance of address tb1qexample1234567890?"
  );
  const [messages, setMessages] = useState([]);
  const chatEndRef = useRef(null);

  async function sendChat() {
    if (!chatMessage.trim()) return;

    // Add user message to history
    setMessages((prev) => [...prev, { role: "user", text: chatMessage }]);

    try {
      const response = await fetch("http://0.0.0.0:8001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatMessage }),
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();

      // Add bot message to history
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: data?.message || JSON.stringify(data),
          status: data?.status || "success",
        },
      ]);
    } catch (error) {
      console.error("Failed to send chat:", error);
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Error sending chat", status: "error" },
      ]);
    }

    setChatMessage("");
  }

  // Scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function renderMessage(msg) {
    if (!msg) return null;
    // Convert markdown-style [link](url) and plain URLs to clickable <a>
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)|((https?:\/\/[^\s]+))/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(msg)) !== null) {
      if (match.index > lastIndex) {
        parts.push(msg.substring(lastIndex, match.index));
      }
      const url = match[2] || match[3];
      const label = match[1] || url;
      parts.push(
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#007bff" }}
        >
          {label}
        </a>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < msg.length) {
      parts.push(msg.substring(lastIndex));
    }

    return parts;
  }

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Halaman Utama</h1>
      <p>Selamat datang di halaman utama 🚀</p>
      <Link to="/payment">Ke halaman Payment</Link>

      {/* Chat Box */}
      <div
        style={{
          marginTop: "20px",
          border: "1px solid #ddd",
          borderRadius: "8px",
          height: "400px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "10px",
            backgroundColor: "#f9f9f9",
          }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                marginBottom: "8px",
              }}
            >
              <div
                style={{
                  maxWidth: "70%",
                  padding: "10px",
                  borderRadius: "10px",
                  backgroundColor:
                    m.role === "user"
                      ? "#007bff"
                      : m.status === "success"
                      ? "#e6ffed"
                      : "#ffe6e6",
                  color: m.role === "user" ? "#fff" : "#000",
                  whiteSpace: "pre-wrap",
                }}
              >
                {renderMessage(m.text)}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div
          style={{
            display: "flex",
            borderTop: "1px solid #ddd",
            padding: "10px",
            backgroundColor: "#fff",
          }}
        >
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            style={{
              flex: 1,
              padding: "8px",
              border: "1px solid #ccc",
              borderRadius: "5px",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendChat();
            }}
          />
          <button
            style={{
              marginLeft: "10px",
              padding: "8px 12px",
              backgroundColor: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
            onClick={sendChat}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
