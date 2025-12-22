import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const EmployeeProfile = () => {
  const [employee, setEmployee] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const id = localStorage.getItem('user_id');
    if (!id) navigate('/login');
    else fetchDetails(id);
  }, [navigate]);

  const fetchDetails = async (id) => {
    try {
      const res = await axios.get('https://hr-dashboard-using-mern.onrender.com/api/employees');
      const myData = res.data.find(e => e._id === id);
      setEmployee(myData);
    } catch (err) {
      console.error("Error fetching profile", err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const calculateTraineeDetails = () => {
    if (!employee || employee.category !== 'Trainee' || !employee.traineePeriod) {
      return null;
    }

    // *** UPDATED: Use joiningDate ***
    const joinDate = new Date(employee.joiningDate || employee.createdAt);
    // ********************************

    let endDate = new Date(joinDate);

    if (employee.traineePeriod.includes('Month')) {
      const months = parseInt(employee.traineePeriod);
      endDate.setMonth(endDate.getMonth() + months);
    } else if (employee.traineePeriod.includes('Year')) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    let extraDays = 0;
    const leavesByMonth = {};
    const medicalLeaves = Array.isArray(employee.leaves.medical) ? employee.leaves.medical : [];

    medicalLeaves.forEach(dateStr => {
      const date = new Date(dateStr);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      leavesByMonth[key] = (leavesByMonth[key] || 0) + 1; // Note: We don't strictly filter holidays here for simplicity in user view, but you could.
    });

    Object.values(leavesByMonth).forEach(count => {
      if (count > 1) {
        extraDays += (count - 1);
      }
    });

    if (extraDays > 0) {
      endDate.setDate(endDate.getDate() + extraDays);
    }

    return { endDate, extraDays };
  };

  if (!employee) return <div className="p-5 text-center">Loading Profile...</div>;

  const traineeData = calculateTraineeDetails();
  const medicalCount = Array.isArray(employee.leaves.medical) ? employee.leaves.medical.length : 0;

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          
          <div className="card shadow-sm mb-4 border-primary">
            <div className="card-body text-center">
              <h2 className="text-primary">{employee.name}</h2>
              <h5 className="text-muted">{employee.position}</h5>
              
              <div className="mb-3">
                <span className={`badge ${employee.category === 'Trainee' ? 'bg-info text-dark' : 'bg-dark'}`}>
                  {employee.category === 'Trainee' ? `Trainee (${employee.traineePeriod})` : 'Permanent Staff'}
                </span>
              </div>

              {traineeData && (
                <div className="alert alert-light border d-inline-block p-2">
                  <strong>Expected Completion Date:</strong>
                  <div className="h5 text-success mt-1">
                    {traineeData.endDate.toDateString()}
                  </div>
                  {traineeData.extraDays > 0 && (
                    <small className="text-danger fw-bold">
                      (Includes +{traineeData.extraDays} days extension due to excess leaves)
                    </small>
                  )}
                </div>
              )}
              
              <div className="mt-4">
                <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>Log Out</button>
              </div>
            </div>
          </div>

          <div className="row mb-4">
            <div className="col-6">
              <div className="card text-center bg-light p-3">
                <h5>Total Medical Leaves</h5>
                <h3 className={medicalCount > 1 ? "text-danger" : "text-success"}>
                  {medicalCount}
                </h3>
                <small className="text-muted">History Total</small>
              </div>
            </div>
            <div className="col-6">
              <div className="card text-center bg-light p-3">
                <h5>Authorized Leaves</h5>
                <h3>{employee.leaves.authorized ? employee.leaves.authorized.length : 0}/1</h3>
                <small className="text-muted">This Month</small>
              </div>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-header bg-dark text-white">
               My Attendance History
            </div>
            <div className="card-body">
              {employee.attendance.length > 0 ? (
                <ul className="list-group list-group-flush">
                  {employee.attendance.map((date, idx) => (
                     <li key={idx} className="list-group-item">
                       {new Date(date).toLocaleDateString()} - {new Date(date).toLocaleTimeString()}
                     </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center mt-3">No attendance marked yet.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;