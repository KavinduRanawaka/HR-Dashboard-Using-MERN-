const mongoose = require('mongoose');

const HolidaySchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true }, // The specific date
  name: { type: String, required: true } // e.g., "Poya Day", "Christmas"
});

module.exports = mongoose.model('Holiday', HolidaySchema);