import React, { useEffect, useState } from 'react';
import { Amplify, Auth } from 'aws-amplify';
import awsconfig from './aws-exports';

Amplify.configure(awsconfig);

function App() {
  const [records, setRecords] = useState([]);
  const [user, setUser] = useState(null);

  const fetchRecords = async () => {
    const session = await Auth.currentSession();
    const token = session.getIdToken().getJwtToken();

    const res = await fetch('https://behhevolhf.execute-api.us-east-1.amazonaws.com/prod/records', {
      headers: { Authorization: token }
    });
    const data = await res.json();
    setRecords(data);
  };

  useEffect(() => {
    Auth.currentAuthenticatedUser()
      .then(user => {
        setUser(user);
        fetchRecords();
      })
      .catch(() => {
        Auth.federatedSignIn(); // redirect to Cognito Hosted UI
      });
  }, []);

  return (
    <div>
      <h1>PLC Dashboard</h1>
      {user && <p>Welcome, {user.attributes.email}</p>}
      <ul>
        {records.map((r, i) => (
          <li key={i}>{JSON.stringify(r)}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
