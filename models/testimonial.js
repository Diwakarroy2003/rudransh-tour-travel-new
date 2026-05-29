const mongoose = require("mongoose");

const testimonialSchema = new mongoose.Schema({
  name: String,
  city: String,
  rating: String,
  package: String,
  message: String,
});

module.exports = mongoose.model("Testimonial", testimonialSchema);