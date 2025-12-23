import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import AddEmployee from './pages/AddEmployee';
import SeeEmployee from './pages/SeeEmployee';
import EditEmployee from './pages/EditEmployee';
import EmployeeProfile from './pages/EmployeeProfile';
import Holidays from './pages/Holidays';

function App() {
  return (
    <Router>
      {/* Navbar is always visible now */}
      <Navbar />

      <Routes>
        {/* --- HR / ADMIN ROUTES (Open to everyone) --- */}
        <Route path="/" element={<Home />} />
        <Route path="/add-employee" element={<AddEmployee />} />
        <Route path="/see-employee" element={<SeeEmployee />} />
        <Route path="/edit-employee/:id" element={<EditEmployee />} />
        <Route path="/holidays" element={<Holidays />} />

        {/* --- EMPLOYEE PROFILE --- */}
        <Route path="/my-profile" element={<EmployeeProfile />} />
        
      </Routes>
    </Router>
  );
}

export default App;