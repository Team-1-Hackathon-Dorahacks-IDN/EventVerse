import React, { useState, useEffect, useRef } from 'react';
import { backend } from '../../declarations/backend';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
  isError?: boolean;
}

interface ChatProps {
  user?: any; // Your existing user type from ICP auth
}

const Chat: React.FC<ChatProps> = ({ user }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userMessage, setUserMessage] = useState('');
  const [isResponseGenerating, setIsResponseGenerating] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Predefined responses for EventVerse
  const predefinedResponses = {
    'hello': 'Hello! Welcome to EventVerse. I can help you discover and manage events.',
    'events': 'I can help you find upcoming events, create new events, or manage your existing events.',
    'create event': 'To create an event, I\'ll need some details like the event name, date, location, and description.',
    'help': 'I\'m here to assist you with EventVerse! You can ask me about finding events, creating events, or managing your profile.',
    'payment': 'EventVerse supports secure payments through the Internet Computer Protocol for event tickets and services.',
  };

  const suggestions = [
    { text: 'Find events near me', icon: '📍' },
    { text: 'Create a new event', icon: '➕' },
    { text: 'View my events', icon: '📅' },
    { text: 'Help with payments', icon: '💳' }
  ];

  // Function to clean markdown formatting and extract plain URLs
  const cleanMarkdownResponse = (content: string): string => {
    // Remove markdown link syntax [text](url) and replace with just the URL
    content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2');
    
    // Remove markdown bold/italic syntax
    content = content.replace(/\*\*([^*]+)\*\*/g, '$1'); // **bold**
    content = content.replace(/\*([^*]+)\*/g, '$1'); // *italic*
    content = content.replace(/__([^_]+)__/g, '$1'); // __bold__
    content = content.replace(/_([^_]+)_/g, '$1'); // _italic_
    
    // Remove markdown headers
    content = content.replace(/^#{1,6}\s+/gm, '');
    
    return content.trim();
  };

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('chatTheme');
    if (savedTheme === 'light') {
      setIsLightMode(true);
      document.body.classList.add('light_mode');
    }
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // Close settings modal when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettingsModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const createMessage = (content: string, isUser: boolean, options?: Partial<Message>): Message => ({
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content,
    isUser,
    timestamp: new Date(),
    ...options
  });

  const addMessage = (message: Message) => {
    setMessages(prev => {
      // Check if the last message is identical (duplicate prevention)
      const lastMessage = prev[prev.length - 1];
      if (lastMessage && 
          lastMessage.content === message.content && 
          lastMessage.isUser === message.isUser &&
          !message.isLoading) {
        console.log("Duplicate message detected, skipping:", message.content);
        return prev;
      }
      return [...prev, message];
    });
  };

  const showTypingEffect = (text: string, messageId: string) => {
    const words = text.split(' ');
    let currentWordIndex = 0;

    const interval = setInterval(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: words.slice(0, currentWordIndex + 1).join(' '), isLoading: false }
          : msg
      ));

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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const rawMessage = data?.message || JSON.stringify(data);
      
      // Clean markdown formatting from the response
      return cleanMarkdownResponse(rawMessage);
    } catch (error) {
      console.error("Agent API error:", error);
      // Fallback to predefined responses if agent is not available
      return getPredefinedResponse(userInput);
    }
  };

  const handleSendMessage = async () => {
    if (!userMessage.trim() || isResponseGenerating) return;

    console.log("handleSendMessage called with:", userMessage);

    // Store the message to send to agent BEFORE clearing userMessage
    const messageToSend = userMessage.trim();
    
    const userMsg = createMessage(messageToSend, true);
    addMessage(userMsg);

    setIsResponseGenerating(true);
    setUserMessage('');

    // Add loading message
    const loadingMsg = createMessage('', false, { isLoading: true });
    addMessage(loadingMsg);

    try {
      // Call agent API
      console.log("Calling sendToAgent with:", messageToSend);
      const response = await sendToAgent(messageToSend);
      console.log("Agent response received:", response);
      
      // Update the loading message with the response instead of removing and adding new
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMsg.id 
          ? { ...msg, content: response, isLoading: false }
          : msg
      ));
      
      showTypingEffect(response, loadingMsg.id);
    } catch (error) {
      console.error("Failed to get response:", error);
      setMessages(prev => prev.filter(msg => msg.id !== loadingMsg.id));
      
      const errorMsg = createMessage("Sorry, I'm having trouble connecting to the agent. Please try again.", false, { isError: true });
      addMessage(errorMsg);
      setIsResponseGenerating(false);
    }
  };

  const handleSuggestionClick = async (suggestionText: string) => {
    if (isResponseGenerating) return;
    
    console.log("handleSuggestionClick called with:", suggestionText);
    
    // Directly call sendMessage with the suggestion text
    const userMsg = createMessage(suggestionText, true);
    addMessage(userMsg);

    setIsResponseGenerating(true);
    setUserMessage('');

    // Add loading message
    const loadingMsg = createMessage('', false, { isLoading: true });
    addMessage(loadingMsg);

    try {
      // Call agent API
      console.log("Calling sendToAgent with suggestion:", suggestionText);
      const response = await sendToAgent(suggestionText);
      console.log("Agent response received for suggestion:", response);
      
      // Update the loading message with the response instead of removing and adding new
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMsg.id 
          ? { ...msg, content: response, isLoading: false }
          : msg
      ));
      
      showTypingEffect(response, loadingMsg.id);
    } catch (error) {
      console.error("Failed to get response:", error);
      setMessages(prev => prev.filter(msg => msg.id !== loadingMsg.id));
      
      const errorMsg = createMessage("Sorry, I'm having trouble connecting to the agent. Please try again.", false, { isError: true });
      addMessage(errorMsg);
      setIsResponseGenerating(false);
    }
  };

  const toggleTheme = () => {
    setIsLightMode(!isLightMode);
    document.body.classList.toggle('light_mode');
    localStorage.setItem('chatTheme', !isLightMode ? 'light' : 'dark');
    setShowSettingsModal(false);
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleResourceSend = () => {
    // TODO: Implement resource sending functionality
    console.log("Resource send clicked");
    // For now, just show an alert
    alert("Resource send feature coming soon!");
  };

  const toggleSettingsModal = () => {
    setShowSettingsModal(!showSettingsModal);
  };

  return (
    <div className="chat-container">
      {/* Header */}
      {messages.length === 0 && (
        <header className="header">
          <div className="header-inner">
            <h1 className="title">Hello, {user?.name || 'there'}</h1>
            <p className="subtitle">How can I help you with EventVerse today?</p>
            <ul className="suggestion-list">
              {suggestions.map((suggestion, index) => (
                <li 
                  key={index} 
                  className="suggestion"
                  onClick={() => handleSuggestionClick(suggestion.text)}
                >
                  <p className="text">{suggestion.text}</p>
                  <span className="icon">{suggestion.icon}</span>
                </li>
              ))}
            </ul>
          </div>
        </header>
      )}

      {/* Chat Messages */}
      <div className={`chat-list ${messages.length > 0 ? 'has-messages' : ''}`} ref={chatContainerRef}>
        {messages.map((message) => (
          <div key={message.id} className={`message ${!message.isUser ? 'incoming' : ''} ${message.isLoading ? 'loading' : ''} ${message.isError ? 'error' : ''}`}>
            <div className="message-content">
              {!message.isUser && (
                <div className="avatar">
                  🤖
                </div>
              )}
              <p className="text">{message.content}</p>
              {!message.isUser && !message.isLoading && (
                <span 
                  className="icon material-symbols-rounded"
                  onClick={() => copyMessage(message.content)}
                  title="Copy message"
                >
                  content_copy
                </span>
              )}
              {message.isLoading && (
                <div className="loading-indicator">
                  <div className="loading-bar"></div>
                  <div className="loading-bar"></div>
                  <div className="loading-bar"></div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Typing Area */}
      <div className="typing-area">
        {/* Settings Button - Bottom Left */}
        <div className="settings-container" ref={settingsRef}>
          <button 
            className="settings-button"
            onClick={toggleSettingsModal}
            title="Settings"
          >
            <span className="material-symbols-rounded">settings</span>
          </button>
          
          {showSettingsModal && (
            <div className="settings-modal">
              <div className="settings-header">
                <h3>Settings</h3>
              </div>
              <div className="settings-content">
                <div className="setting-item" onClick={toggleTheme}>
                  <span className="setting-icon material-symbols-rounded">
                    {isLightMode ? 'dark_mode' : 'light_mode'}
                  </span>
                  <span className="setting-label">
                    {isLightMode ? 'Dark Mode' : 'Light Mode'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <form 
          className="typing-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <div className="input-wrapper">
            <input
              type="text"
              className="typing-input"
              placeholder="Enter a prompt here"
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              required
            />
          </div>
        </form>
        
        <p className="disclaimer-text">
          © {new Date().getFullYear()} EventVerse. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Chat;