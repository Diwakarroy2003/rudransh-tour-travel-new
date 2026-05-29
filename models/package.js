const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema({
  title: String,
  price: String,
  duration: String,
  image: String,
});

module.exports = mongoose.model("Package", packageSchema);