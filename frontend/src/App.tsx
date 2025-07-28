import React from 'react';

function App() {
  return (
    <div className="App">
      <header style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
        <h1>RabbitMQ Web UI</h1>
        <p>Welcome to the RabbitMQ Management Interface</p>
      </header>
      <main style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2>Publisher</h2>
          <p>Send messages to RabbitMQ queues and exchanges.</p>
          <button style={{ padding: '10px 20px', marginRight: '10px' }}>
            Open Publisher
          </button>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <h2>Consumer</h2>
          <p>Consume messages from RabbitMQ queues in real-time.</p>
          <button style={{ padding: '10px 20px', marginRight: '10px' }}>
            Open Consumer
          </button>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <h2>Connections</h2>
          <p>Manage your RabbitMQ cluster connections.</p>
          <button style={{ padding: '10px 20px', marginRight: '10px' }}>
            Manage Connections
          </button>
        </div>
      </main>
      <footer style={{ padding: '20px', backgroundColor: '#f0f0f0', marginTop: '40px' }}>
        <p>RabbitMQ Web UI v1.0 - Ready for deployment</p>
        <p>Full functionality will be available once connected to backend API</p>
      </footer>
    </div>
  );
}

export default App;
