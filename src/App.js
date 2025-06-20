import React, { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";

// Initialize Socket.IO client
const socket = io("http://localhost:3001");

function App() {
  const [sender, setSender] = useState("");
  const [receiver, setReceiver] = useState("");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);

  // Seed chat history once when sender/receiver change
  useEffect(() => {
    const fetchMessages = async () => {
      if (!sender || !receiver) return;
      try {
        const res = await axios.get("http://localhost:3001/messages/history", {
          params: { user1: sender, user2: receiver },
        });
        setMessages(res.data);
      } catch (err) {
        console.error("Fetch error:", err);
        alert("Failed to load chat history");
      }
    };

    fetchMessages();

    // Subscribe to real-time updates
    const handler = (msg) => {
      if (
        (msg.sender === sender && msg.receiver === receiver) ||
        (msg.sender === receiver && msg.receiver === sender)
      ) {
        setMessages((prev) => [...prev, msg]);
      }
    };
    socket.on("receive_message", handler);

    return () => {
      socket.off("receive_message", handler);
      setMessages([]); // clear when conversation changes
    };
  }, [sender, receiver]);

  // Send a new message via Socket.IO
  const handleSend = (e) => {
    e.preventDefault();
    if (!sender || !receiver || !text.trim()) return;

    const payload = { sender, receiver, text };
    socket.emit("send_message", payload);
    setText("");
    // no fetchMessages() here—socket listener will append it once the server echoes it
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "auto", fontFamily: "Arial" }}>
      <h1>💬 Messenger App</h1>

      <div style={{ marginBottom: 16 }}>
        <input
          placeholder="Your name"
          value={sender}
          onChange={(e) => setSender(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <input
          placeholder="Chat with..."
          value={receiver}
          onChange={(e) => setReceiver(e.target.value)}
        />
      </div>

      <form onSubmit={handleSend} style={{ display: "flex", marginBottom: 24 }}>
        <input
          placeholder="Type a message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ flex: 1, marginRight: 8 }}
        />
        <button type="submit">Send</button>
      </form>

      <div>
        <h3>Chat History</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {messages.map((msg, i) => (
            <li key={i} style={{ marginBottom: 8 }}>
              <strong>{msg.sender}:</strong> {msg.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
