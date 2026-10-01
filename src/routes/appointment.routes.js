const express = require("express");
const controller = require("../controllers/appointment.controller");
const validate = require("../middlewares/validate");
const { protect, allowRoles } = require("../middlewares/auth");
const { ROLES } = require("../constants");
const {
  createAppointmentSchema, listMyAppointmentsSchema, updateStatusSchema,
} = require("../validators/appointment.validator");

const router = express.Router();
router.use(protect); // সব route এ আগে login লাগবে

router.post("/", allowRoles(ROLES.PATIENT), validate(createAppointmentSchema), controller.bookAppointment);
router.get("/my", validate(listMyAppointmentsSchema), controller.getMyAppointments);
router.patch("/:id/status", validate(updateStatusSchema), controller.updateAppointmentStatus);

module.exports = router;