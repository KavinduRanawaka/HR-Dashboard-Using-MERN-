import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = ({ setIsLoggedIn }) => {
  // Changed field 'email' to 'name' to match backend
  const [formData, setFormData] = useState({ name: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('https://hr-dashboard-using-mern.onrender.com/api/login', formData);
      
      const { role, id } = res.data;

      // Save Auth Data
      localStorage.setItem('role', role);
      if (id) localStorage.setItem('user_id', id);

      // Handle Redirect based on Role
      if (role === 'admin') {
        localStorage.setItem('hr_auth', 'true'); // Keep old key for compatibility
        setIsLoggedIn(true);
        navigate('/'); // HR Dashboard
      } else {
        navigate('/my-profile'); // Employee Dashboard
      }

    } catch (err) {
      setError("Invalid Username or Password");
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <div className="card shadow p-4" style={{ width: '400px' }}>
        <h3 className="text-center mb-4">System Login</h3>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Username (Name)</label>
            <input className="form-control" name="name" onChange={handleChange} placeholder="e.g. admin or John" required />
          </div>
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input type="password" className="form-control" name="password" onChange={handleChange} placeholder="Default: 1234" required />
          </div>
          <button type="submit" className="btn btn-primary w-100">Login</button>
        </form>
      </div>
    </div>
  );
};

export default Login;