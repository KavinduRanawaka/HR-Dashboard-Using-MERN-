import React, { useState, useEffect } from 'react';
import axios from 'axios';

// --- SUB-COMPONENT: ATTENDANCE HISTORY (With Delete) ---
const AttendanceHistory = ({ attendanceRecords, onDelete }) => {
  const [openMonth, setOpenMonth] = useState(null);

  const getGroupedData = () => {
    const groups = {};
    const sortedDates = [...attendanceRecords].sort((a, b) => new Date(b) - new Date(a));

    sortedDates.forEach(dateStr => {
      const date = new Date(dateStr);
      const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(date);
    });
    return groups;
  };

  const groupedAttendance = getGroupedData();
  const months = Object.keys(groupedAttendance);
  const toggleMonth = (month) => setOpenMonth(openMonth === month ? null : month);

  if (attendanceRecords.length === 0) return <small className="text-muted">No attendance records.</small>;

  return (
    <div className="mt-2">
      <h6 className="text-dark border-bottom pb-2">Attendance Log:</h6>
      <div className="accordion">
        {months.map((month, index) => (
          <div key={index} className="card mb-1">
            <div className="card-header bg-white p-2 d-flex justify-content-between" 
                 onClick={() => toggleMonth(month)} style={{ cursor: 'pointer' }}>
              <span className="fw-bold text-primary">{month}</span>
              <span className="badge bg-secondary rounded-pill">{groupedAttendance[month].length} Days</span>
            </div>
            {openMonth === month && (
              <div className="card-body bg-light p-2">
                <ul className="list-group list-group-flush small">
                  {groupedAttendance[month].map((date, idx) => (
                    <li key={idx} className="list-group-item bg-transparent py-1 d-flex justify-content-between align-items-center">
                      <span>{date.toLocaleDateString()} - <span className="text-muted">{date.toLocaleTimeString()}</span></span>
                      
                      {/* DELETE BUTTON */}
                      <button 
                        className="btn btn-sm btn-outline-danger py-0 px-2" 
                        style={{fontSize: '0.7rem'}}
                        onClick={(e) => {
                          e.stopPropagation(); // Stop accordion from closing
                          onDelete(date);
                        }}
                      >
                        ✕
                      </button>

                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: LEAVE HISTORY (With Delete) ---
const LeaveHistory = ({ filteredMedical, filteredAuthorized, onDelete }) => {
  const medicals = filteredMedical.map(date => ({ date: new Date(date), type: 'medical' })); // lowercase type for backend
  const authorized = filteredAuthorized.map(date => ({ date: new Date(date), type: 'authorized' }));
  
  const allLeaves = [...medicals, ...authorized];

  if (allLeaves.length === 0) {
    return <small className="text-muted">No valid leaves (Holidays excluded).</small>;
  }

  const sortedLeaves = allLeaves.sort((a, b) => b.date - a.date);

  return (
    <div className="mt-2">
      <h6 className="text-danger border-bottom pb-2">Valid Leave History:</h6>
      <ul className="list-group">
        {sortedLeaves.map((item, index) => (
          <li key={index} className="list-group-item d-flex justify-content-between align-items-center py-2">
            <div>
              <span className="me-2">
                {item.date.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
              <span className={`badge ${item.type === 'medical' ? 'bg-warning text-dark' : 'bg-info text-dark'}`}>
                {item.type === 'medical' ? 'Medical' : 'Authorized'}
              </span>
            </div>

            {/* DELETE BUTTON */}
            <button 
              className="btn btn-sm btn-outline-danger py-0 px-2" 
              style={{fontSize: '0.7rem'}}
              onClick={() => onDelete(item.type, item.date)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

// --- MAIN COMPONENT ---
const SeeEmployee = () => {
  const [employees, setEmployees] = useState([]);
  const [holidays, setHolidays] = useState([]); 
  const [searchTerm, setSearchTerm] = useState("");
  const [searched, setSearched] = useState(false);
  
  const [activeAttendanceId, setActiveAttendanceId] = useState(null);
  const [activeLeaveId, setActiveLeaveId] = useState(null);
  const [alert, setAlert] = useState(null);

  const handleSearch = async () => {
    try {
      const [empRes, holRes] = await Promise.all([
        axios.get('http://localhost:5000/api/employees'),
        axios.get('http://localhost:5000/api/holidays')
      ]);

      const filtered = empRes.data.filter(emp => 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      setEmployees(filtered);
      setHolidays(holRes.data); 
      setSearched(true);
      // Don't close panels on refresh so HR can see the item disappear
    } catch (err) { console.error(err); }
  };

  const isDateHoliday = (dateStr) => {
    const targetDate = new Date(dateStr).toDateString();
    return holidays.some(h => new Date(h.date).toDateString() === targetDate);
  };

  const requestLeave = async (id, type) => {
    try {
      await axios.post(`http://localhost:5000/api/employees/${id}/leave`, { type });
      setAlert({ msg: `${type} Leave Added Successfully`, type: 'success' });
      handleSearch(); 
    } catch (error) {
      if (error.response) setAlert({ msg: error.response.data.message, type: 'danger' });
    }
    setTimeout(() => setAlert(null), 3000);
  };

  // --- NEW: DELETE HANDLERS ---
  const handleDeleteAttendance = async (empId, date) => {
    if(!window.confirm("Are you sure you want to remove this attendance record?")) return;
    try {
      // Axios DELETE with Body requires specific syntax: { data: { ... } }
      await axios.delete(`http://localhost:5000/api/employees/${empId}/attendance`, {
        data: { date: date }
      });
      setAlert({ msg: "Attendance Removed", type: 'warning' });
      handleSearch();
    } catch (err) { console.error(err); }
  };

  const handleDeleteLeave = async (empId, type, date) => {
    if(!window.confirm(`Remove this ${type} leave record?`)) return;
    try {
      await axios.delete(`http://localhost:5000/api/employees/${empId}/leave`, {
        data: { type, date }
      });
      setAlert({ msg: "Leave Removed", type: 'warning' });
      handleSearch();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-9">
          <h2 className="text-center mb-4">Find Employee Details</h2>
          
          {alert && <div className={`alert alert-${alert.type} text-center`}>{alert.msg}</div>}

          <div className="input-group mb-4 shadow-sm">
            <input 
              type="text" className="form-control" placeholder="Enter employee name..." 
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handleSearch}>Search</button>
          </div>

          <div className="list-group">
            {searched && employees.length === 0 && <div className="alert alert-warning text-center">No employee found.</div>}

            {employees.map(emp => {
              const rawMedical = Array.isArray(emp.leaves.medical) ? emp.leaves.medical : [];
              const rawAuthorized = Array.isArray(emp.leaves.authorized) ? emp.leaves.authorized : [];

              const filteredMedical = rawMedical.filter(date => !isDateHoliday(date));
              const filteredAuthorized = rawAuthorized.filter(date => !isDateHoliday(date));

              return (
                <div key={emp._id} className="list-group-item list-group-item-action p-4 shadow-sm mb-3 border rounded">
                  <div className="d-flex w-100 justify-content-between align-items-start">
                    
                    {/* LEFT: Info */}
                    <div>
                      <h4 className="mb-1 text-primary">{emp.name}</h4>
                      <p className="mb-1 text-muted"><strong>Position:</strong> {emp.position}</p>
                      <div className="mb-3">
                        {emp.category === 'Permanent' ? (
                          <span className="badge bg-dark">Permanent Staff</span>
                        ) : (
                          <span className="badge bg-info text-dark">Trainee ({emp.traineePeriod})</span>
                        )}
                      </div>

                      <div className="btn-group shadow-sm">
                        <button className="btn btn-outline-dark btn-sm" 
                          onClick={() => setActiveAttendanceId(activeAttendanceId === emp._id ? null : emp._id)}>
                          {activeAttendanceId === emp._id ? "Hide Attendance" : "View Attendance"}
                        </button>
                        
                        <button className="btn btn-outline-secondary btn-sm" 
                          onClick={() => setActiveLeaveId(activeLeaveId === emp._id ? null : emp._id)}>
                          {activeLeaveId === emp._id ? "Hide Leaves" : "View Leaves"}
                        </button>
                      </div>
                    </div>

                    {/* RIGHT: Status & Add Buttons */}
                    <div className="text-end">
                      <h6 className="border-bottom pb-2 mb-2">Valid Leaves (No Holidays)</h6>
                      <div className="mb-2">
                         <span className={`badge ${filteredMedical.length > 0 ? 'bg-warning text-dark' : 'bg-success'} me-2`}>
                           Med: {filteredMedical.length} (Total)
                         </span>
                         <button className="btn btn-sm btn-warning" onClick={() => requestLeave(emp._id, 'medical')}>+ Add</button>
                      </div>
                      <div>
                        <span className={`badge ${filteredAuthorized.length >= 1 ? 'bg-danger' : 'bg-success'} me-2`}>
                           Auth: {filteredAuthorized.length}/1
                        </span>
                        <button className="btn btn-sm btn-info" onClick={() => requestLeave(emp._id, 'authorized')}>+ Add</button>
                      </div>
                    </div>
                  </div>

                  {/* PANELS */}
                  <div className="row mt-3">
                    {/* Attendance History (With Delete Prop) */}
                    {activeAttendanceId === emp._id && (
                      <div className="col-md-6">
                         <div className="p-3 bg-light rounded border h-100">
                           <AttendanceHistory 
                              attendanceRecords={emp.attendance} 
                              onDelete={(date) => handleDeleteAttendance(emp._id, date)}
                           />
                         </div>
                      </div>
                    )}

                    {/* Leave History (With Delete Prop) */}
                    {activeLeaveId === emp._id && (
                      <div className="col-md-6">
                        <div className="p-3 bg-white rounded border border-danger h-100">
                          <LeaveHistory 
                            filteredMedical={filteredMedical} 
                            filteredAuthorized={filteredAuthorized}
                            onDelete={(type, date) => handleDeleteLeave(emp._id, type, date)} 
                          />
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeeEmployee;