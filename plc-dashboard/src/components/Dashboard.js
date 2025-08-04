import React from 'react';
import { Link } from 'react-router-dom';
import { signOut } from 'aws-amplify/auth';

function Dashboard({ user }) {
  const handleSignOut = async () => {
    try {
      await signOut();
      // The App.js will handle redirecting to login
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const cardStyle = {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '30px',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'box-shadow 0.3s ease, transform 0.2s ease',
    textDecoration: 'none',
    color: 'inherit',
    minHeight: '200px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '40px',
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

      {/* Welcome Message */}
      <div style={{ 
        marginBottom: '40px',
        textAlign: 'center'
      }}>
        <h2 style={{ marginBottom: '10px' }}>Welcome to your PLC Dashboard</h2>
        <p style={{ color: '#666', fontSize: '16px' }}>
          Choose an option below to get started
        </p>
      </div>

      {/* Navigation Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '30px',
        marginBottom: '40px'
      }}>
        {/* Records Card */}
        <Link 
          to="/records" 
          style={cardStyle}
          onMouseEnter={(e) => {
            e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
            e.target.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📊</div>
          <h3 style={{ marginBottom: '15px', color: '#007bff' }}>View Records</h3>
          <p style={{ color: '#666', lineHeight: '1.5' }}>
            View, filter, and export data from your balers and compactors. 
            Monitor performance metrics and generate reports.
          </p>
        </Link>

        {/* Device Registration Card */}
        <Link 
          to="/register-device" 
          style={cardStyle}
          onMouseEnter={(e) => {
            e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
            e.target.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔧</div>
          <h3 style={{ marginBottom: '15px', color: '#28a745' }}>Register Device</h3>
          <p style={{ color: '#666', lineHeight: '1.5' }}>
            Add new balers or compactors to your account. 
            Configure device settings and location information.
          </p>
        </Link>

        {/* Account Settings Card */}
        <Link 
          to="/settings" 
          style={cardStyle}
          onMouseEnter={(e) => {
            e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
            e.target.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚙️</div>
          <h3 style={{ marginBottom: '15px', color: '#6c757d' }}>Account Settings</h3>
          <p style={{ color: '#666', lineHeight: '1.5' }}>
            Manage your account preferences, organization settings, 
            and location configurations.
          </p>
        </Link>
      </div>

      {/* Quick Stats Section (placeholder for future) */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginTop: '40px'
      }}>
        <h3 style={{ marginBottom: '15px' }}>Quick Overview</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>--</div>
            <div style={{ color: '#666' }}>Active Devices</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>--</div>
            <div style={{ color: '#666' }}>Total Records</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>--</div>
            <div style={{ color: '#666' }}>Locations</div>
          </div>
        </div>
        <p style={{ 
          marginTop: '15px', 
          color: '#666', 
          fontSize: '14px',
          textAlign: 'center'
        }}>
          Register devices to see statistics here
        </p>
      </div>
    </div>
  );
}

export default Dashboard;