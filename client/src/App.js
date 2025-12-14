import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import AddEmployee from './pages/AddEmployee';
import SeeEmployee from './pages/SeeEmployee';
import EditEmployee from './pages/EditEmployee';
import EmployeeProfile from './pages/EmployeeProfile'; // Import the new Employee Page
import Login from './pages/Login';
import Holidays from './pages/Holidays';

function App() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Check login status when app starts
  useEffect(() => {
    // We check specifically for 'hr_auth' to see if it is an Admin
    const auth = localStorage.getItem('hr_auth');
    if (auth === 'true') {
      setIsAdminLoggedIn(true);
    }
  }, []);

  // Logout Function (Clears all data)
  const handleLogout = () => {
    localStorage.removeItem('hr_auth');
    localStorage.removeItem('role');
    localStorage.removeItem('user_id');
    setIsAdminLoggedIn(false);
  };

  return (
    <Router>
      {/* Show Admin Navbar ONLY if HR is Logged In */}
      {isAdminLoggedIn && <Navbar handleLogout={handleLogout} />}

      <Routes>
        {/* --- HR / ADMIN ROUTES (Protected) --- */}
        <Route 
          path="/" 
          element={isAdminLoggedIn ? <Home /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/add-employee" 
          element={isAdminLoggedIn ? <AddEmployee /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/see-employee" 
          element={isAdminLoggedIn ? <SeeEmployee /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/edit-employee/:id" 
          element={isAdminLoggedIn ? <EditEmployee /> : <Navigate to="/login" />} 
        />

        {/* --- EMPLOYEE ROUTE (Self-Protected inside component) --- */}
        {/* We don't force isAdminLoggedIn here because regular employees access this */}
        <Route 
          path="/my-profile" 
          element={<EmployeeProfile />} 
        />

        {/* --- LOGIN ROUTE --- */}
        <Route 
          path="/login" 
          element={<Login setIsLoggedIn={setIsAdminLoggedIn} />} 
        />
        <Route 
          path="/holidays" 
           element={isAdminLoggedIn ? <Holidays /> : <Navigate to="/login" />} 
         />
      </Routes>
    </Router>
  );
}

export default App;