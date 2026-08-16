const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const { ROLES } = require("../constants");

// Public search — only verified, non-deleted doctors should ever show up
// here. An unverified doctor's profile simply doesn't exist to a patient.
async function listDoctors({ page, limit, specialty, location }) {
  const where = {
    isVerified: true,
    isDeleted: false,
    ...(specialty && { specialty: { contains: specialty, mode: "insensitive" } }),
    ...(location && { location: { contains: location, mode: "insensitive" } }),
  };

  // Run both queries together instead of one-after-another — cuts the
  // round-trip time roughly in half compared to two sequential awaits.
  const [doctors, total] = await Promise.all([
    prisma.doctorProfile.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        specialty: true,
        experience: true,
        fee: true,
        location: true,
        bio: true,
        user: { select: { name: true } },
      },
    }),
    prisma.doctorProfile.count({ where }),
  ]);

  return {
    doctors,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getDoctorById(id) {
  const doctor = await prisma.doctorProfile.findFirst({
    where: { id, isVerified: true, isDeleted: false },
    include: {
      user: { select: { name: true, email: true } },
      availability: true,
    },
  });

  // Same 404 whether the id doesn't exist or the doctor just isn't
  // verified yet — we don't want to leak which profiles are "pending".
  if (!doctor) throw ApiError.notFound("Doctor not found");
  return doctor;
}

// Shared ownership check used by both updateProfile and setAvailability.
// A doctor can only touch their own profile; an admin can touch any.
async function assertOwnership(doctorProfileId, requestingUser) {
  const profile = await prisma.doctorProfile.findUnique({ where: { id: doctorProfileId } });
  if (!profile) throw ApiError.notFound("Doctor profile not found");

  const isOwner = profile.userId === requestingUser.id;
  const isAdmin = requestingUser.role === ROLES.ADMIN;
  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden("You can only modify your own profile");
  }
  return profile;
}

async function updateProfile(doctorProfileId, requestingUser, data) {
  await assertOwnership(doctorProfileId, requestingUser);

  return prisma.doctorProfile.update({
    where: { id: doctorProfileId },
    data, // only the fields the validator allowed through
  });
}

// Replaces the doctor's entire weekly availability in one atomic step.
// Simpler and safer than diffing old-vs-new slots for a weekly schedule.
async function setAvailability(doctorProfileId, requestingUser, slots) {
  await assertOwnership(doctorProfileId, requestingUser);

  return prisma.$transaction(async (tx) => {
    await tx.availability.deleteMany({ where: { doctorId: doctorProfileId } });
    await tx.availability.createMany({
      data: slots.map((slot) => ({ ...slot, doctorId: doctorProfileId })),
    });
    return tx.availability.findMany({ where: { doctorId: doctorProfileId } });
  });
}

module.exports = { listDoctors, getDoctorById, updateProfile, setAvailability };