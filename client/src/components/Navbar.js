import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
      <div className="container">
        <Link className="navbar-brand" to="/">ABC HR System</Link>
        
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center">
            
            <li className="nav-item">
              <Link className="nav-link mx-2" to="/">Home</Link>
            </li>
            
            <li className="nav-item">
              <Link className="nav-link mx-2" to="/see-employee">See Employee</Link>
            </li>

            <li className="nav-item">
              <Link className="nav-link mx-2" to="/holidays">Manage Holidays</Link>
            </li>

            <li className="nav-item">
              <Link className="btn btn-primary ms-3 btn-sm" to="/add-employee">Add Employee</Link>
            </li>
            
            {/* Logout button removed */}

          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;