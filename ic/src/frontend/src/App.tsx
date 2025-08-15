// AzleApp.tsx
// @ts-nocheck
import React, { useEffect, useState } from "react";
import { AuthClient } from '@dfinity/auth-client';
import Payment from "./Payment";
import Chat from "./Chat";
import './chat.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [authClient, setAuthClient] = useState(null);
  const [currentPage, setCurrentPage] = useState('chat');

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    const client = await AuthClient.create();
    setAuthClient(client);
    
    if (await client.isAuthenticated()) {
      const identity = client.getIdentity();
      // Set user data from identity
      setUser({ principal: identity.getPrincipal().toString() });
    }
  };

  const login = async () => {
    if (authClient) {
      await authClient.login({
        identityProvider: "https://identity.ic0.app",
        onSuccess: () => {
          const identity = authClient.getIdentity();
          setUser({ principal: identity.getPrincipal().toString() });
        },
      });
    }
  };

  const logout = async () => {
    if (authClient) {
      await authClient.logout();
      setUser(null);
      setCurrentPage('chat');
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'payment':
        return <Payment user={user} />;
      default:
        return <Chat user={user} />;
    }
  };

  return (
    <div className="App">
      {/* Navigation */}
      <nav className="app-nav">
        <div className="nav-brand">
          <h2>EventVerse</h2>
        </div>
        <div className="nav-links">
          <button 
            className={`nav-btn ${currentPage === 'chat' ? 'active' : ''}`}
            onClick={() => setCurrentPage('chat')}
          >
            AI Assistant
          </button>
          <button 
            className={`nav-btn ${currentPage === 'payment' ? 'active' : ''}`}
            onClick={() => setCurrentPage('payment')}
          >
            Payments
          </button>
        </div>
        <div className="nav-auth">
          {user ? (
            <div className="user-info">
              <span>Welcome!</span>
              <button className="logout-btn" onClick={logout}>
                Logout
              </button>
            </div>
          ) : (
            <button className="login-btn" onClick={login}>
              Login with Internet Identity
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}
