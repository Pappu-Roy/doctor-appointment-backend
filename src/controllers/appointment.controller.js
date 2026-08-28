const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const bookAppointment = async (req, res, next) => {
    try {
        const { doctorId, startTime, endTime } = req.body;
        const patientId = req.user.id; // JWT Auth middleware থেকে আসবে

        // Transaction ব্যবহার করে atomic operation নিশ্চিত করা[cite: 1]
        const appointment = await prisma.$transaction(async (tx) => {
            // ১. স্লটটি ফাঁকা আছে কিনা চেক করা
            const existingBooking = await tx.appointment.findFirst({
                where: { doctorId, startTime: new Date(startTime), status: { not: 'CANCELLED' } }
            });

            if (existingBooking) {
                throw new Error("Conflict"); // 409 Conflict Error[cite: 1]
            }

            // ২. নতুন বুকিং ইনসার্ট করা
            return await tx.appointment.create({
                data: {
                    patientId,
                    doctorId,
                    startTime: new Date(startTime), // Database-এ UTC টাইমে সেভ হবে[cite: 1]
                    endTime: new Date(endTime),
                    status: 'PENDING'
                }
            });
        });

        res.status(201).json({ success: true, data: appointment });
    } catch (error) {
        if (error.message === "Conflict") {
            return res.status(409).json({ success: false, message: "Slot already booked" });
        }
        next(error);
    }
};