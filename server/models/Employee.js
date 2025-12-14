const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  password: { type: String, default: "1234" },
  position: { type: String, required: true },
  category: { type: String, required: true, enum: ['Permanent', 'Trainee'] },
  traineePeriod: { type: String, default: null },
  
  // NEW FIELD: Joining Date (Defaults to "Now" if not provided)
  joiningDate: { type: Date, default: Date.now }, 

  leaves: {
    medical: [{ type: Date }], 
    authorized: [{ type: Date }] 
  },
  
  attendance: [{ type: Date }]
}, { timestamps: true });

module.exports = mongoose.model('Employee', EmployeeSchema);