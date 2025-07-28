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
  const [sortConfig, setSortConfig] = useState({key: null, direction: 'asc'});
  const [filters, setFilters] = useState({});

  const getTimezone = (date) => {
    const options = {timeZoneName: 'short'};

    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(date);

    const tzPart = parts.find(part => part.type === 'timeZoneName');
    return tzPart ? tzPart.value : 'N/A';
  };

  const columnMappings = {
    'timestamp': `Date & Time (${getTimezone(new Date())})`,
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

  // Filtering functions
  const getFilteredRecords = () => {
    return records.filter(record => {
      return Object.keys(filters).every(key => {
        const filterValue = filters[key];
        const recordValue = record[key];

        // Skipping empty filters
        if (!filters || filterValue === '' || filterValue === 'all') {
          return true;
        }

        switch (key) {
          case 'timestamp':
            const recordDate = new Date(recordValue).toLocaleDateString();
            return recordDate.toLocaleLowerCase().includes(filterValue.toLocaleLowerCase()); 
          case 'deviceId':
          case 'balerMode':
            return String(recordValue).toLowerCase().includes(filterValue.toLowerCase());
          case 'machineType':
            const displayValue = recordValue === 'B' ? 'Baler' : 'Compactor';
            return displayValue.toLowerCase().includes(filterValue.toLowerCase());
          case 'lowMagSwitchFailed':
          case 'upMagSwitchFailed':
          case 'full':
            if (filterValue === 'true') return recordValue === 'true';
            if (filterValue === 'false') return recordValue === 'false';
            return true;
          case 'numStarts':
          case 'cycles':
          case 'numBales':
          case 'maxPressure':
            if (filterValue.includes('-')) {
              const [min, max] = filterValue.split('-').map(v => parseFloat(v.trim()));
              const numValue = parseFloat(recordValue);
              return numValue >= min && numValue <= max;
            } else {
              return String(recordValue).includes(filterValue);
            }
          default:
              return String(recordValue).toLowerCase().includes(filterValue.toLowerCase());
        }
      })
    })
  }

  const getSortedAndFilteredRecords = () => {
    const filteredRecords = getFilteredRecords();

    if (!sortConfig.key) return filteredRecords;

    return [...filteredRecords].sort((a,b) => {
      const aValue = getSortValue(a, sortConfig.key);
      const bValue = getSortValue(b, sortConfig.key);

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : 1;
      }
      return 0;
    })
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({...prev, [key]: value}));
  };

  const clearAllFilters = () => {
    setFilters({});
  };

  const getFilterComponent = (key) => {
    const currentFilter = filters[key] || '';

    if (['lowMagSwitchFailed', 'upMagSwitchFailed', 'full'].includes(key)) {
      return (
        <select
          value={currentFilter}
          onChange={(e) => updateFilter(key, e.target.value)}
          style={{
            width: '100%',
            padding: '4px',
            fontSize: '12px',
            border: '1px solid #ccc',
            borderRadius: '3px',
            marginTop: '4px'
          }}
        >
          <option value="">All</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );
    }

    // Machine type gets a dropdown
    if (key === 'machineType') {
      return (
        <select
          value={currentFilter}
          onChange={(e) => updateFilter(key, e.target.value)}
          style={{
            width: '100%',
            padding: '4px',
            fontSize: '12px',
            border: '1px solid #ccc',
            borderRadius: '3px',
            marginTop: '4px'
          }}
        >
          <option value="">All</option>
          <option value="baler">Baler</option>
          <option value="compactor">Compactor</option>
        </select>
      );
    }

    // Mode gets a dropdown
    if (key === 'balerMode') {
      return (
        <select
          value={currentFilter}
          onChange={(e) => updateFilter(key, e.target.value)}
          style={{
            width: '100%',
            padding: '4px',
            fontSize: '12px',
            border: '1px solid #ccc',
            borderRadius: '3px',
            marginTop: '4px'
          }}
        >
          <option value="Automatic">Automatic</option>
          <option value="Manual Up">Manual Up</option>
          <option value="Manual Down">Manual Down</option>
        </select>
      );
    }

    // All other columns get text input
    let placeholder = 'Filter...';
    if (['numStarts', 'cycles', 'numBales', 'maxPressure'].includes(key)) {
      placeholder = 'e.g. 10 or 10-20';
    } else if (key === 'deviceId') {
      placeholder = 'Serial number...';
    } else if (key === 'timestamp') {
      placeholder = 'Date...';
    }

    return (
      <input
        type="text"
        value={currentFilter}
        onChange={(e) => updateFilter(key, e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '4px',
          fontSize: '12px',
          border: '1px solid #ccc',
          borderRadius: '3px',
          marginTop: '4px'
        }}
      />
    );
  };

  // CSV export functionality
  const exportToCSV = () => {
    const sortedAndFilteredRecords = getSortedAndFilteredRecords();

    if (records.length === 0) {
      alert('No data to export');
      return;
    }

    const orderedKeys = getOrderedKeys(sortedAndFilteredRecords[0]);
    const header = orderedKeys.map(key => getFriendlyColumnName(key));

    const csvData = sortedAndFilteredRecords.map(record => {
      return orderedKeys.map(key => {
        let value = formatCellValue(key, record[key]);

        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }

        return value;
      });
    });

    const csvContent = [header, ...csvData].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `plc-dashboard-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
  // Sorting and ordering functions
  const getSortValue = (record, key) => {
    const value = record[key];

    switch (key) {
      case 'timestamp':
        return new Date(value).getTime();
      case 'maxPressure':
      case 'numStarts':
      case 'cycles':
      case 'numBales':
      case 'runtime':
      case 'deviceId':
        return typeof value === 'number' ? value : 0;
      case 'machineType':
      case 'balerMode':
        return typeof value === 'string' ? value.toLowerCase() : '';
      case 'lowMagSwitchFailed':
      case 'upMagSwitchFailed':
      case 'full':
        if (typeof value === 'boolean') return value ? 1 : 0;
        if (typeof value === 'string') return value.toLowerCase();
        return String(value).toLowerCase();
      default:
        if (typeof value === 'string') return value.toLowerCase();
        if (typeof value === 'number') return value;
        if (typeof value === 'boolean') return value? 1: 0;
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({key, direction});
  };

  /*
  const getSortedRecords = () => {
    if (!sortConfig.key) return records;

    return [...records].sort((a, b) => {
      const aValue = getSortValue(a, sortConfig.key);
      const bValue = getSortValue(b, sortConfig.key);

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
 
  };
  */

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕️'; // default sorting Icon
    return sortConfig.direction === 'asc' ? '▲' : '▼';
  }

  const sortedAndFilteredRecords = getSortedAndFilteredRecords();
  const orderedKeys = records.length > 0 ? getOrderedKeys(records[0]) : [];
  const activeFilterCount = Object.keys(filters).filter(key => filters[key] 
    && filters[key] !== '' && filters[key] !== 'all').length;
    
  return (
    <div style={{ padding: '20px', maxWidth: '1500px', margin: '0 auto' }}>
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

      {/* Refreshand Export buttons*/}
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

        <button 
          onClick={exportToCSV}
          disabled={sortedAndFilteredRecords.length === 0}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            marginLeft: '10px',
            borderRadius: '4px',
            cursor: records.length === 0 ? 'not-allowed' : 'pointer',
            opacity: records.length === 0 ? 0.6 : 1
          }}
        >
          Export to CSV ({sortedAndFilteredRecords.length} records)
        </button>
      </div>

      {/* Sorting and Filtering Info */}
      <div style={{ marginBottom: '15px'}}>
        {activeFilterCount > 0 && (
          <div style={{
            marginBottom: '10px',
            padding: '8px 12px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffecb5',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            Active Filters: {activeFilterCount}
            <button
            onClick={clearAllFilters}
            style={{
              marginLeft: '18px',
              padding: '2px 8px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            >
              Clear All Filters
            </button>
          </div>
        )}
        {sortConfig.key && (
          <div style={{
            padding: '15px',
            backgroundColor: '#e7f3ff',
            border: '1px solid #b3d9ff',
            borderRadius: '4px',
            marginBottom: '14px'
          }}>
            Sorting by: {getFriendlyColumnName(sortConfig.key)} ({sortConfig.direction === 'asc'? 'Ascending' : 'Descending'})
            <button
              onClick={() => setSortConfig({key: null, direction: 'asc'})}
              style={{
                marginLeft: '10px',
                padding: '2px 8px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Clear Sort
            </button>
          </div>
        )}
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
        <h2>Records ({sortedAndFilteredRecords.length} of {records.length})</h2>
        {records.length === 0 ? (
          <p>No records found.</p>
        ) : sortedAndFilteredRecords.length === 0 ? (
          <p>No records match the current filters.</p>
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
                    <th 
                      key={key}
                      style={{ 
                        padding: '12px',
                        textAlign: 'left',
                        borderBottom: '2px solid #dee2e6',
                        fontWeight: 'bold',
                        userSelect: 'none',
                        position: 'relative', // for positioning the sort icon
                        backgroundColor: sortConfig.key === key ? '#e9ecef' : 'inherit'
                        //whiteSpace: 'nowrap'
                      }}
                    >
                      <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                        <span>{getFriendlyColumnName(key)}</span>
                        <span 
                          onClickCapture={() => handleSort(key)}
                          title={`Click to sort by ${getFriendlyColumnName(key)}`}  
                          style={{ marginleft: '8px', opacity: 0.7, cursor: 'pointer'}}>
                            {getSortIcon(key)}
                        </span>
                      </div>
                      <div>
                        {getFilterComponent(key)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedAndFilteredRecords.map((record, index) => ( //Flagging this
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