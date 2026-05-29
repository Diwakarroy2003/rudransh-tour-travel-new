require("dotenv").config();
const express = require("express");
const path = require("path");

const session = require("express-session");

const mongoose = require("mongoose");
const Enquiry = require("./models/enquiry");
const Gallery = require("./models/gallery");
const Admin = require("./models/admin");
const Package = require("./models/package");
const Testimonial = require("./models/testimonial");
const HeroBanner = require("./models/heroBanner");

const nodemailer = require("nodemailer");
const multer = require("multer");
const upload = multer({
  dest: "uploads/",
});

const app = express();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ===========================
// EJS setup
// ===========================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ===========================
// Static files
// ===========================
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===========================
// Form data
// ===========================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    rolling: true,

    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 30,
      httpOnly: true,
    },
  })
);

// ===========================
// MongoDB
// ===========================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// ===========================
// Default admin
// ===========================
Admin.findOne({
  email: "diwakar11112003@gmail.com",
}).then((admin) => {
  if (!admin) {
    Admin.create({
      email: "diwakar11112003@gmail.com",
      password: "123456",
    });

    console.log("Default admin created");
  }
});

// ===========================
// PUBLIC ROUTES
// ===========================

// Home
app.get("/", async (req, res) => {
  try {
    const packages = await Package.find();
    const testimonials =
      await Testimonial.find();

    const heroBanner =
      await HeroBanner.findOne({
        isActive: true,
      });

    res.render("admin/index", {
      packages,
      testimonials,
      heroBanner,
    });
  } catch (error) {
    console.log(error);
    res.send("Error loading homepage");
  }
});

app.get("/activity", (req, res) => {
  res.render("admin/activity");
});

app.get("/destination", (req, res) => {
  res.render("admin/destination");
});

app.get("/hotels", (req, res) => {
  res.render("admin/hotels");
});

// Gallery
app.get("/gallery", async (req, res) => {
  try {
    const gallery = await Gallery.find();

    res.render("gallery", { gallery });
  } catch (error) {
    console.log(error);
    res.send("Error loading gallery");
  }
});

// Contact
app.get("/contact", (req, res) => {
  res.render("admin/contact");
});

// Contact form
app.post("/contact", async (req, res) => {
  try {
    await Enquiry.create(req.body);

    res.send("Thank you! Your enquiry has been submitted.");
  } catch (error) {
    console.log(error);
    res.send("Something went wrong");
  }
});

// Public testimonial submit
app.post("/testimonial", async (req, res) => {
  try {
    await Testimonial.create({
      name: req.body.name,
      message: req.body.message,
    });

    res.redirect("/");
  } catch (error) {
    console.log(error);
    res.send("Something went wrong");
  }
});

// ===========================
// ADMIN CHECK
// ===========================
function checkAdmin(req, res, next) {
  if (!req.session.adminId) {
    return res.redirect("/admin/login");
  }

  next();
}

// ===========================
// ADMIN LOGIN
// ===========================
app.get("/admin/login", (req, res) => {
  res.render("admin/login");
});

app.post("/admin/login", async (req, res) => {
  const admin = await Admin.findOne({
    email: req.body.email,
    password: req.body.password,
  });

 if (admin) {
  req.session.adminId = admin._id;

  if (req.body.remember) {
    req.session.cookie.maxAge =
      1000 * 60 * 60 * 24 * 30;
  } else {
    req.session.cookie.expires = false;
  }

  res.redirect("/admin/dashboard");
} else {
    res.send("Invalid email or password");
  }
});

app.get("/admin/forgot-password", (req, res) => {
  res.render("admin/forgot-password");
});

app.get("/admin/verify-otp", (req, res) => {
  res.render("admin/verify-otp");
});

app.post("/admin/forgot-password", async (req, res) => {
  const admin = await Admin.findOne({
    email: req.body.email,
  });

  if (!admin) {
    return res.send("Email not found");
  }

  const otp =
    Math.floor(100000 + Math.random() * 900000).toString();

  admin.otp = otp;
  admin.otpExpire =
    Date.now() + 5 * 60 * 1000;

  await admin.save();

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: admin.email,
    subject: "Rudransh Admin Password Reset OTP",
    text: `Your OTP is ${otp}. Valid for 5 minutes.`,
  });

  req.session.resetEmail = admin.email;

  res.redirect("/admin/verify-otp");
});

// ===========================
// DASHBOARD
// ===========================

app.post("/admin/verify-otp", async (req, res) => {
  const admin = await Admin.findOne({
    email: req.session.resetEmail,
    otp: req.body.otp,
  });

  if (
    !admin ||
    admin.otpExpire < Date.now()
  ) {
    return res.send("Invalid or expired OTP");
  }

  res.render("admin/reset-password");
});

app.post("/admin/reset-password", async (req, res) => {
  const admin = await Admin.findOne({
    email: req.session.resetEmail,
  });

  if (!admin) {
    return res.send("Admin not found");
  }

  admin.password = req.body.password;
  admin.otp = "";
  admin.otpExpire = null;

  await admin.save();

  req.session.resetEmail = null;

  res.redirect("/admin/login");
});

app.get("/admin/dashboard", checkAdmin, (req, res) => {
  res.render("admin/dashboard");
});

// ===========================
// LOGOUT
// ===========================
app.get("/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin/login");
  });
});

// ===========================
// ENQUIRIES
// ===========================
app.get("/admin/enquiries", checkAdmin, async (req, res) => {
  const enquiries = await Enquiry.find();

  res.render("admin/enquiries", { enquiries });
});

app.post(
  "/admin/enquiry/delete/:id",
  async (req, res) => {
    await Enquiry.findByIdAndDelete(
      req.params.id
    );

    res.redirect("/admin/enquiries");
  }
);

// ===========================
// GALLERY ADMIN
// ===========================
app.get("/admin/gallery", checkAdmin, async (req, res) => {
  const gallery = await Gallery.find();

  res.render("admin/gallery", { gallery });
});

app.post(
  "/admin/gallery/add",
  upload.single("image"),
  async (req, res) => {
    try {
      await Gallery.create({
        title: req.body.title,
        image: req.file.filename,
      });

      res.redirect("/admin/gallery");
    } catch (error) {
      console.log(error);
      res.send("Upload failed");
    }
  }
);


app.get("/admin/gallery/edit/:id", checkAdmin, async (req, res) => {
  const item = await Gallery.findById(req.params.id);

  res.render("admin/edit-gallery", { item });
});

app.post("/admin/gallery/update/:id", async (req, res) => {
  await Gallery.findByIdAndUpdate(
    req.params.id,
    {
      title: req.body.title,
    }
  );

  res.redirect("/admin/gallery");
});

app.post("/admin/gallery/delete/:id", async (req, res) => {
  await Gallery.findByIdAndDelete(req.params.id);

  res.redirect("/admin/gallery");
});

// ===========================
// PACKAGES ADMIN
// ===========================
app.get("/admin/package", checkAdmin, async (req, res) => {
  const packages = await Package.find();

  res.render("admin/package", { packages });
});

app.post("/admin/package/add", async (req, res) => {
  await Package.create(req.body);

  res.redirect("/admin/package");app.post(
  "/admin/package/add",
  upload.single("image"),
  async (req, res) => {
    try {
      await Package.create({
        title: req.body.title,
        price: req.body.price,
        duration: req.body.duration,
        image: req.file.filename,
      });

      res.redirect("/admin/package");
    } catch (error) {
      console.log(error);
      res.send("Package upload failed");
    }
  }
);
});

app.get("/admin/package/edit/:id", checkAdmin, async (req, res) => {
  const package = await Package.findById(req.params.id);

  res.render("admin/edit-package", { package });
});

app.post(
  "/admin/package/update/:id",
  upload.single("image"),
  async (req, res) => {
    try {
      const updateData = {
        title: req.body.title,
        price: req.body.price,
        description: req.body.description,
      };

      if (req.file) {
        updateData.image = req.file.filename;
      }

      await Package.findByIdAndUpdate(
        req.params.id,
        updateData
      );

      res.redirect("/admin/package");
    } catch (error) {
      console.log(error);
      res.send("Update failed");
    }
  }
);

app.post("/admin/package/delete/:id", async (req, res) => {
  await Package.findByIdAndDelete(req.params.id);

  res.redirect("/admin/package");
});


app.get("/admin/banner", checkAdmin, async (req, res) => {
  const banners = await HeroBanner.find();

  res.render("admin/banner", {
    banners,
  });
});

app.post(
  "/admin/banner/add",
  upload.single("image"),
  async (req, res) => {
    await HeroBanner.create({
      title: req.body.title,
      subtitle: req.body.subtitle,
      buttonText: req.body.buttonText,
      buttonLink: req.body.buttonLink,
      image: req.file.filename,
      isActive: false,
    });

    res.redirect("/admin/banner");
  }
);

app.post(
  "/admin/banner/activate/:id",
  async (req, res) => {
    await HeroBanner.updateMany(
      {},
      { isActive: false }
    );

    await HeroBanner.findByIdAndUpdate(
      req.params.id,
      { isActive: true }
    );

    res.redirect("/admin/banner");
  }
);

app.post(
  "/admin/banner/delete/:id",
  async (req, res) => {
    await HeroBanner.findByIdAndDelete(
      req.params.id
    );

    res.redirect("/admin/banner");
  }
);
// ===========================
// TESTIMONIAL ADMIN
// ===========================
app.get("/admin/testimonial", checkAdmin, async (req, res) => {
  const testimonials = await Testimonial.find();

  res.render("admin/testimonial", { testimonials });
});

app.post("/admin/testimonial/add", async (req, res) => {
  await Testimonial.create(req.body);

  res.redirect("/admin/testimonial");
});

app.post("/admin/testimonial/delete/:id", async (req, res) => {
  await Testimonial.findByIdAndDelete(req.params.id);

  res.redirect("/admin/testimonial");
});

// ===========================
// 404
// ===========================
app.use((req, res) => {
  res.status(404).send("Page not found");
});

// ===========================
// START SERVER
// ===========================
app.listen(process.env.PORT || 3000, () => {
  console.log("Server running on port 3000");
});