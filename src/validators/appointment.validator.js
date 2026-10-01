const { z } = require("zod");

const createAppointmentSchema = z.object({
  body: z.object({
    doctorId: z.string().uuid("Invalid doctor id"),
    startTime: z.string().datetime({ offset: true, message: "startTime must be an ISO datetime" }),
  }),
});

const listMyAppointmentsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(10),
    status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]).optional(),
  }),
});

const updateStatusSchema = z.object({
  params: z.object({ id: z.string().uuid("Invalid appointment id") }),
  body: z.object({
    status: z.enum(["CONFIRMED", "COMPLETED", "CANCELLED"], {
      errorMap: () => ({ message: "status must be CONFIRMED, COMPLETED or CANCELLED" }),
    }),
  }),
});

module.exports = { createAppointmentSchema, listMyAppointmentsSchema, updateStatusSchema };