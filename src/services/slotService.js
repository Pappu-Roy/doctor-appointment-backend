const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const { generateSlots, clinicDayRange } = require("../utils/generateSlots");

async function getDaySlots(doctorId, dateStr) {
  const doctor = await prisma.doctorProfile.findFirst({
    where: { id: doctorId, isVerified: true, isDeleted: false },
    include: { availability: true },
  });
  if (!doctor) throw ApiError.notFound("Doctor not found");

  const { start, end } = clinicDayRange(dateStr);

  // CANCELLED এর slot আবার ফাঁকা, তাই শুধু PENDING/CONFIRMED ধরছি
  const booked = await prisma.appointment.findMany({
    where: {
      doctorId,
      startTime: { gte: start, lt: end },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    select: { startTime: true },
  });

  const slots = generateSlots({
    dateStr,
    availability: doctor.availability,
    bufferTime: doctor.bufferTime,
    bookedStarts: booked.map((b) => b.startTime),
  });

  return { bufferTime: doctor.bufferTime, slots };
}

module.exports = { getDaySlots };