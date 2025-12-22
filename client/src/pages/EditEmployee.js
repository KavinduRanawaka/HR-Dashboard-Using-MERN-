import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

const EditEmployee = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    position: '',
    category: '',
    traineePeriod: '',
    joiningDate: '' // Added Field
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/employees');
        const employee = res.data.find(e => e._id === id);
        
        if (employee) {
          setFormData({
            name: employee.name,
            position: employee.position,
            category: employee.category || 'Permanent',
            traineePeriod: employee.traineePeriod || '',
            // Format existing date to YYYY-MM-DD for input field
            joiningDate: employee.joiningDate ? employee.joiningDate.split('T')[0] : ''
          });
        }
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Could not fetch employee data.");
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id]);

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
      await axios.put(`https://hr-dashboard-using-mern.onrender.com/api/employees/${id}`, formData);
      navigate('/'); 
    } catch (err) {
      setError("Error updating employee.");
    }
  };

  if (loading) return <div className="text-center mt-5">Loading...</div>;

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow p-4">
            <h3 className="text-center mb-4">Edit Employee</h3>

            {error && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={handleSubmit}>
              
              <div className="mb-3">
                <label className="form-label">Employee Name</label>
                <input className="form-control" name="name" value={formData.name} onChange={handleChange} required />
              </div>

              {/* NEW: EDIT JOINING DATE */}
              <div className="mb-3">
                <label className="form-label fw-bold">Joining Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  name="joiningDate" 
                  value={formData.joiningDate} 
                  onChange={handleChange} 
                  required 
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Position</label>
                <input className="form-control" name="position" value={formData.position} onChange={handleChange} required />
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold">Employment Category</label>
                <select className="form-select" name="category" value={formData.category} onChange={handleChange}>
                  <option value="Permanent">Permanent Staff</option>
                  <option value="Trainee">Trainee</option>
                </select>
              </div>

              {formData.category === 'Trainee' && (
                <div className="mb-3 p-3 bg-light border rounded">
                  <label className="form-label text-primary fw-bold">Trainee Duration</label>
                  <select className="form-select" name="traineePeriod" value={formData.traineePeriod} onChange={handleChange} required>
                    <option value="">-- Select Duration --</option>
                    <option value="1 Month">1 Month</option>
                    <option value="2 Months">2 Months</option>
                    <option value="3 Months">3 Months</option>
                    <option value="4 Months">4 Months</option>
                    <option value="5 Months">5 Months</option>
                    <option value="6 Months">6 Months</option>
                    <option value="1 Year">1 Year</option>
                  </select>
                  <small className="text-muted">Updating this recalculates the end date based on Joining Date.</small>
                </div>
              )}

              <div className="d-flex justify-content-between mt-4">
                <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>Cancel</button>
                <button type="submit" className="btn btn-primary px-4">Update Employee</button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditEmployee;