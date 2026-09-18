import { Router } from 'express';
import { db } from '../db/index.ts';
import {
  users,
  studentBatches,
  attendance,
  performances,
  studentActivities,
  demoBookings,
  payments,
} from '../db/schema.ts';
import { desc } from 'drizzle-orm';

export const studentRouter = Router();

// Student portal data endpoint
studentRouter.get('/portal-data', async (req, res) => {
  try {
    const emailQuery = (req.query.email ? String(req.query.email) : '').trim().toLowerCase();
    const uidQuery = req.query.uid ? String(req.query.uid).trim() : '';

    const allUsers = await db.select().from(users);
    let student = allUsers.find(
      (u) =>
        (emailQuery && (u.email || '').toLowerCase() === emailQuery) ||
        (uidQuery && u.uid === uidQuery)
    );

    if (!student && (emailQuery || uidQuery)) {
      const studentEmail = emailQuery || `${uidQuery.slice(0, 8)}@student.quantumacademy.in`;
      const inserted = await db
        .insert(users)
        .values({
          uid: uidQuery || 'user_' + Date.now(),
          name: 'Student',
          email: studentEmail,
          role: 'Student',
        })
        .returning();
      student = inserted[0];
    }

    const effectiveEmail = student ? (student.email || '').toLowerCase() : emailQuery;
    const effectiveUid = student ? student.uid : uidQuery;

    // 1. Batch data
    const allBatches = await db.select().from(studentBatches);
    let batch = allBatches.find(
      (b) =>
        (effectiveEmail && (b.studentEmail || '').toLowerCase() === effectiveEmail) ||
        (effectiveUid && b.userId === effectiveUid)
    );

    if (!batch) {
      const newBatch = await db
        .insert(studentBatches)
        .values({
          userId: effectiveUid || null,
          studentEmail: effectiveEmail,
          studentName: student ? student.name : 'Student',
          batchName: 'Class 9–10: Science + Mathematics',
          timing: 'Mon, Wed, Fri • 4:00 PM – 5:30 PM',
          tutor: 'Rakesh Paul, M.Sc Physics',
          status: 'Active',
          startDate: '2026-09-01',
        })
        .returning();
      batch = newBatch[0];
    }

    // 2. Attendance logs
    const allAttendance = await db.select().from(attendance).orderBy(desc(attendance.date), desc(attendance.createdAt));
    let studentAttendance = allAttendance.filter(
      (a) =>
        (effectiveEmail && (a.studentEmail || '').toLowerCase() === effectiveEmail) ||
        (effectiveUid && a.userId === effectiveUid)
    );

    const totalClasses = studentAttendance.length;
    const attendedClasses = studentAttendance.filter((a) => a.status === 'Present').length;
    const attendancePercentage = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 100;

    // 3. Performances
    const allPerformances = await db.select().from(performances).orderBy(desc(performances.testDate), desc(performances.createdAt));
    let studentPerf = allPerformances.filter(
      (p) =>
        (effectiveEmail && (p.studentEmail || '').toLowerCase() === effectiveEmail) ||
        (effectiveUid && p.userId === effectiveUid)
    );

    const avgPerf =
      studentPerf.length > 0
        ? Math.round(
            studentPerf.reduce((acc, curr) => acc + (curr.marksObtained / curr.maxMarks) * 100, 0) /
              studentPerf.length
          )
        : 0;

    // 4. Activities
    const allActivities = await db.select().from(studentActivities).orderBy(desc(studentActivities.createdAt));
    let studentActs = allActivities.filter(
      (act) =>
        act.studentEmail === 'all' ||
        (effectiveEmail && (act.studentEmail || '').toLowerCase() === effectiveEmail) ||
        (effectiveUid && act.userId === effectiveUid)
    );

    // 5. Payments & Bookings
    const allPayments = await db.select().from(payments).orderBy(desc(payments.createdAt));
    const studentPayments = allPayments.filter(
      (p) =>
        (effectiveEmail && (p.email || '').toLowerCase() === effectiveEmail) ||
        (effectiveUid && p.userId === effectiveUid)
    );

    const allBookings = await db.select().from(demoBookings).orderBy(desc(demoBookings.createdAt));
    const studentBookings = allBookings.filter(
      (b) =>
        (effectiveEmail && (b.email || '').toLowerCase() === effectiveEmail) ||
        (effectiveUid && b.userId === effectiveUid)
    );

    res.json({
      success: true,
      student: {
        uid: student ? student.uid : effectiveUid,
        name: student ? student.name : 'Student',
        email: effectiveEmail,
        phone: student ? student.phone : null,
        role: student ? student.role : 'Student',
      },
      batch: {
        ...batch,
        batch_name: batch.batchName,
        tutor_name: batch.tutor,
      },
      attendanceRate: attendancePercentage,
      totalClasses,
      presentCount: attendedClasses,
      absentCount: totalClasses - attendedClasses,
      attendanceStats: {
        totalClasses,
        attendedClasses,
        absentClasses: totalClasses - attendedClasses,
        attendancePercentage,
      },
      attendance: studentAttendance.map((a) => ({
        ...a,
        student_name: a.studentName,
        student_email: a.studentEmail,
        batch_name: a.batch,
        topic_covered: a.topic,
      })),
      attendanceList: studentAttendance,
      avgScore: avgPerf,
      highestScore: studentPerf.length > 0 ? Math.max(...studentPerf.map((p) => Math.round((p.marksObtained / p.maxMarks) * 100))) : 0,
      performanceStats: {
        totalTests: studentPerf.length,
        averageScore: avgPerf,
        highestScore: studentPerf.length > 0 ? Math.max(...studentPerf.map((p) => Math.round((p.marksObtained / p.maxMarks) * 100))) : 0,
      },
      performances: studentPerf.map((p) => ({
        ...p,
        student_name: p.studentName,
        student_email: p.studentEmail,
        test_name: p.testName,
        marks_obtained: p.marksObtained,
        max_marks: p.maxMarks,
        date: p.testDate,
        percentage: Math.round((p.marksObtained / p.maxMarks) * 100),
      })),
      performancesList: studentPerf,
      activities: studentActs.map((act) => ({
        ...act,
        student_name: act.studentName,
        student_email: act.studentEmail,
        type: act.category ? act.category.toLowerCase() : 'task',
        due_date: act.date,
      })),
      activitiesList: studentActs,
      payments: studentPayments.map((p) => ({
        ...p,
        student_name: p.studentName,
        batch_name: p.batch,
        contact_number: p.studentNumber || p.parentNumber,
        utr_number: p.utr,
      })),
      paymentsList: studentPayments,
      bookings: studentBookings.map((b) => ({
        ...b,
        student_name: b.studentName,
        parent_name: b.parentName,
        grade_level: b.classLevel,
        subjects: b.subject,
        preferred_date: b.preferredDate,
        preferred_time: b.preferredTime,
      })),
      bookingsList: studentBookings,
    });
  } catch (error) {
    console.error('Error loading student portal data:', error);
    res.status(500).json({ success: false, error: 'Failed to load student portal data' });
  }
});
