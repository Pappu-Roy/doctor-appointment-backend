const express = require("express");
const authRoutes = require("./auth.routes");
// Day 2+: const doctorRoutes = require("./doctor.routes");
// Day 3+: const appointmentRoutes = require("./appointment.routes");
// Day 4+: const reviewRoutes = require("./review.routes");
// Day 4+: const adminRoutes = require("./admin.routes");

const router = express.Router();

router.use("/auth", authRoutes);
// router.use("/doctors", doctorRoutes);
// router.use("/appointments", appointmentRoutes);
// router.use("/reviews", reviewRoutes);
// router.use("/admin", adminRoutes);

module.exports = router;
