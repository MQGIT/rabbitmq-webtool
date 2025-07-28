import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { ConnectionState, RabbitMQConnection, ClusterDiscovery } from '../types';
import { connectionApi, discoveryApi } from '../services/api';
import toast from 'react-hot-toast';

interface ConnectionContextType {
  state: ConnectionState;
  selectConnection: (connection: RabbitMQConnection) => void;
  loadConnections: () => Promise<void>;
  loadDiscovery: (connectionId: number) => Promise<void>;
  clearError: () => void;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

type ConnectionAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTIONS'; payload: RabbitMQConnection[] }
  | { type: 'SELECT_CONNECTION'; payload: RabbitMQConnection | null }
  | { type: 'SET_DISCOVERY'; payload: ClusterDiscovery | null };

const initialState: ConnectionState = {
  selectedConnection: null,
  connections: [],
  discovery: null,
  isLoading: false,
  error: null,
};

function connectionReducer(state: ConnectionState, action: ConnectionAction): ConnectionState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_CONNECTIONS':
      return { ...state, connections: action.payload };
    case 'SELECT_CONNECTION':
      return { ...state, selectedConnection: action.payload, discovery: null };
    case 'SET_DISCOVERY':
      return { ...state, discovery: action.payload };
    default:
      return state;
  }
}

export function ConnectionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(connectionReducer, initialState);

  const selectConnection = (connection: RabbitMQConnection) => {
    dispatch({ type: 'SELECT_CONNECTION', payload: connection });
    // Auto-load discovery when connection is selected
    if (connection) {
      loadDiscovery(connection.id);
    }
  };

  const loadConnections = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const connections = await connectionApi.getConnections();
      dispatch({ type: 'SET_CONNECTIONS', payload: connections });
      
      // Auto-select first connection if none selected
      if (!state.selectedConnection && connections.length > 0) {
        selectConnection(connections[0]);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to load connections';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loadDiscovery = async (connectionId: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const discovery = await discoveryApi.discoverCluster(connectionId);
      dispatch({ type: 'SET_DISCOVERY', payload: discovery });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to discover cluster';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  // Load connections on mount
  useEffect(() => {
    loadConnections();
  }, []);

  const value: ConnectionContextType = {
    state,
    selectConnection,
    loadConnections,
    loadDiscovery,
    clearError,
  };

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
}
