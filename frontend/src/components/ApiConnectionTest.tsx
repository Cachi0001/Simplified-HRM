import React, { useState, useEffect } from 'react';
import api from '../lib/api';

const ApiConnectionTest: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<string>('Loading...');
  const [corsStatus, setCorsStatus] = useState<string>('Loading...');
  const [signupStatus, setSignupStatus] = useState<string>('Not tested');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Test health endpoint on component mount
    testHealthEndpoint();
    testCorsEndpoint();
  }, []);

  const testHealthEndpoint = async () => {
    try {
      setHealthStatus('Testing...');
      const response = await api.get('/health');
      setHealthStatus(`Success: ${response.data.status} - ${response.data.message}`);
    } catch (error: any) {
      console.error('Health endpoint error:', error);
      setHealthStatus(`Error: ${error.message}`);
    }
  };

  const testCorsEndpoint = async () => {
    try {
      setCorsStatus('Testing...');
      const response = await api.get('/cors-test');
      setCorsStatus(`Success: ${response.data.status} - ${response.data.message}`);
    } catch (error: any) {
      console.error('CORS endpoint error:', error);
      setCorsStatus(`Error: ${error.message}`);
    }
  };

  const testSignupEndpoint = async () => {
    try {
      setIsLoading(true);
      setSignupStatus('Testing...');
      setError(null);
      
      // Generate a random email to avoid duplicate user errors
      const randomEmail = `test${Math.floor(Math.random() * 10000)}@example.com`;
      
      const response = await api.post('/auth/signup', {
        email: randomEmail,
        password: 'Password123!',
        fullName: 'Test User'
      });
      
      setSignupStatus(`Success: ${response.data.status} - ${response.data.message}`);
    } catch (error: any) {
      console.error('Signup endpoint error:', error);
      setSignupStatus(`Error: ${error.message}`);
      setError(JSON.stringify(error.response?.data || error.message, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '20px auto', 
      padding: '20px', 
      border: '1px solid #ccc', 
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>API Connection Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Health Endpoint</h3>
        <p><strong>Status:</strong> {healthStatus}</p>
        <button 
          onClick={testHealthEndpoint}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test Health Endpoint
        </button>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>CORS Test Endpoint</h3>
        <p><strong>Status:</strong> {corsStatus}</p>
        <button 
          onClick={testCorsEndpoint}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test CORS Endpoint
        </button>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Signup Endpoint</h3>
        <p><strong>Status:</strong> {signupStatus}</p>
        <button 
          onClick={testSignupEndpoint}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? 'Testing...' : 'Test Signup Endpoint'}
        </button>
      </div>
      
      {error && (
        <div style={{ 
          marginTop: '20px', 
          padding: '10px', 
          backgroundColor: '#ffebee', 
          border: '1px solid #ffcdd2',
          borderRadius: '4px'
        }}>
          <h3>Error Details</h3>
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-word',
            backgroundColor: '#f8f8f8',
            padding: '10px',
            borderRadius: '4px',
            maxHeight: '300px',
            overflow: 'auto'
          }}>
            {error}
          </pre>
        </div>
      )}
      
      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        backgroundColor: '#e8f5e9', 
        border: '1px solid #c8e6c9',
        borderRadius: '4px'
      }}>
        <h3>API Configuration</h3>
        <p><strong>Base URL:</strong> {api.defaults.baseURL}</p>
        <p><strong>Origin:</strong> {typeof window !== 'undefined' ? window.location.origin : 'Not available'}</p>
        <p><strong>Headers:</strong></p>
        <pre style={{ 
          whiteSpace: 'pre-wrap', 
          wordBreak: 'break-word',
          backgroundColor: '#f8f8f8',
          padding: '10px',
          borderRadius: '4px'
        }}>
          {JSON.stringify(api.defaults.headers, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default ApiConnectionTest;