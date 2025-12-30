const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

// --- IMPORT MODELS ---
const Employee = require('./models/Employee');
const Holiday = require('./models/Holiday');

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGODB_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("DB Connection Error:", err));


// ==========================================
//  HELPER FUNCTIONS
// ==========================================

// 1. Check if ANY action (Attendance/Leave) has been taken today
const isActionTakenToday = (employee) => {
  const todayStr = new Date().toDateString();

  // Check Attendance
  const hasAttendance = employee.attendance.some(d => new Date(d).toDateString() === todayStr);
  
  // Check Medical Leaves (Safely handle if array doesn't exist)
  const medicalLeaves = Array.isArray(employee.leaves.medical) ? employee.leaves.medical : [];
  const hasMedical = medicalLeaves.some(d => new Date(d).toDateString() === todayStr);

  // Check Authorized Leaves
  const authLeaves = Array.isArray(employee.leaves.authorized) ? employee.leaves.authorized : [];
  const hasAuth = authLeaves.some(d => new Date(d).toDateString() === todayStr);

  if (hasAttendance) return "Attendance marked";
  if (hasMedical) return "Medical Leave taken";
  if (hasAuth) return "Authorized Leave taken";
  
  return null; // No action taken today
};

// 2. Check if Today is a Holiday in the Database
const checkHolidayToday = async () => {
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // Find a holiday that matches today's date range
  const holiday = await Holiday.findOne({
    date: { $gte: today, $lt: tomorrow }
  });

  return holiday; // Returns the holiday object or null
};


// ==========================================
//  ROUTES
// ==========================================

// --- AUTHENTICATION ---
app.post('/api/login', async (req, res) => {
  const { name, password } = req.body;
  
  // 1. HR Login Check (Credentials in .env)
  if (name === "admin" && password === process.env.HR_PASSWORD) {
    return res.json({ role: "admin", message: "HR Login Success" });
  }

  // 2. Employee Login Check
  try {
    const employee = await Employee.findOne({ name: name });
    // Default password is "1234" if not changed
    if (employee && employee.password === password) {
      return res.json({ role: "employee", id: employee._id, message: "Employee Login Success" });
    }
    res.status(401).json({ message: "Invalid Credentials" });
  } catch (err) {
    res.status(500).json(err);
  }
});

// --- EMPLOYEE CRUD OPERATIONS ---

// Create Employee
app.post('/api/employees', async (req, res) => {
  try {
    const { name } = req.body;
    // Prevent duplicate names (since Name is used as Username)
    const existingEmployee = await Employee.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });

    if (existingEmployee) {
      return res.status(400).json({ message: "Employee with this name already exists!" });
    }

    const newEmployee = new Employee(req.body);
    await newEmployee.save();
    res.status(201).json(newEmployee);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Get All Employees
app.get('/api/employees', async (req, res) => {
  try {
    const employees = await Employee.find();
    res.json(employees);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Update Employee (Promotions, Edits)
app.put('/api/employees/:id', async (req, res) => {
  try {
    const updatedEmployee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedEmployee);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Delete Employee
app.delete('/api/employees/:id', async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: "Employee deleted" });
  } catch (err) {
    res.status(500).json(err);
  }
});

// --- HOLIDAY MANAGEMENT ---

// Add Holiday
app.post('/api/holidays', async (req, res) => {
  try {
    const { date, name } = req.body;
    const newHoliday = new Holiday({ date, name });
    await newHoliday.save();
    res.status(201).json(newHoliday);
  } catch (err) {
    res.status(400).json({ message: "Error adding holiday (Date might exist)" });
  }
});

// Get Holidays
app.get('/api/holidays', async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    res.json(holidays);
  } catch (err) { res.status(500).json(err); }
});

// Delete Holiday
app.delete('/api/holidays/:id', async (req, res) => {
  try {
    await Holiday.findByIdAndDelete(req.params.id);
    res.json({ message: "Holiday deleted" });
  } catch (err) { res.status(500).json(err); }
});


// --- ACTIONS: ATTENDANCE & LEAVES ---

// Mark Attendance
app.post('/api/employees/:id/attendance', async (req, res) => {
  try {
    // 1. Check Holiday Block
    const isHoliday = await checkHolidayToday();
    if (isHoliday) {
      return res.status(400).json({ message: `Cannot mark Attendance: Today is ${isHoliday.name}!` });
    }

    const employee = await Employee.findById(req.params.id);
    
    // 2. Check "One Action Per Day" Rule
    const actionTaken = isActionTakenToday(employee);
    if (actionTaken) {
      return res.status(400).json({ message: `Cannot mark Attendance: ${actionTaken} today!` });
    }

    // 3. Save
    employee.attendance.push(new Date());
    await employee.save();
    res.json({ message: "Attendance marked", employee });
  } catch (err) {
    res.status(500).json(err);
  }
});

// Add Leave
app.post('/api/employees/:id/leave', async (req, res) => {
  const { type } = req.body; 
  try {
    // 1. Check Holiday Block
    const isHoliday = await checkHolidayToday();
    if (isHoliday) {
      return res.status(400).json({ message: `Cannot add Leave: Today is ${isHoliday.name}!` });
    }

    const employee = await Employee.findById(req.params.id);

    // 2. Check "One Action Per Day" Rule
    const actionTaken = isActionTakenToday(employee);
    if (actionTaken) {
      return res.status(400).json({ message: `Cannot add Leave: ${actionTaken} today!` });
    }

    // 3. Process Leave Type
    const today = new Date();
    
    // Logic: Saturday = 0.5, Other Days = 1.0
    const isSaturday = today.getDay() === 6; 
    const todayWeight = isSaturday ? 0.5 : 1.0;

    if (type === 'medical') {
      // Medical has no limit, just push date (Frontend handles warnings/extensions)
      employee.leaves.medical.push(today);
      
    } else if (type === 'authorized') {
      // Authorized has a limit of 1 per month
      const currentAuthDates = Array.isArray(employee.leaves.authorized) ? employee.leaves.authorized : [];
      
      // Calculate existing usage for THIS MONTH
      // (Note: The array is reset monthly by cron, so we can just sum the array)
      let currentTotal = 0;
      currentAuthDates.forEach(dateStr => {
        const d = new Date(dateStr);
        currentTotal += (d.getDay() === 6 ? 0.5 : 1.0);
      });

      // Check Limit
      if (currentTotal + todayWeight > 1) {
        return res.status(400).json({ 
          message: `Limit Reached! Used: ${currentTotal}/1. Adding today (${todayWeight}) exceeds limit.` 
        });
      }

      employee.leaves.authorized.push(today);
      
    } else {
      return res.status(400).json({ message: "Invalid leave type" });
    }

    await employee.save();
    res.json({ message: "Leave approved", employee });
  } catch (err) {
    res.status(500).json(err);
  }
});


// ==========================================
//  CRON JOB (Reset Monthly)
// ==========================================
// Runs at 00:00 on the 1st of every month
cron.schedule('0 0 1 * *', async () => {
  console.log("Running Monthly Reset Job...");
  try {
    await Employee.updateMany({}, {
      $set: { 'leaves.authorized': [] } // ONLY reset Authorized leaves
    });
    console.log("Authorized leaves reset successfully.");
  } catch (err) {
    console.error("Error in Cron Job:", err);
  }
});

// 12. Delete Specific Attendance Record
app.delete('/api/employees/:id/attendance', async (req, res) => {
  const { date } = req.body; // Expecting the date string to remove
  try {
    const employee = await Employee.findById(req.params.id);
    
    // Filter out the specific date (Compare ISO strings for accuracy)
    const targetDate = new Date(date).toISOString();
    employee.attendance = employee.attendance.filter(d => 
      new Date(d).toISOString() !== targetDate
    );
    
    await employee.save();
    res.json({ message: "Attendance record removed", employee });
  } catch (err) {
    res.status(500).json(err);
  }
});

// 13. Delete Specific Leave Record
app.delete('/api/employees/:id/leave', async (req, res) => {
  const { type, date } = req.body; // Type: 'medical' or 'authorized'
  try {
    const employee = await Employee.findById(req.params.id);
    const targetDate = new Date(date).toISOString();

    if (type === 'medical') {
      employee.leaves.medical = employee.leaves.medical.filter(d => 
        new Date(d).toISOString() !== targetDate
      );
    } else if (type === 'authorized') {
      employee.leaves.authorized = employee.leaves.authorized.filter(d => 
        new Date(d).toISOString() !== targetDate
      );
    }

    await employee.save();
    res.json({ message: "Leave record removed", employee });
  } catch (err) {
    res.status(500).json(err);
  }
});
// ==========================================
//  START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));