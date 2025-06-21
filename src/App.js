import React, { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001";

function App() {
  // Auth state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(localStorage.getItem("jwtToken") || "");
  // Chat state
  const [receiver, setReceiver] = useState("");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);

  // New socket per token
  const [socket, setSocket] = useState(null);

  // Establish socket when token changes
  useEffect(() => {
    if (!token) return;
    const s = io(API_BASE, { auth: { token } });
    setSocket(s);
    return () => s.disconnect();
  }, [token]);

  // Fetch chat history
  useEffect(() => {
    if (!token || !receiver) return;
    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${API_BASE}/messages/history`, {
          params: { user2: receiver },
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessages(res.data);
      } catch (err) {
        console.error("Fetch error:", err);
        alert("Failed to load chat history");
      }
    };
    fetchMessages();
    // Listen for real-time
    if (!socket) return;
    const handler = (msg) => {
      if (
        (msg.sender === email && msg.receiver === receiver) ||
        (msg.sender === receiver && msg.receiver === email)
      ) {
        setMessages((prev) => [...prev, msg]);
      }
    };
    socket.on("receive_message", handler);
    return () => {
      socket.off("receive_message", handler);
      setMessages([]); // clear when conversation changes
    };
    // eslint-disable-next-line
  }, [receiver, socket]);

  // Signup/login handlers
  const handleSignup = async () => {
    try {
      await axios.post(`${API_BASE}/signup`, { email, password });
      alert("Signup successful, now log in!");
    } catch (err) {
      alert(err.response?.data?.message || "Signup failed");
    }
  };
  const handleLogin = async () => {
    try {
      const res = await axios.post(`${API_BASE}/login`, { email, password });
      localStorage.setItem("jwtToken", res.data.token);
      setToken(res.data.token);
      alert("Login successful!");
    } catch (err) {
      alert(err.response?.data?.message || "Login failed");
    }
  };

  // Send a new message via Socket.IO
  const handleSend = (e) => {
    e.preventDefault();
    if (!receiver || !text.trim()) return;
    if (socket) {
      socket.emit("send_message", { receiver, text });
      setText("");
    }
  };

  // Logout
  const handleLogout = () => {
    setToken("");
    localStorage.removeItem("jwtToken");
    setMessages([]);
  };

  // UI
  if (!token) {
    return (
      <div style={{ padding: 20, maxWidth: 400, margin: "auto" }}>
        <h2>🔐 Login or Signup</h2>
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ marginBottom: 8, display: "block" }}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ marginBottom: 8, display: "block" }}
        />
        <button onClick={handleLogin} style={{ marginRight: 8 }}>Login</button>
        <button onClick={handleSignup}>Signup</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "auto", fontFamily: "Arial" }}>
      <h1>💬 Messenger App</h1>
      <button onClick={handleLogout} style={{ float: "right" }}>Logout</button>
      <div style={{ marginBottom: 16 }}>
        <b>Logged in as:</b> {email}
      </div>
      <div style={{ marginBottom: 16 }}>
        <input
          placeholder="Chat with (email)..."
          value={receiver}
          onChange={e => setReceiver(e.target.value)}
        />
      </div>
      <form onSubmit={handleSend} style={{ display: "flex", marginBottom: 24 }}>
        <input
          placeholder="Type a message"
          value={text}
          onChange={e => setText(e.target.value)}
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
