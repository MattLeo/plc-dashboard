import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { signOut, getCurrentUser } from 'aws-amplify/auth';

function AccountSettings({ user }) {
  const [activeTab, setActiveTab] = useState('organization');
  const [loading, setLoading] = useState(false);
  const [orgData, setOrgData] = useState(null);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Form states
  const [orgForm, setOrgForm] = useState({
    orgName: '',
    address: '',
    city: '',
    state: '',
    zipCode: ''
  });
  
  const [locationForm, setLocationForm] = useState({
    storeNumber: '',
    locationName: '',
    address: '',
    city: '',
    state: '',
    zipCode: ''
  });

  const [editingLocation, setEditingLocation] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editingUserRole, setEditingUserRole] = useState('');

  // Get user role from the current user session
  const userRole = currentUser?.signInUserSession?.idToken?.payload['custom:role'];
  const orgId = currentUser?.signInUserSession?.idToken?.payload['custom:org_id'];

  // Fetch current user with session on component mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        console.log('Fetching current user...');
        setLoading(true);
        const authUser = await getCurrentUser();
        console.log('Current user fetched:', authUser);
        setCurrentUser(authUser);
      } catch (error) {
        console.error('Error fetching current user:', error);
        setError('Failed to load user session');
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  // Debug logging
  console.log('=== ACCOUNT SETTINGS DEBUG ===');
  console.log('Passed user prop:', user);
  console.log('Current user state:', currentUser);
  console.log('signInUserSession:', currentUser?.signInUserSession);
  console.log('idToken payload:', currentUser?.signInUserSession?.idToken?.payload);
  console.log('Extracted userRole:', userRole);
  console.log('Extracted orgId:', orgId);
  console.log('============================');

  useEffect(() => {
    console.log('useEffect triggered - orgId:', orgId, 'userRole:', userRole, 'currentUser:', !!currentUser);
    if (currentUser && orgId) {
      console.log('Calling fetchOrganizationData...');
      fetchOrganizationData();
      console.log('Calling fetchLocations...');
      fetchLocations();
      if (['org_admin', 'site_admin'].includes(userRole)) {
        console.log('Calling fetchUsers...');
        fetchUsers();
      }
    } else {
      console.log('Not ready for API calls - currentUser:', !!currentUser, 'orgId:', orgId);
    }
  }, [orgId, userRole, currentUser]);

  // Set default tab based on user role
  useEffect(() => {
    if (userRole && !['org_admin', 'site_admin'].includes(userRole) && activeTab === 'organization') {
      setActiveTab('profile');
    }
  }, [userRole]);

  const getAuthHeaders = () => {
    const token = currentUser?.signInUserSession?.idToken?.jwtToken;
    console.log('Getting auth headers - token available:', !!token);
    console.log('Token preview:', token ? token.substring(0, 50) + '...' : 'No token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchOrganizationData = async () => {
    try {
      console.log('fetchOrganizationData starting...');
      setLoading(true);
      const headers = getAuthHeaders();
      console.log('Making request to:', 'https://behhevolhf.execute-api.us-east-1.amazonaws.com/prod/organization/profile');
      console.log('Request headers:', headers);
      
      const response = await fetch('https://behhevolhf.execute-api.us-east-1.amazonaws.com/prod/organization/profile', {
        headers: headers
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Organization data received:', data);
        setOrgData(data.organization);
        setOrgForm({
          orgName: data.organization.org_name || '',
          address: data.organization.address || '',
          city: data.organization.city || '',
          state: data.organization.state || '',
          zipCode: data.organization.zip_code || ''
        });
      } else {
        const errorData = await response.text();
        console.error('Error response:', errorData);
        setError(`Failed to fetch organization data: ${response.status}`);
      }
    } catch (err) {
      console.error('fetchOrganizationData error:', err);
      setError('Failed to fetch organization data');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      console.log('fetchLocations starting...');
      const response = await fetch('https://behhevolhf.execute-api.us-east-1.amazonaws.com/prod/locations', {
        headers: getAuthHeaders()
      });
      
      console.log('Locations response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Locations data received:', data);
        setLocations(data.locations || []);
      } else {
        const errorData = await response.text();
        console.error('Locations error response:', errorData);
      }
    } catch (err) {
      console.error('fetchLocations error:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      console.log('fetchUsers starting...');
      const response = await fetch('https://behhevolhf.execute-api.us-east-1.amazonaws.com/prod/organization/users', {
        headers: getAuthHeaders()
      });
      
      console.log('Users response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Users data received:', data);
        setUsers(data.users || []);
      } else {
        const errorData = await response.text();
        console.error('Users error response:', errorData);
      }
    } catch (err) {
      console.error('fetchUsers error:', err);
    }
  };

  const handleUpdateOrganization = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage('');
      setError('');

      const response = await fetch('https://behhevolhf.execute-api.us-east-1.amazonaws.com/prod/organization/update', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(orgForm)
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('Organization updated successfully');
        setOrgData(data.organization);
      } else {
        setError(data.error || 'Failed to update organization');
      }
    } catch (err) {
      setError('Failed to update organization');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLocation = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage('');
      setError('');

      const response = await fetch('https://behhevolhf.execute-api.us-east-1.amazonaws.com/prod/locations', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(locationForm)
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('Location created successfully');
        setLocationForm({
          storeNumber: '',
          locationName: '',
          address: '',
          city: '',
          state: '',
          zipCode: ''
        });
        fetchLocations();
      } else {
        setError(data.error || 'Failed to create location');
      }
    } catch (err) {
      setError('Failed to create location');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLocation = async (locationId, updates) => {
    try {
      setLoading(true);
      setMessage('');
      setError('');

      const response = await fetch(`https://behhevolhf.execute-api.us-east-1.amazonaws.com/prod/locations/${locationId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('Location updated successfully');
        setEditingLocation(null);
        fetchLocations();
      } else {
        setError(data.error || 'Failed to update location');
      }
    } catch (err) {
      setError('Failed to update location');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      setLoading(true);
      setMessage('');
      setError('');

      const response = await fetch(`https://behhevolhf.execute-api.us-east-1.amazonaws.com/prod/organization/users/${userId}/role`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role: newRole })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('User role updated successfully');
        setEditingUser(null);
        fetchUsers();
      } else {
        setError(data.error || 'Failed to update user role');
      }
    } catch (err) {
      setError('Failed to update user role - API endpoint not implemented yet');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const clearMessages = () => {
    setMessage('');
    setError('');
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'org_admin': return '#dc3545';
      case 'site_admin': return '#fd7e14';
      case 'location_manager': return '#20c997';
      case 'user': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const tabStyle = (isActive) => ({
    padding: '12px 24px',
    backgroundColor: isActive ? '#007bff' : '#f8f9fa',
    color: isActive ? 'white' : '#666',
    border: '1px solid #ddd',
    cursor: 'pointer',
    borderRadius: '4px 4px 0 0',
    marginRight: '2px'
  });

  const inputStyle = {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    marginBottom: '15px',
    fontSize: '14px'
  };

  const buttonStyle = {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '10px'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#6c757d'
  };

  const dangerButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#dc3545'
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
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
          <h1>Account Settings</h1>
        </div>
        <div>
          <span style={{ marginRight: '20px' }}>
            Welcome, {currentUser?.signInDetails?.loginId || currentUser?.username || user?.username} ({userRole || 'Loading...'})
          </span>
          <button onClick={handleSignOut} style={dangerButtonStyle}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Loading state while fetching user */}
      {!currentUser && loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading user session...</p>
        </div>
      )}

      {/* Show error if user fetch failed */}
      {!currentUser && !loading && error && (
        <div style={{
          padding: '20px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <p>{error}</p>
          <p>Please try refreshing the page or signing out and back in.</p>
        </div>
      )}

      {/* Main content - only show when currentUser is loaded */}
      {currentUser && (
        <div>
          {/* Messages */}
          {(message || error) && (
            <div style={{
              padding: '15px',
              marginBottom: '20px',
              borderRadius: '4px',
              backgroundColor: error ? '#f8d7da' : '#d4edda',
              color: error ? '#721c24' : '#155724',
              border: `1px solid ${error ? '#f5c6cb' : '#c3e6cb'}`
            }}>
              {message || error}
              <button
                onClick={clearMessages}
                style={{
                  float: 'right',
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: 'inherit'
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* Tabs */}
          <div style={{ marginBottom: '20px' }}>
            <button
              style={tabStyle(activeTab === 'organization')}
              onClick={() => setActiveTab('organization')}
            >
              Organization
            </button>
            {(['org_admin', 'location_manager'].includes(userRole)) && (
              <button
                style={tabStyle(activeTab === 'locations')}
                onClick={() => setActiveTab('locations')}
              >
                Locations
              </button>
            )}
            {(['org_admin', 'site_admin'].includes(userRole)) && (
              <button
                style={tabStyle(activeTab === 'users')}
                onClick={() => setActiveTab('users')}
              >
                User Management
              </button>
            )}
            {!(['org_admin', 'site_admin'].includes(userRole)) && (
              <button
                style={tabStyle(activeTab === 'profile')}
                onClick={() => setActiveTab('profile')}
              >
                My Profile
              </button>
            )}
          </div>

          {/* Tab Content */}
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            border: '1px solid #ddd',
            borderRadius: '0 4px 4px 4px',
            minHeight: '400px'
          }}>
            {loading && (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                Loading...
              </div>
            )}

            {/* Organization Tab */}
            {activeTab === 'organization' && orgData && !loading && (
              <div>
                <h3>Organization Details</h3>
                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                  <p><strong>Organization Code:</strong> {orgData.org_code}</p>
                  <p><strong>Created:</strong> {new Date(orgData.created_at).toLocaleDateString()}</p>
                  <p><strong>Status:</strong> {orgData.is_active ? 'Active' : 'Inactive'}</p>
                </div>

                {userRole === 'org_admin' ? (
                  <form onSubmit={handleUpdateOrganization}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                          Organization Name
                        </label>
                        <input
                          type="text"
                          style={inputStyle}
                          value={orgForm.orgName}
                          onChange={(e) => setOrgForm({...orgForm, orgName: e.target.value})}
                          required
                        />

                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                          Address
                        </label>
                        <input
                          type="text"
                          style={inputStyle}
                          value={orgForm.address}
                          onChange={(e) => setOrgForm({...orgForm, address: e.target.value})}
                        />

                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                          City
                        </label>
                        <input
                          type="text"
                          style={inputStyle}
                          value={orgForm.city}
                          onChange={(e) => setOrgForm({...orgForm, city: e.target.value})}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                          State
                        </label>
                        <input
                          type="text"
                          style={inputStyle}
                          value={orgForm.state}
                          onChange={(e) => setOrgForm({...orgForm, state: e.target.value})}
                        />

                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                          Zip Code
                        </label>
                        <input
                          type="text"
                          style={inputStyle}
                          value={orgForm.zipCode}
                          onChange={(e) => setOrgForm({...orgForm, zipCode: e.target.value})}
                        />
                      </div>
                    </div>

                    <button type="submit" style={buttonStyle} disabled={loading}>
                      {loading ? 'Updating...' : 'Update Organization'}
                    </button>
                  </form>
                ) : (
                  <div>
                    <p><strong>Organization Name:</strong> {orgData.org_name}</p>
                    <p><strong>Address:</strong> {orgData.address || 'Not set'}</p>
                    <p><strong>City:</strong> {orgData.city || 'Not set'}</p>
                    <p><strong>State:</strong> {orgData.state || 'Not set'}</p>
                    <p><strong>Zip Code:</strong> {orgData.zip_code || 'Not set'}</p>
                    <p style={{ color: '#666', fontStyle: 'italic' }}>
                      Only organization administrators can edit these details.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Locations Tab */}
            {activeTab === 'locations' && !loading && (
              <div>
                <h3>Location Management</h3>
                
                {['org_admin', 'location_manager'].includes(userRole) && (
                  <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <h4>Add New Location</h4>
                    <form onSubmit={handleCreateLocation}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                            Store Number *
                          </label>
                          <input
                            type="text"
                            style={inputStyle}
                            value={locationForm.storeNumber}
                            onChange={(e) => setLocationForm({...locationForm, storeNumber: e.target.value})}
                            required
                          />

                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                            Location Name *
                          </label>
                          <input
                            type="text"
                            style={inputStyle}
                            value={locationForm.locationName}
                            onChange={(e) => setLocationForm({...locationForm, locationName: e.target.value})}
                            required
                          />

                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                            Address
                          </label>
                          <input
                            type="text"
                            style={inputStyle}
                            value={locationForm.address}
                            onChange={(e) => setLocationForm({...locationForm, address: e.target.value})}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                            City
                          </label>
                          <input
                            type="text"
                            style={inputStyle}
                            value={locationForm.city}
                            onChange={(e) => setLocationForm({...locationForm, city: e.target.value})}
                          />

                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                            State
                          </label>
                          <input
                            type="text"
                            style={inputStyle}
                            value={locationForm.state}
                            onChange={(e) => setLocationForm({...locationForm, state: e.target.value})}
                          />

                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                            Zip Code
                          </label>
                          <input
                            type="text"
                            style={inputStyle}
                            value={locationForm.zipCode}
                            onChange={(e) => setLocationForm({...locationForm, zipCode: e.target.value})}
                          />
                        </div>
                      </div>

                      <button type="submit" style={buttonStyle} disabled={loading}>
                        {loading ? 'Creating...' : 'Add Location'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Locations List */}
                <div>
                  <h4>Existing Locations ({locations.length})</h4>
                  {locations.length === 0 ? (
                    <p style={{ color: '#666' }}>No locations found.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: '15px' }}>
                      {locations.map((location) => (
                        <div key={location.location_id} style={{
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          padding: '15px',
                          backgroundColor: location.is_active ? 'white' : '#f8f9fa'
                        }}>
                          {editingLocation === location.location_id ? (
                            <LocationEditForm
                              location={location}
                              onSave={(updates) => handleUpdateLocation(location.location_id, updates)}
                              onCancel={() => setEditingLocation(null)}
                              inputStyle={inputStyle}
                              buttonStyle={buttonStyle}
                              secondaryButtonStyle={secondaryButtonStyle}
                            />
                          ) : (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <h5 style={{ margin: '0 0 10px 0' }}>
                                    {location.location_name} (Store #{location.store_number})
                                  </h5>
                                  <p style={{ margin: '5px 0', color: '#666' }}>
                                    {location.address && `${location.address}, `}
                                    {location.city && `${location.city}, `}
                                    {location.state} {location.zip_code}
                                  </p>
                                  <p style={{ margin: '5px 0', fontSize: '12px', color: '#999' }}>
                                    Created: {new Date(location.created_at).toLocaleDateString()}
                                    {!location.is_active && <span style={{ color: '#dc3545', marginLeft: '10px' }}>INACTIVE</span>}
                                  </p>
                                </div>
                                {['org_admin', 'location_manager', 'site_admin'].includes(userRole) && (
                                  <button
                                    onClick={() => setEditingLocation(location.location_id)}
                                    style={buttonStyle}
                                  >
                                    Edit
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && ['org_admin', 'site_admin'].includes(userRole) && !loading && (
              <div>
                <h3>User Management</h3>
                <p style={{ marginBottom: '20px', color: '#666' }}>
                  {userRole === 'site_admin' 
                    ? 'Manage user roles across all organizations.'
                    : `Manage users in your organization. Total users: ${users.length}`
                  }
                </p>
                
                {users.length === 0 ? (
                  <p style={{ color: '#666' }}>No users found.</p>
                ) : (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {users.map((userData) => (
                      <div key={userData.cognito_user_id} style={{
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        padding: '15px',
                        backgroundColor: userData.is_active ? 'white' : '#f8f9fa'
                      }}>
                        {editingUser === userData.cognito_user_id ? (
                          <div>
                            <div style={{ marginBottom: '15px' }}>
                              <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
                                User ID: {userData.cognito_user_id}
                              </p>
                              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                Role:
                              </label>
                              <select
                                value={editingUserRole}
                                onChange={(e) => setEditingUserRole(e.target.value)}
                                style={{
                                  ...inputStyle,
                                  width: '200px',
                                  marginBottom: '10px'
                                }}
                              >
                                <option value="user">User</option>
                                <option value="location_manager">Location Manager</option>
                                <option value="site_admin">Site Admin</option>
                                {userRole === 'site_admin' && (
                                  <option value="org_admin">Organization Admin</option>
                                )}
                              </select>
                            </div>
                            <div>
                              <button
                                onClick={() => handleUpdateUserRole(userData.cognito_user_id, editingUserRole)}
                                style={buttonStyle}
                                disabled={loading}
                              >
                                {loading ? 'Updating...' : 'Save Role'}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingUser(null);
                                  setEditingUserRole('');
                                }}
                                style={secondaryButtonStyle}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
                                User ID: {userData.cognito_user_id}
                              </p>
                              <p style={{ margin: '0 0 5px 0' }}>
                                Role: <span style={{ 
                                  padding: '2px 6px', 
                                  backgroundColor: getRoleColor(userData.role), 
                                  borderRadius: '3px',
                                  fontSize: '12px',
                                  color: 'white'
                                }}>
                                  {userData.role}
                                </span>
                              </p>
                              <p style={{ margin: '0', fontSize: '12px', color: '#999' }}>
                                Joined: {new Date(userData.created_at).toLocaleDateString()}
                                {!userData.is_active && <span style={{ color: '#dc3545', marginLeft: '10px' }}>INACTIVE</span>}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setEditingUser(userData.cognito_user_id);
                                setEditingUserRole(userData.role);
                              }}
                              style={buttonStyle}
                            >
                              Edit Role
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Profile Tab for Regular Users */}
            {activeTab === 'profile' && !['org_admin', 'site_admin'].includes(userRole) && !loading && (
              <div>
                <h3>My Profile</h3>
                <div style={{
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '20px',
                  backgroundColor: 'white'
                }}>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Username:
                    </label>
                    <p style={{ margin: '0', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                      {currentUser?.signInDetails?.loginId || currentUser?.username || user?.username}
                    </p>
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      User ID:
                    </label>
                    <p style={{ margin: '0', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}>
                      {currentUser?.userId || user?.userId}
                    </p>
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Role:
                    </label>
                    <p style={{ margin: '0', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        backgroundColor: getRoleColor(userRole), 
                        borderRadius: '3px',
                        fontSize: '12px',
                        color: 'white'
                      }}>
                        {userRole}
                      </span>
                    </p>
                  </div>

                  {orgData && (
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Organization:
                      </label>
                      <p style={{ margin: '0', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                        {orgData.org_name} ({orgData.org_code})
                      </p>
                    </div>
                  )}

                  <div style={{ 
                    padding: '15px', 
                    backgroundColor: '#e9ecef', 
                    borderRadius: '4px',
                    marginTop: '20px'
                  }}>
                    <p style={{ margin: '0', fontSize: '14px', color: '#495057' }}>
                      <strong>Note:</strong> To update your profile information or change your password, 
                      please contact your organization administrator.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Separate component for editing locations
function LocationEditForm({ location, onSave, onCancel, inputStyle, buttonStyle, secondaryButtonStyle }) {
  const [editForm, setEditForm] = useState({
    storeNumber: location.store_number || '',
    locationName: location.location_name || '',
    address: location.address || '',
    city: location.city || '',
    state: location.state || '',
    zipCode: location.zip_code || '',
    isActive: location.is_active
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(editForm);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Store Number
          </label>
          <input
            type="text"
            style={inputStyle}
            value={editForm.storeNumber}
            onChange={(e) => setEditForm({...editForm, storeNumber: e.target.value})}
          />

          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Location Name
          </label>
          <input
            type="text"
            style={inputStyle}
            value={editForm.locationName}
            onChange={(e) => setEditForm({...editForm, locationName: e.target.value})}
          />

          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Address
          </label>
          <input
            type="text"
            style={inputStyle}
            value={editForm.address}
            onChange={(e) => setEditForm({...editForm, address: e.target.value})}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            City
          </label>
          <input
            type="text"
            style={inputStyle}
            value={editForm.city}
            onChange={(e) => setEditForm({...editForm, city: e.target.value})}
          />

          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            State
          </label>
          <input
            type="text"
            style={inputStyle}
            value={editForm.state}
            onChange={(e) => setEditForm({...editForm, state: e.target.value})}
          />

          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Zip Code
          </label>
          <input
            type="text"
            style={inputStyle}
            value={editForm.zipCode}
            onChange={(e) => setEditForm({...editForm, zipCode: e.target.value})}
          />

          <label style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
            <input
              type="checkbox"
              checked={editForm.isActive}
              onChange={(e) => setEditForm({...editForm, isActive: e.target.checked})}
              style={{ marginRight: '8px' }}
            />
            <span style={{ fontWeight: 'bold' }}>Active Location</span>
          </label>
        </div>
      </div>

      <div>
        <button type="submit" style={buttonStyle}>
          Save Changes
        </button>
        <button type="button" onClick={onCancel} style={secondaryButtonStyle}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default AccountSettings;