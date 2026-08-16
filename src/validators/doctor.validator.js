const { z } = require("zod");

// GET /api/doctors?page=1&limit=10&specialty=cardio&location=dhaka
// z.coerce.number() is important here — query params always arrive as
// strings ("1", "10"), coerce converts them to actual numbers so Prisma's
// skip/take don't choke on "1" + 1 = "11" string concatenation bugs.
const listDoctorsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(10),
    specialty: z.string().trim().optional(),
    location: z.string().trim().optional(),
  }),
});

// PUT /api/doctors/:id — every field optional because a doctor might only
// want to update their fee, not resend their whole profile.
const updateDoctorProfileSchema = z.object({
  params: z.object({ id: z.string().uuid("Invalid doctor id") }),
  body: z
    .object({
      specialty: z.string().trim().min(2).optional(),
      experience: z.coerce.number().int().min(0).optional(),
      fee: z.coerce.number().min(0).optional(),
      bufferTime: z.coerce.number().int().min(0).max(60).optional(),
      bio: z.string().trim().max(1000).optional(),
      location: z.string().trim().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required",
    }),
});

// PUT /api/doctors/:id/availability — replaces the doctor's whole weekly
// schedule in one call, e.g. [{ dayOfWeek: 0, startTime: "09:00", endTime: "13:00" }, ...]
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // "HH:mm", 24-hour

const availabilitySchema = z.object({
  params: z.object({ id: z.string().uuid("Invalid doctor id") }),
  body: z.object({
    slots: z
      .array(
        z
          .object({
            dayOfWeek: z.coerce.number().int().min(0).max(6),
            startTime: z.string().regex(timeRegex, "Use HH:mm format, e.g. 09:00"),
            endTime: z.string().regex(timeRegex, "Use HH:mm format, e.g. 13:00"),
          })
          .refine((slot) => slot.startTime < slot.endTime, {
            message: "startTime must be before endTime",
            path: ["endTime"],
          })
      )
      .min(1, "Provide at least one availability slot"),
  }),
});

module.exports = { listDoctorsQuerySchema, updateDoctorProfileSchema, availabilitySchema };