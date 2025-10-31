import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

function ChatDemoContent() {
  const { login, user, isAuthenticated } = useAuth();

  useEffect(() => {
    // Auto-login with demo user for testing
    if (!isAuthenticated) {
      login({
        id: 'demo-user-123',
        name: 'Demo User',
        email: 'demo@example.com',
        avatar: 'https://via.placeholder.com/40/667eea/ffffff?text=DU'
      });
    }
  }, [isAuthenticated, login]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            🚀 Robust Chat System Demo
          </h1>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-3">✅ Features Implemented</h2>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Loop-free architecture with stable hooks
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Database schema validation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Performance monitoring & circuit breakers
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Comprehensive error handling
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Facebook-like UI with animations
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Optimistic UI updates
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Typing indicators
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Message status indicators
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Unread count badges
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Connection status monitoring
                </li>
              </ul>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-3">🎯 How to Test</h2>
              <ol className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="font-semibold text-blue-600">1.</span>
                  Look for the chat bubble in the bottom-right corner
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-blue-600">2.</span>
                  Click to open the chat widget
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-blue-600">3.</span>
                  Type a message and press Enter to send
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-blue-600">4.</span>
                  Watch for optimistic UI updates
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-blue-600">5.</span>
                  Try minimizing/expanding the chat
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-blue-600">6.</span>
                  Check browser console for performance logs
                </li>
              </ol>
            </div>
          </div>
          
          {user && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Current User</h3>
              <div className="flex items-center gap-3">
                <img 
                  src={user.avatar} 
                  alt={user.name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <p className="text-xs text-gray-500">ID: {user.id}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">🔧 Technical Implementation</h2>
          
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Backend</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Schema validation utilities</li>
                <li>• Performance monitoring</li>
                <li>• Circuit breaker patterns</li>
                <li>• Error handling framework</li>
                <li>• Comprehensive logging</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Frontend</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Stable chat hooks</li>
                <li>• State management</li>
                <li>• Loop-free architecture</li>
                <li>• Optimistic updates</li>
                <li>• React.memo optimization</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Database</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Verified schema columns</li>
                <li>• No foreign key constraints</li>
                <li>• Performance indexes</li>
                <li>• RLS policies</li>
                <li>• Migration tested</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChatDemo() {
  return (
    <AuthProvider>
      <ChatDemoContent />
    </AuthProvider>
  );
}