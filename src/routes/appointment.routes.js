const express = require('express');
const router = express.Router();
const { bookAppointment, getMyAppointments, updateAppointmentStatus } = require('../controllers/appointment.controller.js');
const { protect } = require('../middlewares/auth.js'); // আপনার auth.js এর middleware

// সব রাউটে protect মিডলওয়্যার দেওয়া হলো, যাতে লগইন ছাড়া কেউ কল করতে না পারে[cite: 1]
router.use(protect); 

router.post('/', bookAppointment);
router.get('/my', getMyAppointments); // GET /api/appointments/my[cite: 1]
router.patch('/:id/status', updateAppointmentStatus); // PATCH /api/appointments/:id/status[cite: 1]

module.exports = router;