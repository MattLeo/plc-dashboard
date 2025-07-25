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

  const timezone = () => {
    const date = new Date();
    const options = {timeZoneName: 'short'};

    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(date);

    const tzPart = parts.find(part => part.type === 'timeZoneName');
    return tzPart ? tzPart.value : 'N/A';
  };

  const columnMappings = {
    'timestamp': `Date & Time (${timezone})`,
    'machineType': 'Machine Type',
    'numStarts': 'Number of Starts',
    'cycles': 'Number of Cycles',
    'deviceId': 'Serial Number',
    'runtime': 'Runtime (HH:MM:SS)',
    'numBales': 'Bales Produced',
    'maxPressure': 'Max Pressure (PSI)',
    'lowMagSwitchFailed': 'Lower Mag Switch Failed',
    'upMagSwitchFailed': 'Upper Mag Switch Failed',
    'full': 'Full Bale Alert',
    'balerMode': 'Mode Setting'
  };

  const balerColumnOrder = [
    'timestamp',
    'machineType',
    'deviceId',
    'balerMode',
    'numStarts',
    'cycles',
    'runtime',
    'numBales',
    'maxPressure',
    'full',
    'lowMagSwitchFailed',
    'upMagSwitchFailed'
  ];

  const formatCellValue = (key, value) => {
    if (value === null || value === undefined) return 'N/A';

    switch (key) {
      case 'timestamp':
        try {
          const date = new Date(value);
          return date.toLocaleString();
        } catch {
          return value;
        }
      case 'maxPressure':
        return typeof value === 'number' ? `${value.toFixed(0)} PSI` : value;
      case 'machineType':
        return typeof value === 'string' 
        ? (value === 'B' ? 'Baler' : 'Compactor') 
        : value;
      case 'runtime':
        try{
          const time = value / 1000; //Added to account for time miscalc in the cycle Lambda
          const hrs = Math.floor(time / 3600);
          const min = Math.floor((time % 3600) / 60);
          const secs = time % 60;

          return [
            hrs.toString().padStart(2, '0'),
            min.toString().padStart(2, '0'),
            secs.toString().padStart(2, '0')
          ].join(':');
          
        } catch {
          return typeof value === 'object' ? JSON.stringify(value) : String(value);
        }
      default:
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
    }
  };

  const getFriendlyColumnName = (key) => {
    return columnMappings[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const getOrderedKeys = (record) => {
    const recordKeys = Object.keys(record);
    const orderedKeys = [];

    balerColumnOrder.forEach(key => {
      if (recordKeys.includes(key)) {
        orderedKeys.push(key);
      }
    });

    recordKeys.forEach(key => {
      if(!orderedKeys.includes(key)) {
        orderedKeys.push(key);
      }
    });

    return orderedKeys;
  }

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
          Authorization: `Bearer ${token}`,
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

  const orderedKeys = records.length > 0 ? getOrderedKeys(records[0]) : [];

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
                  {orderedKeys.map(key => (
                    <th key={key} style={{ 
                      padding: '12px',
                      textAlign: 'left',
                      borderBottom: '2px solid #dee2e6',
                      fontWeight: 'bold',
                      //whiteSpace: 'nowrap'
                    }}>
                      {getFriendlyColumnName(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr key={index} style={{ 
                    borderBottom: '1px solid #dee2e6',
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa'
                  }}>
                    {orderedKeys.map(key => (
                      <td key={key} style={{ 
                        padding: '12px',
                        verticalAlign: 'top'
                      }}>
                        {formatCellValue(key, record[key])}
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