const express = require("express");
const doctorController = require("../controllers/doctor.controller");
const validate = require("../middlewares/validate");
const { protect, allowRoles } = require("../middlewares/auth");
const { ROLES } = require("../constants");
const {
  listDoctorsQuerySchema,
  updateDoctorProfileSchema,
  availabilitySchema,
} = require("../validators/doctor.validator");

const router = express.Router();

// --- Public routes (no login needed — patients browsing before signup) ---
router.get("/", validate(listDoctorsQuerySchema), doctorController.listDoctors);
router.get("/:id", doctorController.getDoctorById);

// --- Protected routes ---
// Order matters: protect (are you logged in?) -> allowRoles (are you the
// right role?) -> validate (is your data shaped correctly?) -> controller.
// Checking identity before parsing the body avoids wasting work validating
// a request that was going to be rejected anyway.
router.put(
  "/:id",
  protect,
  allowRoles(ROLES.DOCTOR, ROLES.ADMIN),
  validate(updateDoctorProfileSchema),
  doctorController.updateProfile
);

router.put(
  "/:id/availability",
  protect,
  allowRoles(ROLES.DOCTOR, ROLES.ADMIN),
  validate(availabilitySchema),
  doctorController.setAvailability
);

module.exports = router;