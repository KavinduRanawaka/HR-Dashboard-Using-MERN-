import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 

// --- SUB-COMPONENT: ATTENDANCE HISTORY ---
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
    <div className="mt-2 p-3 bg-white border rounded">
      <h6 className="text-dark border-bottom pb-2">Attendance Log (Revise):</h6>
      <div className="accordion">
        {months.map((month, index) => (
          <div key={index} className="card mb-1">
            <div className="card-header bg-light p-2 d-flex justify-content-between" 
                 onClick={() => toggleMonth(month)} style={{ cursor: 'pointer' }}>
              <span className="fw-bold text-primary">{month}</span>
              <span className="badge bg-secondary rounded-pill">{groupedAttendance[month].length}</span>
            </div>
            {openMonth === month && (
              <div className="card-body p-2">
                <ul className="list-group list-group-flush small">
                  {groupedAttendance[month].map((date, idx) => (
                    <li key={idx} className="list-group-item d-flex justify-content-between align-items-center py-1">
                      <span>{date.toLocaleDateString()} <span className="text-muted">({date.toLocaleTimeString()})</span></span>
                      <button className="btn btn-sm btn-outline-danger py-0" onClick={() => onDelete(date)}>✕</button>
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

// --- SUB-COMPONENT: LEAVE HISTORY ---
const LeaveHistory = ({ filteredMedical, filteredAuthorized, onDelete }) => {
  const medicals = filteredMedical.map(date => ({ date: new Date(date), type: 'medical' }));
  const authorized = filteredAuthorized.map(date => ({ date: new Date(date), type: 'authorized' }));
  const allLeaves = [...medicals, ...authorized].sort((a, b) => b.date - a.date);

  if (allLeaves.length === 0) return <small className="text-muted">No valid leaves.</small>;

  return (
    <div className="mt-2 p-3 bg-white border rounded">
      <h6 className="text-danger border-bottom pb-2">Leave History (Revise):</h6>
      <ul className="list-group">
        {allLeaves.map((item, index) => (
          <li key={index} className="list-group-item d-flex justify-content-between align-items-center py-1">
            <span>
              {item.date.toLocaleDateString()} 
              <span className={`badge ms-2 ${item.type === 'medical' ? 'bg-warning text-dark' : 'bg-info text-dark'}`}>
                {item.type}
              </span>
            </span>
            <button className="btn btn-sm btn-outline-danger py-0" onClick={() => onDelete(item.type, item.date)}>✕</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

// --- MAIN COMPONENT ---
const Home = () => {
  const [employees, setEmployees] = useState([]); 
  const [holidays, setHolidays] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null); 
  const [alert, setAlert] = useState(null);
  
  // DATE STATES
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 7)); // For PDF
  // NEW: Tracks the date you are currently working on (Default: Today)
  const [actionDate, setActionDate] = useState(new Date().toISOString().split('T')[0]); 

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [empRes, holRes] = await Promise.all([
        axios.get('https://hr-dashboard-using-mern.onrender.com/api/employees'),
        axios.get('https://hr-dashboard-using-mern.onrender.com/api/holidays')
      ]);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
      setHolidays(Array.isArray(holRes.data) ? holRes.data : []);
    } catch (err) { 
      console.error(err);
      showAlert("Error loading data from server.", "danger");
    }
  };

  // --- PDF GENERATION LOGIC ---
  const generatePDF = () => {
    if (employees.length === 0) {
      showAlert("No employees to generate report.", "warning");
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4'); 
    const [year, month] = reportDate.split('-');
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

    doc.text(`Attendance Report: ${monthName} ${year}`, 14, 15);

    const tableHead = ['Name'];
    for (let i = 1; i <= daysInMonth; i++) {
      tableHead.push(i.toString());
    }

    const tableBody = employees.map(emp => {
      const row = [emp.name];
      for (let day = 1; day <= daysInMonth; day++) {
        const currentDateStr = `${year}-${month}-${String(day).padStart(2, '0')}`;
        const currentDateString = new Date(currentDateStr).toDateString();

        let status = '';
        const isHoliday = holidays.some(h => new Date(h.date).toDateString() === currentDateString);
        const isPresent = emp.attendance.some(d => new Date(d).toDateString() === currentDateString);
        const isMed = emp.leaves.medical && emp.leaves.medical.some(d => new Date(d).toDateString() === currentDateString);
        const isAuth = emp.leaves.authorized && emp.leaves.authorized.some(d => new Date(d).toDateString() === currentDateString);
        
        if (isHoliday) status = 'H';
        else if (isPresent) status = 'P';
        else if (isMed || isAuth) status = 'L';
        else status = '-'; 

        row.push(status);
      }
      return row;
    });

    autoTable(doc, {
      head: [tableHead],
      body: tableBody,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1, halign: 'center' },
      headStyles: { fillColor: [22, 160, 133] }, 
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index > 0) {
          const text = data.cell.raw;
          if (text === 'P') {
            data.cell.styles.fillColor = [46, 204, 113]; 
            data.cell.styles.textColor = [255, 255, 255];
          } else if (text === 'L') {
            data.cell.styles.fillColor = [231, 76, 60];  
            data.cell.styles.textColor = [255, 255, 255];
          } else if (text === 'H') {
            data.cell.styles.fillColor = [241, 196, 15]; 
            data.cell.styles.textColor = [0, 0, 0];
          }
        }
      }
    });

    doc.save(`Attendance_${monthName}_${year}.pdf`);
  };

  // --- HELPERS ---
  const isDateHoliday = (dateStr) => {
    const targetDate = new Date(dateStr).toDateString();
    return holidays.some(h => new Date(h.date).toDateString() === targetDate);
  };

  const calculateWeightedCount = (dates) => {
    if (!Array.isArray(dates)) return 0;
    const validDates = dates.filter(d => !isDateHoliday(d));
    return validDates.reduce((total, dateStr) => {
      const d = new Date(dateStr);
      const weight = d.getDay() === 6 ? 0.5 : 1.0; 
      return total + weight;
    }, 0);
  };

  const calculateEmployeeStatus = (emp) => {
    const leavesByMonth = {};
    const medicalLeaves = Array.isArray(emp.leaves.medical) ? emp.leaves.medical : [];

    medicalLeaves.forEach(dateStr => {
      if (isDateHoliday(dateStr)) return;
      const date = new Date(dateStr);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const weight = date.getDay() === 6 ? 0.5 : 1.0;
      leavesByMonth[key] = (leavesByMonth[key] || 0) + weight;
    });

    const todayKey = `${new Date().getFullYear()}-${new Date().getMonth()}`;
    const currentMonthMedical = leavesByMonth[todayKey] || 0;

    let isExpired = false;
    let extraDays = 0;
    let endDate = null;

    if (emp.category === 'Trainee' && emp.traineePeriod) {
      const joinDate = new Date(emp.joiningDate || emp.createdAt);
      endDate = new Date(joinDate);

      if (emp.traineePeriod.includes('Month')) {
        const months = parseInt(emp.traineePeriod);
        endDate.setMonth(endDate.getMonth() + months);
      } else if (emp.traineePeriod.includes('Year')) {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      Object.values(leavesByMonth).forEach(monthlyTotal => {
        if (monthlyTotal > 1) extraDays += (monthlyTotal - 1);
      });
      
      const penaltyDaysInt = Math.ceil(extraDays);
      if (penaltyDaysInt > 0) endDate.setDate(endDate.getDate() + penaltyDaysInt);

      const today = new Date();
      today.setHours(0,0,0,0);
      endDate.setHours(0,0,0,0);
      isExpired = today > endDate;
      extraDays = penaltyDaysInt; 
    }
    return { isExpired, extraDays, endDate, currentMonthMedical };
  };

  // --- NEW: Check if marked for SELECTED date (instead of just today) ---
  const isMarkedForSelectedDate = (emp) => {
    if (!emp.attendance || emp.attendance.length === 0) return false;
    const target = new Date(actionDate).toDateString();
    return emp.attendance.some(d => new Date(d).toDateString() === target);
  };

  // --- ACTIONS --
  const markAttendance = async (id) => {
    try {
      // Send actionDate to backend
      await axios.post(`https://hr-dashboard-using-mern.onrender.com/api/employees/${id}/attendance`, { date: actionDate });
      showAlert(`Attendance Marked for ${actionDate}!`, 'success');
      fetchData();
    } catch (error) { if (error.response) showAlert(error.response.data.message, 'danger'); }
  };

  const requestLeave = async (id, type) => {
    try {
      // Send actionDate to backend
      await axios.post(`https://hr-dashboard-using-mern.onrender.com/api/employees/${id}/leave`, { type, date: actionDate });
      showAlert(`${type} leave added for ${actionDate}`, 'success');
      fetchData();
    } catch (error) { if (error.response) showAlert(error.response.data.message, 'danger'); }
  };

  const handleDeleteAttendance = async (empId, date) => {
    if(!window.confirm("Remove attendance?")) return;
    try {
      await axios.delete(`https://hr-dashboard-using-mern.onrender.com/api/employees/${empId}/attendance`, { data: { date } });
      setExpandedRow(null); 
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDeleteLeave = async (empId, type, date) => {
    if(!window.confirm(`Remove ${type} leave?`)) return;
    try {
      await axios.delete(`https://hr-dashboard-using-mern.onrender.com/api/employees/${empId}/leave`, { data: { type, date } });
      setExpandedRow(null); 
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDeleteEmployee = async (id) => {
    if(window.confirm("Delete Employee permanently?")) {
      await axios.delete(`https://hr-dashboard-using-mern.onrender.com/api/employees/${id}`);
      fetchData();
    }
  };

  const showAlert = (msg, type) => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 3000);
  };

  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const sortedEmployees = (employees || []).sort((a, b) => {
    const statA = calculateEmployeeStatus(a);
    const statB = calculateEmployeeStatus(b);
    if (statA.isExpired && !statB.isExpired) return -1;
    if (!statA.isExpired && statB.isExpired) return 1;
    return 0;
  });

  return (
    <div className="container mt-4">
      {alert && <div className={`alert alert-${alert.type} fixed-top m-3`}>{alert.msg}</div>}
      
      {/* HEADER: Title + Controls */}
      <div className="d-flex justify-content-between align-items-end mb-3 flex-wrap">
        <h2>Employee Dashboard</h2>
        
        <div className="d-flex align-items-end gap-2 flex-wrap">
            
            {/* WORK DATE SELECTOR (For Past/Future Actions) */}
            <div className="bg-light p-2 border rounded">
              <label className="small fw-bold text-muted d-block">Work Date (Actions)</label>
              <input 
                type="date" 
                className="form-control form-control-sm fw-bold text-primary" 
                value={actionDate} 
                onChange={(e) => setActionDate(e.target.value)}
              />
            </div>

            {/* PDF Report Selector */}
            <div className="bg-light p-2 border rounded">
              <label className="small fw-bold text-muted d-block">Report Month</label>
              <div className="d-flex gap-1">
                <input 
                  type="month" 
                  className="form-control form-control-sm" 
                  value={reportDate} 
                  onChange={(e) => setReportDate(e.target.value)}
                  style={{ maxWidth: '140px' }}
                />
                <button className="btn btn-dark btn-sm" onClick={generatePDF}>
                  PDF
                </button>
              </div>
            </div>

            {/* Add Employee Button */}
            <Link to="/add-employee" className="btn btn-primary btn-sm mb-1" style={{height: '38px', lineHeight: '24px'}}>
              + Add Employee
            </Link>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered table-hover shadow-sm">
          <thead className="table-dark">
            <tr>
              <th>Name</th>
              <th>Status / Type</th>
              <th>Position</th>
              <th>Leaves (Valid)</th>
              {/* Dynamic Header showing selected date */}
              <th style={{minWidth: '280px'}}>Actions for: <span className="text-warning">{actionDate}</span></th>
            </tr>
          </thead>
          <tbody>
            {sortedEmployees.length > 0 ? sortedEmployees.map((emp) => {
              const { isExpired, extraDays, endDate, currentMonthMedical } = calculateEmployeeStatus(emp);
              
              // Check if action already taken on Selected Date
              const isMarked = isMarkedForSelectedDate(emp);
              
              const rawMedical = Array.isArray(emp.leaves.medical) ? emp.leaves.medical : [];
              const rawAuthorized = Array.isArray(emp.leaves.authorized) ? emp.leaves.authorized : [];
              
              const filteredMedical = rawMedical.filter(d => !isDateHoliday(d));
              const filteredAuthorized = rawAuthorized.filter(d => !isDateHoliday(d));
              const authCount = calculateWeightedCount(rawAuthorized);

              return (
                <React.Fragment key={emp._id}>
                  <tr className={isExpired ? "table-danger border-danger" : ""}>
                    <td>
                      <strong>{emp.name}</strong>
                      {isExpired && <div className="text-danger fw-bold small mt-1">⚠️ ENDED</div>}
                    </td>
                    <td>
                      {emp.category === 'Permanent' ? (
                        <span className="badge bg-secondary">Permanent</span>
                      ) : (
                        <div className="d-flex flex-column align-items-start">
                          <span className={`badge ${isExpired ? 'bg-danger' : 'bg-info text-dark'}`}>
                            Trainee ({emp.traineePeriod})
                          </span>
                          {extraDays > 0 && <small className="text-danger fw-bold mt-1">+ {extraDays} Days Extended</small>}
                          {endDate && <small className="text-muted" style={{fontSize: '0.75rem'}}>Ends: {endDate.toLocaleDateString()}</small>}
                        </div>
                      )}
                    </td>
                    <td>{emp.position}</td>
                    <td>
                      <span className={`badge ${currentMonthMedical > 1 ? 'bg-warning text-dark' : (currentMonthMedical >= 1 ? 'bg-danger' : 'bg-secondary')} me-1`}>
                        Med: {currentMonthMedical}
                      </span>
                      <span className={`badge ${authCount >= 1 ? 'bg-danger' : 'bg-secondary'}`}>
                        Auth: {authCount}/1
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-2 justify-content-start">
                        
                        {/* ATTENDANCE BUTTON (Uses Action Date) */}
                        <button 
                          className={`btn btn-sm ${isMarked ? 'btn-secondary' : 'btn-success'}`} 
                          onClick={() => markAttendance(emp._id)}
                          disabled={isMarked}
                        >
                          {isMarked ? "Done" : "Present"} 
                        </button>

                        <button className="btn btn-sm btn-warning" onClick={() => requestLeave(emp._id, 'medical')}>+Med</button>
                        <button className="btn btn-sm btn-info" onClick={() => requestLeave(emp._id, 'authorized')}>+Auth</button>
                        
                        <button className="btn btn-sm btn-outline-dark" onClick={() => toggleRow(emp._id)}>
                          {expandedRow === emp._id ? "Close" : "Revise"}
                        </button>

                        <Link to={`/edit-employee/${emp._id}`} className="btn btn-sm btn-secondary">Edit</Link>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteEmployee(emp._id)}>Del</button>

                      </div>
                    </td>
                  </tr>

                  {expandedRow === emp._id && (
                    <tr className="bg-light">
                      <td colSpan="5">
                        <div className="row p-3">
                          <div className="col-md-6">
                             <AttendanceHistory 
                               attendanceRecords={emp.attendance} 
                               onDelete={(date) => handleDeleteAttendance(emp._id, date)} 
                             />
                          </div>
                          <div className="col-md-6">
                             <LeaveHistory 
                               filteredMedical={filteredMedical} 
                               filteredAuthorized={filteredAuthorized}
                               onDelete={(type, date) => handleDeleteLeave(emp._id, type, date)}
                             />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            }) : (
               <tr>
                 <td colSpan="5" className="text-center p-3 text-muted">
                   No employees found or loading...
                 </td>
               </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Home;