import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Publisher from './pages/Publisher';
import Consumer from './pages/Consumer';
import Browser from './pages/Browser';
import Connections from './pages/Connections';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/publisher" replace />} />
            <Route path="/publisher" element={<Publisher />} />
            <Route path="/consumer" element={<Consumer />} />
            <Route path="/browser" element={<Browser />} />
            <Route path="/connections" element={<Connections />} />
          </Routes>
        </Layout>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;
