const mongoose = require("mongoose");

const heroBannerSchema = new mongoose.Schema({
  title: String,
  subtitle: String,
  buttonText: String,
  buttonLink: String,
  image: String,

  isActive: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model(
  "HeroBanner",
  heroBannerSchema
);