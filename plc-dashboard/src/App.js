import React, { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { getCurrentUser, signInWithRedirect, fetchAuthSession } from 'aws-amplify/auth';
import awsconfig from './aws-exports';

Amplify.configure(awsconfig);

function App() {
  const [records, setRecords] = useState([]);
  const [user, setUser] = useState(null);

  const fetchRecords = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      if (!token) {
        throw new Error('No authentication token');
      }

      const res = await fetch('https://behhevolhf.execute-api.us-east-1.amazonaws.com/prod/records', {
        headers: { Authorization: token }
      });
      const data = await res.json();
      setRecords(data);
    } catch (error) {
      console.error('Error fetching records:', error);
    }
  };

  useEffect(() => {
    getCurrentUser()
      .then(user => {
        setUser(user);
        fetchRecords();
      })
      .catch(() => {
        // Redirect to Cognito Hosted UI
        signInWithRedirect();
      });
  }, []);

  return (
    <div>
      <h1>PLC Dashboard</h1>
      {user && <p>Welcome, {user.signInDetails?.loginId || user.username}</p>}
      <ul>
        {records.map((r, i) => (
          <li key={i}>{JSON.stringify(r)}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;