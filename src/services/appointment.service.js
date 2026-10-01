const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const {
  ROLES,
  APPOINTMENT_STATUS,
  STATUS_TRANSITIONS,
  ROLE_ALLOWED_TARGETS,
} = require("../constants");
const { getDaySlots } = require("./slotService");
const { toClinicDateString } = require("../utils/generateSlots");

const slotTakenError = () =>
  ApiError.conflict("Slot already booked", [
    { field: "startTime", issue: "This slot is no longer available" },
  ]);

// ---------------- BOOK ----------------
async function book({ patientId, doctorId, startTime }) {
  const start = new Date(startTime);

  if (start.getTime() <= Date.now()) {
    throw ApiError.unprocessable("You cannot book a slot in the past");
  }

  // ১) client শুধু startTime পাঠায়; endTime আমরা নিজেরা বের করি
  const { slots } = await getDaySlots(doctorId, toClinicDateString(start));
  const slot = slots.find((s) => new Date(s.startTime).getTime() === start.getTime());
  if (!slot) {
    throw ApiError.unprocessable("This is not one of the doctor's available slots", [
      { field: "startTime", issue: "Invalid slot for this doctor" },
    ]);
  }
  const end = new Date(slot.endTime);

  // ২) atomic booking
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.appointment.findUnique({
        where: { doctorId_startTime: { doctorId, startTime: start } },
      });

      if (existing && existing.status !== APPOINTMENT_STATUS.CANCELLED) {
        throw slotTakenError();
      }

      // cancelled row টাকেই পুনর্ব্যবহার করি (compare-and-set)
      if (existing) {
        const { count } = await tx.appointment.updateMany({
          where: { id: existing.id, status: APPOINTMENT_STATUS.CANCELLED },
          data: {
            patientId,
            endTime: end,
            status: APPOINTMENT_STATUS.PENDING,
            createdAt: new Date(),
          },
        });
        if (count === 0) throw slotTakenError();
        return tx.appointment.findUnique({ where: { id: existing.id } });
      }

      return tx.appointment.create({
        data: { patientId, doctorId, startTime: start, endTime: end },
      });
    });
  } catch (err) {
    if (err.code === "P2002") throw slotTakenError(); // DB এর UNIQUE constraint শেষ পাহারাদার
    throw err;
  }
}

// ---------------- LIST MINE ----------------
async function listMine(user, { status, page, limit }) {
  const where = {};

  if (user.role === ROLES.PATIENT) {
    where.patientId = user.id;
  } else if (user.role === ROLES.DOCTOR) {
    // ⚠️ Appointment.doctorId = DoctorProfile.id, User.id নয়
    const profile = await prisma.doctorProfile.findUnique({ where: { userId: user.id } });
    if (!profile) throw ApiError.notFound("Doctor profile not found");
    where.doctorId = profile.id;
  }
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { startTime: "desc" },
      include: {
        doctor: {
          select: { id: true, specialty: true, fee: true, location: true, user: { select: { name: true } } },
        },
        patient: { select: { id: true, name: true, phone: true, email: true } },
        review: { select: { id: true, rating: true } },
      },
    }),
    prisma.appointment.count({ where }),
  ]);

  return {
    appointments: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ---------------- UPDATE STATUS ----------------
async function updateStatus(id, user, newStatus) {
  const appt = await prisma.appointment.findUnique({
    where: { id },
    include: { doctor: { select: { userId: true } } },
  });
  if (!appt) throw ApiError.notFound("Appointment not found");

  // (১) Object-level authorization
  const owns =
    user.role === ROLES.ADMIN ||
    (user.role === ROLES.PATIENT && appt.patientId === user.id) ||
    (user.role === ROLES.DOCTOR && appt.doctor.userId === user.id);
  if (!owns) throw ApiError.forbidden("You can only manage your own appointments");

  // (২) Role rule
  if (!ROLE_ALLOWED_TARGETS[user.role].includes(newStatus)) {
    throw ApiError.forbidden(`A ${user.role.toLowerCase()} cannot set status to ${newStatus}`);
  }

  // (৩) State machine
  if (!STATUS_TRANSITIONS[appt.status].includes(newStatus)) {
    throw ApiError.unprocessable(`Cannot change status from ${appt.status} to ${newStatus}`);
  }

  // (৪) ভিজিটের আগে COMPLETED নয় (শুধু production এ, যাতে dev এ টেস্ট করা যায়)
  if (
    newStatus === APPOINTMENT_STATUS.COMPLETED &&
    process.env.NODE_ENV === "production" &&
    appt.startTime.getTime() > Date.now()
  ) {
    throw ApiError.unprocessable("An appointment can only be completed after its start time");
  }

  // Compare-and-set
  const { count } = await prisma.appointment.updateMany({
    where: { id, status: appt.status },
    data: { status: newStatus },
  });
  if (count === 0) throw ApiError.conflict("Appointment was changed by someone else. Refresh and retry.");

  return prisma.appointment.findUnique({
    where: { id },
    include: { doctor: { select: { user: { select: { name: true } } } } },
  });
}

module.exports = { book, listMine, updateStatus };       