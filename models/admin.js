const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  email: String,
  mobile: String,
  password: String,

  otp: String,
  otpExpire: Date,
});

module.exports = mongoose.model("Admin", adminSchema);