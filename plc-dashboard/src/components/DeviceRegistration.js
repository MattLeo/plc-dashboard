import React from 'react';
import { Link } from 'react-router-dom';
import { signOut } from 'aws-amplify/auth';

function DeviceRegistration({ user }) {
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px',
        borderBottom: '2px solid #eee',
        paddingBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link 
            to="/" 
            style={{ 
              textDecoration: 'none', 
              color: '#007bff',
              fontSize: '16px'
            }}
          >
            ← Back to Dashboard
          </Link>
          <h1>Device Registration</h1>
        </div>
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

      {/* Content */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '40px',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <h2>Device Registration Coming Soon</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          This page will allow you to register new balers and compactors to your account.
        </p>
        <p style={{ color: '#666' }}>
          Features will include:
        </p>
        <ul style={{ 
          listStyle: 'none', 
          padding: 0, 
          color: '#666',
          lineHeight: '2'
        }}>
          <li>• Device serial number registration</li>
          <li>• Location/store assignment</li>
          <li>• Device nickname and settings</li>
          <li>• QR code scanning support</li>
        </ul>
      </div>
    </div>
  );
}

export { DeviceRegistration };