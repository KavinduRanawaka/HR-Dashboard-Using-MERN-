import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Holidays = () => {
  const [holidays, setHolidays] = useState([]);
  const [formData, setFormData] = useState({ date: '', name: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const res = await axios.get('https://hr-dashboard-using-mern.onrender.com/api/holidays');
      setHolidays(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('https://hr-dashboard-using-mern.onrender.com/api/holidays', formData);
      setFormData({ date: '', name: '' }); // Reset Form
      setError('');
      fetchHolidays(); // Refresh List
    } catch (err) {
      setError("Error adding holiday. Date might already exist.");
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm("Remove this holiday?")) {
      await axios.delete(`https://hr-dashboard-using-mern.onrender.com/api/holidays/${id}`);
      fetchHolidays();
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="text-center mb-4">Manage Holidays</h2>
      
      <div className="row justify-content-center">
        <div className="col-md-6">
          
          {/* Add Form */}
          <div className="card p-4 shadow-sm mb-4">
            <h5 className="mb-3">Add New Holiday</h5>
            {error && <div className="alert alert-danger">{error}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  required 
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Holiday Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Christmas, Poya Day"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required 
                />
              </div>
              <button type="submit" className="btn btn-primary w-100">Add Holiday</button>
            </form>
          </div>

        </div>

        {/* List of Holidays */}
        <div className="col-md-6">
          <div className="card shadow-sm">
             <div className="card-header bg-dark text-white">Upcoming Holidays</div>
             <ul className="list-group list-group-flush">
               {holidays.length === 0 && <li className="list-group-item">No holidays scheduled.</li>}
               
               {holidays.map(holiday => (
                 <li key={holiday._id} className="list-group-item d-flex justify-content-between align-items-center">
                   <div>
                     <span className="fw-bold">{new Date(holiday.date).toLocaleDateString()}</span>
                     <span className="ms-2 text-muted">- {holiday.name}</span>
                   </div>
                   <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(holiday._id)}>
                     Remove
                   </button>
                 </li>
               ))}
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Holidays;