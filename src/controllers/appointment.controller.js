const asyncHandler = require("../utils/asyncHandler");
const appointmentService = require("../services/appointment.service");

const bookAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.book({
    patientId: req.user.id, // JWT থেকে, body থেকে কখনোই নয়
    doctorId: req.body.doctorId,
    startTime: req.body.startTime,
  });
  res.status(201).json({ success: true, message: "Appointment booked", data: appointment });
});

const getMyAppointments = asyncHandler(async (req, res) => {
  const result = await appointmentService.listMine(req.user, req.query);
  res.status(200).json({
    success: true, message: "Appointments fetched",
    data: result.appointments, pagination: result.pagination,
  });
});

const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.updateStatus(req.params.id, req.user, req.body.status);
  res.status(200).json({
    success: true, message: `Appointment ${appointment.status.toLowerCase()}`, data: appointment,
  });
});

module.exports = { bookAppointment, getMyAppointments, updateAppointmentStatus };