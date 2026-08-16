const asyncHandler = require("../utils/asyncHandler");
const doctorService = require("../services/doctor.service");

const listDoctors = asyncHandler(async (req, res) => {
  const result = await doctorService.listDoctors(req.query);
  res.status(200).json({
    success: true,
    message: "Doctors fetched successfully",
    data: result.doctors,
    pagination: result.pagination,
  });
});

const getDoctorById = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorById(req.params.id);
  res.status(200).json({ success: true, message: "Doctor found", data: doctor });
});

const updateProfile = asyncHandler(async (req, res) => {
  const doctor = await doctorService.updateProfile(req.params.id, req.user, req.body);
  res.status(200).json({ success: true, message: "Profile updated", data: doctor });
});

const setAvailability = asyncHandler(async (req, res) => {
  const availability = await doctorService.setAvailability(req.params.id, req.user, req.body.slots);
  res.status(200).json({ success: true, message: "Availability updated", data: availability });
});

module.exports = { listDoctors, getDoctorById, updateProfile, setAvailability };