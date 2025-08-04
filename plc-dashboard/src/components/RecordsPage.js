import React, { useEffect, useState } from 'react';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import { Link, useNavigate } from 'react-router-dom';

function RecordsPage({ user }) {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({key: null, direction: 'asc'});
  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(25);

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
    'full': 'Full Alert',
    'balerMode': 'Mode Setting'
  };

  const columnOrder = [
    'timestamp',
    'machineType',
    'deviceId',
    'balerMode',
    'numStarts',
    'cycles',
    'cycleTime',
    'runtime',
    'numBales',
    'maxPressure',
    'full',
    'threeQuartersFull',
    'lowMagSwitchFailed',
    'upMagSwitchFailed',
    'stopButtonWhileStarting',
    'retractPressureExceeded',
    'cycleEndedEarly'
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
          const time = value; //Added to account for time miscalc in the cycle Lambda
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

  const getAllKeys = () => {
    const allKeys = new Set();

    records.forEach(record => {
      Object.keys(record).forEach(key => {
        allKeys.add(key)})
    });
    return Array.from(allKeys);
  };

  const getOrderedKeys = (record) => {
    const allKeys = getAllKeys();
    const orderedKeys = [];

    columnOrder.forEach(key => {
      if (allKeys.includes(key)) {
        orderedKeys.push(key);
      }
    });

    allKeys.forEach(key => {
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
            return recordDate.toLowerCase().includes(filterValue.toLowerCase()); 
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

    if ([
        'lowMagSwitchFailed', 
        'upMagSwitchFailed', 
        'full', 
        'threeQuartersFull', 
        'stopButtonWhileStarting', 
        'cycleEndedEarly',
        'retractPressureExceeded'
      ].includes(key)) {
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
          <option value="">All</option>
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

  // Pagination functions
  const getPaginatedRecords = () => {
    const sortedAndFilteredRecords = getSortedAndFilteredRecords();
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = (startIndex + recordsPerPage);
    return sortedAndFilteredRecords.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const filteredRecords = getSortedAndFilteredRecords();
    return Math.ceil(filteredRecords.length / recordsPerPage);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    document.querySelector('table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleRecordsPerPageChange = (newRecordsPerPage) => {
    setRecordsPerPage(newRecordsPerPage);
    setCurrentPage(1);
  };

  const PaginationControls = () => {
    const totalPages = getTotalPages();
    
    if (totalPages <= 1) return null;

    const getVisiblePageNumbers = () => {
      const delta = 2;
      const range = [];
      const rangeWithDots = [];

      for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
        range.push(i);
      }

      if (currentPage - delta > 2) {
        rangeWithDots.push(1, '...');
      } else {
        rangeWithDots.push(1); 
      }

      rangeWithDots.push(...range);

      if (currentPage + delta < totalPages - 1) {
        rangeWithDots.push('...', totalPages);
      } else {
        rangeWithDots.push(totalPages);
      }

      return rangeWithDots;
    };
  
    const visiblePages = getVisiblePageNumbers();

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        {/*Records per page selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px'}}>
          <span style={{ fontSize: '14px' }}>Show:</span>
          <select
            value={recordsPerPage}
            onChange={(e) => handleRecordsPerPageChange(Number(e.target.value))}
            style={{
              padding:'4px 8px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              fontSize: '14px'
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        
        {/* Pagination buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px'}}>
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            style={{
              padding: '6px 10px',
              border: '1px solid #ccc',
              backgroundColor: currentPage === 1 ? '#f8f9fa' : 'white',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              borderRadius: '3px',
              fontSize: '14px'
            }}
          >
            First
          </button>
          
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{
              padding: '6px 10px',
              border: '1px solid #ccc',
              backgroundColor: currentPage === 1 ? '#f8f9fa' : 'white',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              borderRadius: '3px',
              fontSize: '14px'
            }}
          >
            Previous
          </button>

          {visiblePages.map((page, index) => (
            page === '...' ? (
              <span key={index} style={{ padding: '6px 10px', fontSize: '14px' }}>...</span>
            ) : (
              <button
                key={index}
                onClick={() => handlePageChange(page)}
                style={{
                  padding: '6px 10px',
                  border: '1px solid #ccc',
                  backgroundColor: currentPage === page ? '#007bff' : 'white',
                  color: currentPage === page ? 'white' : 'black',
                  cursor: 'pointer',
                  borderRadius: '3px',
                  fontSize: '14px',
                  fontWeight: currentPage === page ? 'bold' : 'normal'
                }}
              >
                {page}
              </button>
            )
          ))}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{
              padding: '6px 10px',
              border: '1px solid #ccc',
              backgroundColor: currentPage === totalPages ? '#f8f9fa' : 'white',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              borderRadius: '3px',
              fontSize: '14px'
            }}
          >
            Next
          </button>

          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            style={{
              padding: '6px 10px',
              border: '1px solid #ccc',
              backgroundColor: currentPage === totalPages ? '#f8f9fa' : 'white',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              borderRadius: '3px',
              fontSize: '14px'
            }}
          >
            Last
          </button>
        </div>
      </div>
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
      navigate('/'); // This will trigger a re-auth in App.js
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRecords();
    }
  }, [user]);

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

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕️'; // default sorting Icon
    return sortConfig.direction === 'asc' ? '▲' : '▼';
  }

  const sortedAndFilteredRecords = getSortedAndFilteredRecords();
  const totalFilteredRecords = sortedAndFilteredRecords.length;
  const orderedKeys = records.length > 0 ? getOrderedKeys(records[0]) : [];
  const activeFilterCount = Object.keys(filters).filter(key => filters[key] 
    && filters[key] !== '' && filters[key] !== 'all').length;
    
  return (
    <div style={{ padding: '20px', maxWidth: '1800px', margin: '0 auto' }}>
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
          <h1>Records</h1>
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

      {/* Refresh and Export buttons*/}
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
          disabled={totalFilteredRecords === 0}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            marginLeft: '10px',
            borderRadius: '4px',
            cursor: totalFilteredRecords === 0 ? 'not-allowed' : 'pointer',
            opacity: totalFilteredRecords === 0 ? 0.6 : 1
          }}
        >
          Export to CSV ({totalFilteredRecords} records)
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
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '15px'
        }}>
          <h2 style={{ margin: 0 }}>
            Records ({totalFilteredRecords} of {records.length}) - Page {currentPage} of {getTotalPages()}
          </h2>
          <PaginationControls />
        </div>

        {records.length === 0 ? (
          <p>No records found.</p>
        ) : totalFilteredRecords === 0 ? (
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
                        backgroundColor: sortConfig.key === key ? '#e9ecef' : 'inherit',
                        verticalAlign: 'bottom',
                        paddingBottom: '4px'
                        //whiteSpace: 'nowrap'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        height: '100%'
                      }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                          <span>{getFriendlyColumnName(key)}</span>
                          <span 
                            onClickCapture={() => handleSort(key)}
                            title={`Click to sort by ${getFriendlyColumnName(key)}`}  
                            style={{ marginLeft: '8px', opacity: 0.7, cursor: 'pointer'}}>
                              {getSortIcon(key)}
                          </span>
                        </div>
                        <div>
                          {getFilterComponent(key)}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getPaginatedRecords().map((record, index) => ( //Flagging this
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

        {/* Bottom pagination controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
        }}>
          <div style={{ fontSize: '14px', color: '#666' }}>
            Showing {Math.min((currentPage - 1) * recordsPerPage + 1, totalFilteredRecords)}-{Math.min(currentPage * recordsPerPage, totalFilteredRecords)} of {totalFilteredRecords} records
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecordsPage;