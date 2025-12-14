import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AddEmployee = () => {
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    category: 'Permanent',
    traineePeriod: '',
    // Default to Today's date YYYY-MM-DD
    joiningDate: new Date().toISOString().split('T')[0] 
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.category === 'Trainee' && !formData.traineePeriod) {
      setError("Please select a duration for the Trainee.");
      return;
    }
    try {
      await axios.post('http://localhost:5000/api/employees', formData);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || "Error adding employee");
    }
  };

  return (
    <div className="container mt-5">
      <div className="card shadow p-4 mx-auto" style={{ maxWidth: '500px' }}>
        <h3 className="text-center mb-3">Add New Employee</h3>
        {error && <div className="alert alert-danger">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="mb-3">
            <label className="form-label">Name</label>
            <input className="form-control" name="name" onChange={handleChange} required />
          </div>

          {/* NEW: JOINING DATE */}
          <div className="mb-3">
            <label className="form-label fw-bold text-primary">Joining Date</label>
            <input 
              type="date" 
              className="form-control" 
              name="joiningDate" 
              value={formData.joiningDate}
              onChange={handleChange} 
              required 
            />
            <small className="text-muted">For existing employees, select their original start date.</small>
          </div>

          {/* Position */}
          <div className="mb-3">
            <label className="form-label">Position</label>
            <input className="form-control" name="position" onChange={handleChange} required />
          </div>

          {/* Category */}
          <div className="mb-3">
            <label className="form-label">Category</label>
            <select className="form-select" name="category" onChange={handleChange}>
              <option value="Permanent">Permanent Staff</option>
              <option value="Trainee">Trainee</option>
            </select>
          </div>

          {/* Duration */}
          {formData.category === 'Trainee' && (
            <div className="mb-3">
              <label className="form-label">Duration</label>
              <select className="form-select" name="traineePeriod" onChange={handleChange}>
                <option value="">Select...</option>
                <option value="1 Month">1 Month</option>
                <option value="2 Months">2 Months</option>
                <option value="3 Months">3 Months</option>
                <option value="4 Months">4 Months</option>
                <option value="5 Months">5 Months</option>
                <option value="6 Months">6 Months</option>
                <option value="1 Year">1 Year</option>
              </select>
            </div>
          )}

          <button type="submit" className="btn btn-primary w-100">Add Employee</button>
        </form>
      </div>
    </div>
  );
};

export default AddEmployee;