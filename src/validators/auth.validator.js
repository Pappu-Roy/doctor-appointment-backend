const { z } = require("zod");
const { ROLES } = require("../constants");

const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    email: z.string().trim().toLowerCase().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    phone: z.string().trim().optional(),
    // Only patient/doctor can self-register; admin accounts are seeded separately.
    role: z.enum([ROLES.PATIENT, ROLES.DOCTOR]).default(ROLES.PATIENT),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  }),
});

module.exports = { registerSchema, loginSchema };
