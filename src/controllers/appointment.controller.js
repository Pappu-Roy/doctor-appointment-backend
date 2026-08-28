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

// ইউজারের নিজের অথবা ডাক্তারের বুকিং লিস্ট দেখার API
const getMyAppointments = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role; // JWT থেকে আসবে
        const { status, page = 1, limit = 10 } = req.query; // Pagination এর জন্য

        const skip = (page - 1) * limit;
        
        // ফিল্টার লজিক: পেশেন্ট হলে patientId দিয়ে খুঁজবে, ডাক্তার হলে doctorId দিয়ে
        let whereCondition = userRole === 'PATIENT' ? { patientId: userId } : { doctorId: userId };
        
        if (status) {
            whereCondition.status = status; // নির্দিষ্ট স্ট্যাটাস (যেমন: PENDING) দিয়ে ফিল্টার
        }

        const appointments = await prisma.appointment.findMany({
            where: whereCondition,
            skip: parseInt(skip),
            take: parseInt(limit),
            orderBy: { startTime: 'desc' }, // নতুন বুকিংগুলো আগে দেখাবে
            include: {
                // রোগীর ক্ষেত্রে ডাক্তারের তথ্য এবং ডাক্তারের ক্ষেত্রে রোগীর নাম পাঠাবো
                doctor: userRole === 'PATIENT' ? { select: { specialty: true, user: { select: { name: true } } } } : false,
                patient: userRole === 'DOCTOR' ? { select: { name: true, phone: true } } : false
            }
        });

        res.status(200).json({ success: true, data: appointments });
    } catch (error) {
        next(error);
    }
};

// অ্যাপয়েন্টমেন্ট স্ট্যাটাস আপডেট (Confirm/Cancel/Complete) করার API[cite: 1]
const updateAppointmentStatus = async (req, res, next) => {
    try {
        const { id } = req.params; // URL থেকে অ্যাপয়েন্টমেন্ট ID
        const { status } = req.body; // রিকুয়েস্ট বডি থেকে নতুন স্ট্যাটাস
        const userRole = req.user.role;

        // State Diagram অনুযায়ী[cite: 1]: পেশেন্ট শুধু CANCEL করতে পারবে, ডাক্তার CONFIRM/COMPLETED/CANCELLED করতে পারবে
        if (userRole === 'PATIENT' && status !== 'CANCELLED') {
            return res.status(403).json({ success: false, message: "রোগী শুধুমাত্র বুকিং বাতিল করতে পারবেন।" });
        }

        const updatedAppointment = await prisma.appointment.update({
            where: { id: id },
            data: { status: status }
        });

        res.status(200).json({ success: true, data: updatedAppointment, message: `স্ট্যাটাস ${status} এ আপডেট হয়েছে।` });
    } catch (error) {
        next(error);
    }
};

module.exports = { bookAppointment, getMyAppointments, updateAppointmentStatus }; // আগেরটার সাথে এক্সপোর্ট করুন