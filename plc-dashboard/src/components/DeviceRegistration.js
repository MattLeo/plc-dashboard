import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { signOut, fetchAuthSession } from 'aws-amplify/auth';

function DeviceRegistration({ user }) {
  const [devices, setDevices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    deviceId: '',
    locationId: '',
    deviceName: '',
    isActive: true
  });

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getAuthHeaders = useCallback(async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      if (!token) {
        throw new Error('No authentication token');
      }

      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
    } catch (error) {
      console.error('Error getting auth token:', error);
      throw error;
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch('/prod/locations', {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch locations: ${response.status}`);
      }

      const data = await response.json();
      setLocations(data.locations || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }
  }, [getAuthHeaders]);

  const fetchDevices = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch('/prod/devices', {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch devices: ${response.status}`);
      }

      const data = await response.json();
      setDevices(data.devices || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
      throw error;
    }
  }, [getAuthHeaders]);

  // Fetch locations and devices on component mount
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchLocations(), fetchDevices()]);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [fetchLocations, fetchDevices]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.deviceId || !formData.locationId) {
      setError('Device ID and Location are required');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage('');

    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch('/prod/devices/register', {
        method: 'POST',
        headers,
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Registration failed: ${response.status}`);
      }

      setSuccessMessage('Device registered successfully!');
      setFormData({
        deviceId: '',
        locationId: '',
        deviceName: '',
        isActive: true
      });
      setShowForm(false);
      
      // Refresh devices list
      await fetchDevices();

    } catch (error) {
      console.error('Error registering device:', error);
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDeviceStatus = useCallback(async (deviceId, currentStatus) => {
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`/prod/devices/${deviceId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update device');
      }

      await fetchDevices(); // Refresh the list
      setSuccessMessage(`Device ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      setError(error.message);
    }
  }, [getAuthHeaders, fetchDevices]);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Loading...</h1>
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
          <h1>Device Management</h1>
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

      {/* Success/Error Messages */}
      {successMessage && (
        <div style={{
          padding: '15px',
          backgroundColor: '#d4edda',
          color: '#155724',
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {successMessage}
        </div>
      )}

      {error && (
        <div style={{
          padding: '15px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {/* Register New Device Button */}
      <div style={{ marginBottom: '30px' }}>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '12px 24px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {showForm ? 'Cancel Registration' : '+ Register New Device'}
        </button>
      </div>

      {/* Registration Form */}
      {showForm && (
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <h3>Register New Device</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Device Serial Number *
              </label>
              <input
                type="text"
                name="deviceId"
                value={formData.deviceId}
                onChange={handleInputChange}
                placeholder="Enter device serial number"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Location *
              </label>
              <select
                name="locationId"
                value={formData.locationId}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
                required
              >
                <option value="">Select a location</option>
                {locations.map(location => (
                  <option key={location.location_id} value={location.location_id}>
                    Store {location.store_number} - {location.location_name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Device Name (Optional)
              </label>
              <input
                type="text"
                name="deviceName"
                value={formData.deviceName}
                onChange={handleInputChange}
                placeholder="Enter device nickname"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                />
                <span>Device is active</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '10px 20px',
                  backgroundColor: submitting ? '#6c757d' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontSize: '16px'
                }}
              >
                {submitting ? 'Registering...' : 'Register Device'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Devices List */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0 }}>Registered Devices ({devices.length})</h3>
          <button
            onClick={fetchDevices}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh
          </button>
        </div>

        {devices.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            <p>No devices registered yet.</p>
            <p>Click "Register New Device" to get started.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                    Device ID
                  </th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                    Device Name
                  </th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                    Location
                  </th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                    Status
                  </th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                    Registered
                  </th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device, index) => (
                  <tr key={device.device_id} style={{
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                    borderBottom: '1px solid #dee2e6'
                  }}>
                    <td style={{ padding: '15px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {device.device_id}
                    </td>
                    <td style={{ padding: '15px' }}>
                      {device.device_name || '-'}
                    </td>
                    <td style={{ padding: '15px' }}>
                      {device.location ? (
                        <div>
                          <div style={{ fontWeight: 'bold' }}>
                            Store {device.location.store_number}
                          </div>
                          <div style={{ fontSize: '14px', color: '#666' }}>
                            {device.location.location_name}
                          </div>
                        </div>
                      ) : (
                        'Location not found'
                      )}
                    </td>
                    <td style={{ padding: '15px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: device.is_active ? '#d4edda' : '#f8d7da',
                        color: device.is_active ? '#155724' : '#721c24'
                      }}>
                        {device.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '15px', fontSize: '14px', color: '#666' }}>
                      {new Date(device.registered_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '15px' }}>
                      <button
                        onClick={() => toggleDeviceStatus(device.device_id, device.is_active)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: device.is_active ? '#ffc107' : '#28a745',
                          color: device.is_active ? '#212529' : 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        {device.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
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

export default DeviceRegistration;