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
//  HELPER FUNCTIONS (CRITICAL UPDATE HERE)
// ==========================================

// 1. Check if ANY action has been taken on a SPECIFIC DATE
// (Old code checked "new Date()", this code checks "dateInput")
const isActionTakenOnDate = (employee, dateInput) => {
  const targetStr = new Date(dateInput).toDateString();

  // Check Attendance
  const hasAttendance = employee.attendance.some(d => new Date(d).toDateString() === targetStr);
  
  // Check Medical Leaves
  const medicalLeaves = Array.isArray(employee.leaves.medical) ? employee.leaves.medical : [];
  const hasMedical = medicalLeaves.some(d => new Date(d).toDateString() === targetStr);

  // Check Authorized Leaves
  const authLeaves = Array.isArray(employee.leaves.authorized) ? employee.leaves.authorized : [];
  const hasAuth = authLeaves.some(d => new Date(d).toDateString() === targetStr);

  if (hasAttendance) return "Attendance marked";
  if (hasMedical) return "Medical Leave taken";
  if (hasAuth) return "Authorized Leave taken";
  
  return null; // No action taken on this date
};

// 2. Check if specific date is a Holiday
const checkHolidayOnDate = async (dateInput) => {
  const target = new Date(dateInput);
  target.setHours(0,0,0,0);
  
  const nextDay = new Date(target);
  nextDay.setDate(target.getDate() + 1);

  const holiday = await Holiday.findOne({
    date: { $gte: target, $lt: nextDay }
  });

  return holiday; 
};


// ==========================================
//  ROUTES
// ==========================================

// --- AUTHENTICATION ---
app.post('/api/login', async (req, res) => {
  const { name, password } = req.body;
  if (name === "admin" && password === process.env.HR_PASSWORD) {
    return res.json({ role: "admin", message: "HR Login Success" });
  }
  try {
    const employee = await Employee.findOne({ name: name });
    if (employee && employee.password === password) {
      return res.json({ role: "employee", id: employee._id, message: "Employee Login Success" });
    }
    res.status(401).json({ message: "Invalid Credentials" });
  } catch (err) { res.status(500).json(err); }
});

// --- EMPLOYEE CRUD ---
app.post('/api/employees', async (req, res) => {
  try {
    const { name } = req.body;
    const existingEmployee = await Employee.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingEmployee) return res.status(400).json({ message: "Employee already exists!" });

    const newEmployee = new Employee(req.body);
    await newEmployee.save();
    res.status(201).json(newEmployee);
  } catch (err) { res.status(500).json(err); }
});

app.get('/api/employees', async (req, res) => {
  try {
    const employees = await Employee.find();
    res.json(employees);
  } catch (err) { res.status(500).json(err); }
});

app.put('/api/employees/:id', async (req, res) => {
  try {
    const updatedEmployee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedEmployee);
  } catch (err) { res.status(500).json(err); }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: "Employee deleted" });
  } catch (err) { res.status(500).json(err); }
});

// --- HOLIDAY MANAGEMENT ---
app.post('/api/holidays', async (req, res) => {
  try {
    const { date, name } = req.body;
    const newHoliday = new Holiday({ date, name });
    await newHoliday.save();
    res.status(201).json(newHoliday);
  } catch (err) { res.status(400).json({ message: "Error adding holiday" }); }
});

app.get('/api/holidays', async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    res.json(holidays);
  } catch (err) { res.status(500).json(err); }
});

app.delete('/api/holidays/:id', async (req, res) => {
  try {
    await Holiday.findByIdAndDelete(req.params.id);
    res.json({ message: "Holiday deleted" });
  } catch (err) { res.status(500).json(err); }
});


// ==========================================
//  ACTIONS: ATTENDANCE & LEAVES (UPDATED)
// ==========================================

// Mark Attendance (Now supports specific dates)
app.post('/api/employees/:id/attendance', async (req, res) => {
  try {
    // 1. Determine Date (Passed from frontend or default to Now)
    const dateToMark = req.body.date ? new Date(req.body.date) : new Date();

    // 2. Check Holiday
    const isHoliday = await checkHolidayOnDate(dateToMark);
    if (isHoliday) {
      return res.status(400).json({ message: `Cannot mark Attendance: ${isHoliday.name}!` });
    }

    const employee = await Employee.findById(req.params.id);
    
    // 3. Check "One Action Per Day" Rule
    // (We pass dateToMark here instead of leaving it empty)
    const actionTaken = isActionTakenOnDate(employee, dateToMark);
    if (actionTaken) {
      return res.status(400).json({ message: `Cannot mark Attendance: ${actionTaken} on this date!` });
    }

    // 4. Save
    employee.attendance.push(dateToMark);
    await employee.save();
    res.json({ message: "Attendance marked", employee });
  } catch (err) {
    res.status(500).json(err);
  }
});

// Add Leave (Now supports specific dates)
app.post('/api/employees/:id/leave', async (req, res) => {
  const { type, date } = req.body; 
  try {
    // 1. Determine Date
    const dateToMark = date ? new Date(date) : new Date();

    // 2. Check Holiday
    const isHoliday = await checkHolidayOnDate(dateToMark);
    if (isHoliday) {
      return res.status(400).json({ message: `Cannot add Leave: ${isHoliday.name}!` });
    }

    const employee = await Employee.findById(req.params.id);

    // 3. Check "One Action Per Day" Rule
    const actionTaken = isActionTakenOnDate(employee, dateToMark);
    if (actionTaken) {
      return res.status(400).json({ message: `Cannot add Leave: ${actionTaken} on this date!` });
    }

    // 4. Process Leave Type
    const isSaturday = dateToMark.getDay() === 6; 
    const dayWeight = isSaturday ? 0.5 : 1.0;

    if (type === 'medical') {
      employee.leaves.medical.push(dateToMark);
      
    } else if (type === 'authorized') {
      // Calculate usage (Simplistic: sums current array)
      const currentAuthDates = Array.isArray(employee.leaves.authorized) ? employee.leaves.authorized : [];
      
      let currentTotal = 0;
      currentAuthDates.forEach(dateStr => {
        const d = new Date(dateStr);
        currentTotal += (d.getDay() === 6 ? 0.5 : 1.0);
      });

      if (currentTotal + dayWeight > 1) {
        return res.status(400).json({ 
          message: `Limit Reached! Used: ${currentTotal}/1. This adds ${dayWeight}.` 
        });
      }
      employee.leaves.authorized.push(dateToMark);
      
    } else {
      return res.status(400).json({ message: "Invalid leave type" });
    }

    await employee.save();
    res.json({ message: "Leave approved", employee });
  } catch (err) {
    res.status(500).json(err);
  }
});

// Delete Specific Attendance Record
app.delete('/api/employees/:id/attendance', async (req, res) => {
  const { date } = req.body;
  try {
    const employee = await Employee.findById(req.params.id);
    const targetDate = new Date(date).toISOString();
    employee.attendance = employee.attendance.filter(d => 
      new Date(d).toISOString() !== targetDate
    );
    await employee.save();
    res.json({ message: "Attendance record removed", employee });
  } catch (err) { res.status(500).json(err); }
});

// Delete Specific Leave Record
app.delete('/api/employees/:id/leave', async (req, res) => {
  const { type, date } = req.body;
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
  } catch (err) { res.status(500).json(err); }
});

// --- CRON JOB (Reset Monthly) ---
cron.schedule('0 0 1 * *', async () => {
  console.log("Running Monthly Reset Job...");
  try {
    await Employee.updateMany({}, { $set: { 'leaves.authorized': [] } });
    console.log("Authorized leaves reset successfully.");
  } catch (err) { console.error("Error in Cron Job:", err); }
});



const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;