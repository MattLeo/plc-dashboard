import React, { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { getCurrentUser, signInWithRedirect, fetchAuthSession, signOut } from 'aws-amplify/auth';
import awsconfig from './aws-exports';

Amplify.configure(awsconfig);

function App() {
  const [records, setRecords] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      if (!token) {
        throw new Error('No authentication token');
      }

      const res = await fetch('https://behhevolhf.execute-api.us-east-1.amazonaws.com/prod/records', {
        headers: { 
          Authorization: token,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching records:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      setRecords([]);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    getCurrentUser()
      .then(user => {
        setUser(user);
        fetchRecords();
      })
      .catch(() => {
        setLoading(false);
        signInWithRedirect();
      });
  }, []);

  // Loading state
  if (loading && !user) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>PLC Dashboard</h1>
        <p>Loading...</p>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>PLC Dashboard</h1>
        <p>Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px',
        borderBottom: '2px solid #eee',
        paddingBottom: '20px'
      }}>
        <h1>PLC Dashboard</h1>
        <div>
          <span style={{ marginRight: '20px' }}>
            Welcome, {user.signInDetails?.loginId || user.username}
          </span>
          <button 
            onClick={handleSignOut}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Refresh Button */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={fetchRecords}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Loading...' : 'Refresh Data'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ 
          padding: '15px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          Error: {error}
        </div>
      )}

      {/* Records Table */}
      <div>
        <h2>Records ({records.length})</h2>
        {records.length === 0 ? (
          <p>No records found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  {/* Dynamically create headers based on first record */}
                  {records[0] && Object.keys(records[0]).map(key => (
                    <th key={key} style={{ 
                      padding: '12px',
                      textAlign: 'left',
                      borderBottom: '2px solid #dee2e6',
                      fontWeight: 'bold'
                    }}>
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr key={index} style={{ 
                    borderBottom: '1px solid #dee2e6',
                    '&:hover': { backgroundColor: '#f8f9fa' }
                  }}>
                    {Object.values(record).map((value, i) => (
                      <td key={i} style={{ 
                        padding: '12px',
                        verticalAlign: 'top'
                      }}>
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;