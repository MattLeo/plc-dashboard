import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import { getCurrentUser, signInWithRedirect } from 'aws-amplify/auth';
import awsconfig from './aws-exports';

// Import your page components
import Dashboard from './components/Dashboard';
import RecordsPage from './components/RecordsPage';
import DeviceRegistration from './components/DeviceRegistration';
import AccountSettings from './components/AccountSettings';

Amplify.configure(awsconfig);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then(user => {
        setUser(user);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        signInWithRedirect();
      });
  }, []);

  // Loading state
  if (loading) {
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

  // Authenticated - show router
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard user={user} />} />
        <Route path="/records" element={<RecordsPage user={user} />} />
        <Route path="/register-device" element={<DeviceRegistration user={user} />} />
        <Route path="/settings" element={<AccountSettings user={user} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;