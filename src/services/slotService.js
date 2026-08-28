const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const moment = require('moment'); // Time calculation এর জন্য

const generateSlots = async (doctorId, date) => {
    // ১. নির্দিষ্ট দিনের availability এবং ডাক্তারের bufferTime বের করা
    const dayOfWeek = moment(date).day(); // 0 (Sunday) to 6 (Saturday)
    
    const doctor = await prisma.doctorProfile.findUnique({
        where: { id: doctorId },
        include: { availability: { where: { dayOfWeek } } }
    });

    if (!doctor || doctor.availability.length === 0) return [];

    const bufferTime = doctor.bufferTime; // ডিফল্ট ৫ মিনিট
    const slots = [];

    // ২. ইতিমধ্যে বুক করা স্লটগুলো বের করা (যাতে double booking না হয়)
    const bookedAppointments = await prisma.appointment.findMany({
        where: {
            doctorId,
            startTime: {
                gte: moment(date).startOf('day').toDate(),
                lte: moment(date).endOf('day').toDate()
            },
            status: { in: ['PENDING', 'CONFIRMED'] }
        }
    });
    
    const bookedTimes = bookedAppointments.map(app => app.startTime.toISOString());

    // ৩. Availability অনুযায়ী ৩০ মিনিটের স্লট তৈরি (bufferTime সহ)
    doctor.availability.forEach(avail => {
        let currentTime = moment(`${date} ${avail.startTime}`, 'YYYY-MM-DD HH:mm');
        const endTime = moment(`${date} ${avail.endTime}`, 'YYYY-MM-DD HH:mm');

        while (currentTime.clone().add(30, 'minutes').isSameOrBefore(endTime)) {
            const slotStart = currentTime.toDate().toISOString();
            
            // যদি স্লটটি আগে থেকে বুক করা না থাকে
            if (!bookedTimes.includes(slotStart)) {
                slots.push({
                    startTime: slotStart,
                    endTime: currentTime.clone().add(30, 'minutes').toDate().toISOString()
                });
            }
            // পরবর্তী স্লটের জন্য ৩০ মিনিট + বাফার টাইম যোগ করা
            currentTime.add(30 + bufferTime, 'minutes');
        }
    });

    return slots;
};

module.exports = { generateSlots };