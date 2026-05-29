const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  packageType: String,
  travelMonth: String,
  pilgrims: String,
  departureCity: String,
  message: String,
});

module.exports = mongoose.model("Enquiry", enquirySchema);