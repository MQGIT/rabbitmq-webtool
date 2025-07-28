import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo" style={{ textDecoration: 'none', color: 'inherit' }}>
            <img
              src="https://www.rabbitmq.com/img/rabbitmq-logo-with-name.svg"
              alt="RabbitMQ"
            />
            <span>Web UI</span>
          </Link>
          <nav className="nav">
            <Link 
              to="/publisher" 
              className={`nav-link ${isActive('/publisher') ? 'active' : ''}`}
            >
              📤 Publisher
            </Link>
            <Link
              to="/consumer"
              className={`nav-link ${isActive('/consumer') ? 'active' : ''}`}
            >
              📥 Consumer
            </Link>
            <Link
              to="/browser"
              className={`nav-link ${isActive('/browser') ? 'active' : ''}`}
            >
              👁️ Browser
            </Link>
            <Link
              to="/connections"
              className={`nav-link ${isActive('/connections') ? 'active' : ''}`}
            >
              🔗 Connections
            </Link>
          </nav>
        </div>
      </header>
      <main className="main-content">
        {children}
      </main>
    </>
  );
};

export default Layout;
