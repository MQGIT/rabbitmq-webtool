import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useConnection } from '../context/ConnectionContext';
import { 
  Send, 
  Download, 
  Settings, 
  Activity,
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { state } = useConnection();

  const navigation = [
    { name: 'Publisher', href: '/publisher', icon: Send },
    { name: 'Consumer', href: '/consumer', icon: Download },
    { name: 'Connections', href: '/connections', icon: Settings },
  ];

  const getConnectionStatus = () => {
    if (state.isLoading) {
      return { icon: Loader, color: 'text-blue-500', text: 'Loading...' };
    }
    if (state.error) {
      return { icon: AlertCircle, color: 'text-red-500', text: 'Error' };
    }
    if (state.selectedConnection) {
      return { icon: CheckCircle, color: 'text-green-500', text: state.selectedConnection.name };
    }
    return { icon: AlertCircle, color: 'text-gray-500', text: 'No connection' };
  };

  const status = getConnectionStatus();
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-primary-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                RabbitMQ Web UI
              </h1>
            </div>

            {/* Navigation */}
            <nav className="flex space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Connection Status */}
            <div className="flex items-center">
              <StatusIcon className={`h-4 w-4 mr-2 ${status.color}`} />
              <span className="text-sm text-gray-700">{status.text}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>
              RabbitMQ Web UI v1.0.0
            </div>
            <div className="flex items-center space-x-4">
              {state.discovery && (
                <>
                  <span>Queues: {state.discovery.queues.length}</span>
                  <span>Exchanges: {state.discovery.exchanges.length}</span>
                  <span>VHosts: {state.discovery.vhosts.length}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
