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
import { desc, eq } from 'drizzle-orm';

export const adminRouter = Router();

// Admin Overview
adminRouter.get('/overview', async (req, res) => {
  try {
    const allUsers = await db.select().from(users);
    const allBatches = await db.select().from(studentBatches);
    const allAttendance = await db.select().from(attendance);
    const allPerformances = await db.select().from(performances);
    const allBookings = await db.select().from(demoBookings);
    const allPayments = await db.select().from(payments);

    const students = allUsers.filter((u) => u.role !== 'Admin');
    const presentCount = allAttendance.filter((a) => a.status === 'Present').length;
    const attendanceRate = allAttendance.length > 0 ? Math.round((presentCount / allAttendance.length) * 100) : 100;

    res.json({
      success: true,
      stats: {
        students: students.length,
        batches: allBatches.length || 3,
        avgAttendance: attendanceRate,
        tests: allPerformances.length,
        bookings: allBookings.length,
        payments: allPayments.length,
      },
      totalStudents: students.length,
      totalBatches: allBatches.length,
      totalAttendanceMarked: allAttendance.length,
      averageAttendanceRate: attendanceRate,
      totalTestsRecorded: allPerformances.length,
      demoBookingsCount: allBookings.length,
      pendingPaymentsCount: allPayments.filter((p) => p.status === 'Under Review').length,
    });
  } catch (error) {
    console.error('Error fetching admin overview:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admin overview' });
  }
});

// Admin: Get all students
adminRouter.get('/students', async (req, res) => {
  try {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    const allBatches = await db.select().from(studentBatches);
    const allAttendance = await db.select().from(attendance);
    const allPerformances = await db.select().from(performances);

    const studentsWithStats = allUsers
      .filter((u) => u.role !== 'Admin')
      .map((student) => {
        const studentEmail = (student.email || '').toLowerCase();
        const batch = allBatches.find(
          (b) => (b.studentEmail || '').toLowerCase() === studentEmail || b.userId === student.uid
        );
        const studentAtt = allAttendance.filter(
          (a) => (a.studentEmail || '').toLowerCase() === studentEmail || a.userId === student.uid
        );
        const studentPerf = allPerformances.filter(
          (p) => (p.studentEmail || '').toLowerCase() === studentEmail || p.userId === student.uid
        );

        const totalAtt = studentAtt.length;
        const presentAtt = studentAtt.filter((a) => a.status === 'Present').length;
        const attPercentage = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100;

        const avgScore =
          studentPerf.length > 0
            ? Math.round(
                studentPerf.reduce((acc, curr) => acc + (curr.marksObtained / curr.maxMarks) * 100, 0) /
                  studentPerf.length
              )
            : null;

        return {
          id: student.id,
          uid: student.uid,
          name: student.name,
          email: student.email,
          phone: student.phone || '',
          role: student.role,
          batch_id: batch ? batch.id : null,
          batch_name: batch ? batch.batchName : 'Class 9–10: Science + Mathematics',
          batchName: batch ? batch.batchName : 'Class 9–10: Science + Mathematics',
          timing: batch ? batch.timing : 'Mon, Wed, Fri • 4:00 PM – 5:30 PM',
          batchTiming: batch ? batch.timing : 'Mon, Wed, Fri • 4:00 PM – 5:30 PM',
          tutor: batch ? batch.tutor : 'Rakesh Paul, M.Sc Physics',
          tutor_name: batch ? batch.tutor : 'Rakesh Paul, M.Sc Physics',
          status: batch ? batch.status : 'Active',
          batchStatus: batch ? batch.status : 'Active',
          totalAttendance: totalAtt,
          presentAttendance: presentAtt,
          attendanceRate: attPercentage,
          attendancePercentage: attPercentage,
          testsCount: studentPerf.length,
          avgScore: avgScore !== null ? avgScore : 0,
          averageScore: avgScore,
          createdAt: student.createdAt,
        };
      });

    res.json({
      success: true,
      students: studentsWithStats,
    });
  } catch (error) {
    console.error('Error fetching students for admin:', error);
    res.status(500).json({ success: false, error: 'Failed to load students' });
  }
});

// Admin: Create student
adminRouter.post('/students', async (req, res) => {
  try {
    const { name, email, phone, batch_name, batchName, timing, tutor, status } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Name and email are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'A student with this email already exists' });
    }

    const generatedUid = 'stu_' + Date.now();
    const insertedUsers = await db
      .insert(users)
      .values({
        uid: generatedUid,
        name: name.trim(),
        email: cleanEmail,
        phone: phone ? phone.trim() : null,
        role: 'Student',
      })
      .returning();

    const targetBatch = batch_name || batchName || 'Class 9–10: Science + Mathematics';
    const targetTiming = timing || 'Mon, Wed, Fri • 4:00 PM – 5:30 PM';
    const targetTutor = tutor || 'Rakesh Paul, M.Sc Physics';

    const insertedBatches = await db
      .insert(studentBatches)
      .values({
        userId: generatedUid,
        studentEmail: cleanEmail,
        studentName: name.trim(),
        batchName: targetBatch,
        timing: targetTiming,
        tutor: targetTutor,
        status: status || 'Active',
        startDate: new Date().toISOString().split('T')[0],
      })
      .returning();

    res.status(201).json({
      success: true,
      student: {
        ...insertedUsers[0],
        batch: insertedBatches[0],
      },
    });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ success: false, error: 'Failed to create student' });
  }
});

// Admin: Update student
adminRouter.put('/students/:id', async (req, res) => {
  try {
    const studentId = Number(req.params.id);
    const { name, email, phone, batch_name, batchName, timing, tutor, status, role } = req.body;

    const existingUsers = await db.select().from(users).where(eq(users.id, studentId));
    if (existingUsers.length === 0) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const currentStudent = existingUsers[0];
    const newEmail = email ? email.trim().toLowerCase() : currentStudent.email;

    const updatedUsers = await db
      .update(users)
      .set({
        name: name ? name.trim() : currentStudent.name,
        email: newEmail,
        phone: phone !== undefined ? phone : currentStudent.phone,
        role: role || currentStudent.role,
      })
      .where(eq(users.id, studentId))
      .returning();

    const updatedUser = updatedUsers[0];
    const targetBatch = batch_name || batchName;

    if (targetBatch || timing || tutor || status) {
      const existingBatches = await db
        .select()
        .from(studentBatches)
        .where(eq(studentBatches.studentEmail, currentStudent.email.toLowerCase()));

      if (existingBatches.length > 0) {
        await db
          .update(studentBatches)
          .set({
            studentName: updatedUser.name,
            studentEmail: updatedUser.email,
            batchName: targetBatch || existingBatches[0].batchName,
            timing: timing || existingBatches[0].timing,
            tutor: tutor || existingBatches[0].tutor,
            status: status || existingBatches[0].status,
          })
          .where(eq(studentBatches.id, existingBatches[0].id));
      } else {
        await db.insert(studentBatches).values({
          userId: updatedUser.uid,
          studentEmail: updatedUser.email,
          studentName: updatedUser.name,
          batchName: targetBatch || 'Class 9–10: Science + Mathematics',
          timing: timing || 'Mon, Wed, Fri • 4:00 PM – 5:30 PM',
          tutor: tutor || 'Rakesh Paul, M.Sc Physics',
          status: status || 'Active',
          startDate: new Date().toISOString().split('T')[0],
        });
      }
    }

    res.json({ success: true, student: updatedUser });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ success: false, error: 'Failed to update student' });
  }
});

// Admin: Delete student
adminRouter.delete('/students/:id', async (req, res) => {
  try {
    const studentId = Number(req.params.id);
    const existing = await db.select().from(users).where(eq(users.id, studentId));
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const stu = existing[0];
    await db.delete(users).where(eq(users.id, studentId));
    if (stu.email) {
      await db.delete(studentBatches).where(eq(studentBatches.studentEmail, stu.email.toLowerCase()));
    }

    res.json({ success: true, message: 'Student removed successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ success: false, error: 'Failed to delete student' });
  }
});

// Admin: Assign Batch
adminRouter.post('/assign-batch', async (req, res) => {
  try {
    const { student_email, studentEmail, student_name, studentName, student_uid, batch_name, batchName, timing, tutor_name, tutor, status } = req.body;
    const effectiveEmail = (student_email || studentEmail || '').trim().toLowerCase();
    const targetBatch = batch_name || batchName;

    if (!effectiveEmail || !targetBatch) {
      return res.status(400).json({ success: false, error: 'Student email and batch name are required' });
    }

    const existing = await db
      .select()
      .from(studentBatches)
      .where(eq(studentBatches.studentEmail, effectiveEmail));

    let batchRecord;
    if (existing.length > 0) {
      const updated = await db
        .update(studentBatches)
        .set({
          batchName: targetBatch,
          timing: timing || existing[0].timing,
          tutor: tutor_name || tutor || existing[0].tutor,
          status: status || existing[0].status,
          studentName: student_name || studentName || existing[0].studentName,
        })
        .where(eq(studentBatches.id, existing[0].id))
        .returning();
      batchRecord = updated[0];
    } else {
      const inserted = await db
        .insert(studentBatches)
        .values({
          userId: student_uid || null,
          studentEmail: effectiveEmail,
          studentName: student_name || studentName || 'Student',
          batchName: targetBatch,
          timing: timing || 'Mon, Wed, Fri • 4:00 PM – 5:30 PM',
          tutor: tutor_name || tutor || 'Rakesh Paul, M.Sc Physics',
          status: status || 'Active',
          startDate: new Date().toISOString().split('T')[0],
        })
        .returning();
      batchRecord = inserted[0];
    }

    res.json({ success: true, batch: batchRecord });
  } catch (error) {
    console.error('Error assigning batch:', error);
    res.status(500).json({ success: false, error: 'Failed to assign batch' });
  }
});

// Admin: Batches
adminRouter.get('/batches', async (req, res) => {
  try {
    const batches = await db.select().from(studentBatches).orderBy(desc(studentBatches.createdAt));
    res.json({
      success: true,
      batches: batches.map((b) => ({
        ...b,
        batch_name: b.batchName,
        student_name: b.studentName,
        student_email: b.studentEmail,
        tutor_name: b.tutor,
      })),
      records: batches,
    });
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch batches' });
  }
});

adminRouter.post('/batches', async (req, res) => {
  try {
    const { studentEmail, student_email, studentName, student_name, batchName, batch_name, timing, tutor, status, startDate, userId } = req.body;
    const effEmail = (studentEmail || student_email || '').trim().toLowerCase();
    const effBatch = batchName || batch_name;
    if (!effEmail || !effBatch) {
      return res.status(400).json({ success: false, error: 'Student email and batch name are required' });
    }

    const inserted = await db
      .insert(studentBatches)
      .values({
        userId: userId || null,
        studentEmail: effEmail,
        studentName: studentName || student_name || 'Student',
        batchName: effBatch,
        timing: timing || 'Mon, Wed, Fri • 4:00 PM – 5:30 PM',
        tutor: tutor || 'Rakesh Paul, M.Sc Physics',
        status: status || 'Active',
        startDate: startDate || new Date().toISOString().split('T')[0],
      })
      .returning();

    res.status(201).json({ success: true, batch: inserted[0] });
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({ success: false, error: 'Failed to create batch' });
  }
});

adminRouter.put('/batches/:id', async (req, res) => {
  try {
    const batchId = Number(req.params.id);
    const { batchName, batch_name, timing, tutor, tutor_name, status, studentName, student_name } = req.body;
    const updated = await db
      .update(studentBatches)
      .set({
        batchName: batchName || batch_name,
        timing,
        tutor: tutor || tutor_name,
        status,
        studentName: studentName || student_name,
      })
      .where(eq(studentBatches.id, batchId))
      .returning();

    res.json({ success: true, batch: updated[0] });
  } catch (error) {
    console.error('Error updating batch:', error);
    res.status(500).json({ success: false, error: 'Failed to update batch' });
  }
});

adminRouter.delete('/batches/:id', async (req, res) => {
  try {
    const batchId = Number(req.params.id);
    await db.delete(studentBatches).where(eq(studentBatches.id, batchId));
    res.json({ success: true, message: 'Batch assignment removed' });
  } catch (error) {
    console.error('Error deleting batch:', error);
    res.status(500).json({ success: false, error: 'Failed to delete batch' });
  }
});

// Admin: Attendance
adminRouter.get('/attendance', async (req, res) => {
  try {
    const { studentEmail, date, batch } = req.query;
    let records = await db.select().from(attendance).orderBy(desc(attendance.date), desc(attendance.createdAt));

    if (studentEmail) {
      records = records.filter(
        (r) => (r.studentEmail || '').toLowerCase() === String(studentEmail).toLowerCase()
      );
    }
    if (date) {
      records = records.filter((r) => r.date === String(date));
    }
    if (batch) {
      records = records.filter((r) => r.batch === String(batch));
    }

    const formatted = records.map((r) => ({
      ...r,
      student_name: r.studentName,
      student_email: r.studentEmail,
      batch_name: r.batch,
      topic_covered: r.topic,
    }));

    res.json({
      success: true,
      records: formatted,
    });
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch attendance' });
  }
});

adminRouter.post('/attendance', async (req, res) => {
  try {
    const { studentEmail, student_email, studentName, student_name, date, batch, batch_name, status, topic, topic_covered, remarks, userId } = req.body;
    const effEmail = (studentEmail || student_email || '').trim().toLowerCase();
    const effDate = date ? date.trim() : new Date().toISOString().split('T')[0];
    const effStatus = status || 'Present';

    if (!effEmail) {
      return res.status(400).json({ success: false, error: 'Student email is required' });
    }

    const inserted = await db
      .insert(attendance)
      .values({
        studentEmail: effEmail,
        studentName: studentName || student_name || 'Student',
        date: effDate,
        batch: batch || batch_name || 'Class 9–10: Science + Mathematics',
        status: effStatus,
        topic: topic || topic_covered || 'Core concept discussion',
        remarks: remarks || '',
        userId: userId || null,
      })
      .returning();

    res.status(201).json({
      success: true,
      record: {
        ...inserted[0],
        student_name: inserted[0].studentName,
        student_email: inserted[0].studentEmail,
        batch_name: inserted[0].batch,
        topic_covered: inserted[0].topic,
      },
    });
  } catch (error) {
    console.error('Error saving attendance:', error);
    res.status(500).json({ success: false, error: 'Failed to record attendance' });
  }
});

adminRouter.put('/attendance/:id', async (req, res) => {
  try {
    const attId = Number(req.params.id);
    const { studentEmail, student_email, studentName, student_name, date, batch, batch_name, status, topic, topic_covered, remarks } = req.body;

    const updated = await db
      .update(attendance)
      .set({
        studentEmail: studentEmail || student_email,
        studentName: studentName || student_name,
        date,
        batch: batch || batch_name,
        status,
        topic: topic || topic_covered,
        remarks,
      })
      .where(eq(attendance.id, attId))
      .returning();

    res.json({
      success: true,
      record: {
        ...updated[0],
        student_name: updated[0].studentName,
        student_email: updated[0].studentEmail,
        batch_name: updated[0].batch,
        topic_covered: updated[0].topic,
      },
    });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ success: false, error: 'Failed to update attendance' });
  }
});

adminRouter.delete('/attendance/:id', async (req, res) => {
  try {
    const attId = Number(req.params.id);
    await db.delete(attendance).where(eq(attendance.id, attId));
    res.json({ success: true, message: 'Attendance record deleted' });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({ success: false, error: 'Failed to delete attendance' });
  }
});

// Admin: Performances
adminRouter.get('/performances', async (req, res) => {
  try {
    const { studentEmail, subject } = req.query;
    let records = await db.select().from(performances).orderBy(desc(performances.testDate), desc(performances.createdAt));

    if (studentEmail) {
      records = records.filter(
        (r) => (r.studentEmail || '').toLowerCase() === String(studentEmail).toLowerCase()
      );
    }
    if (subject) {
      records = records.filter((r) => (r.subject || '').toLowerCase() === String(subject).toLowerCase());
    }

    const formatted = records.map((p) => {
      const pct = p.maxMarks ? Math.round((p.marksObtained / p.maxMarks) * 100) : 0;
      return {
        ...p,
        student_name: p.studentName,
        student_email: p.studentEmail,
        test_name: p.testName,
        marks_obtained: p.marksObtained,
        max_marks: p.maxMarks,
        date: p.testDate,
        percentage: pct,
      };
    });

    res.json({
      success: true,
      records: formatted,
    });
  } catch (error) {
    console.error('Error fetching performances:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch performances' });
  }
});

adminRouter.post('/performances', async (req, res) => {
  try {
    const {
      studentEmail, student_email,
      studentName, student_name,
      testName, test_name,
      subject,
      marksObtained, marks_obtained,
      maxMarks, max_marks,
      grade,
      testDate, date,
      remarks,
      userId,
    } = req.body;

    const effEmail = (studentEmail || student_email || '').trim().toLowerCase();
    const effTestName = (testName || test_name || '').trim();
    const marksNum = Number(marksObtained !== undefined ? marksObtained : marks_obtained);
    const maxNum = Number(maxMarks !== undefined ? maxMarks : max_marks);

    if (!effEmail || !effTestName || isNaN(marksNum) || !maxNum) {
      return res.status(400).json({ success: false, error: 'Student email, test name, marks and max marks are required' });
    }

    const percentage = Math.round((marksNum / maxNum) * 100);
    let calculatedGrade = grade;
    if (!calculatedGrade) {
      if (percentage >= 90) calculatedGrade = 'A+';
      else if (percentage >= 80) calculatedGrade = 'A';
      else if (percentage >= 70) calculatedGrade = 'B+';
      else if (percentage >= 60) calculatedGrade = 'B';
      else calculatedGrade = 'C';
    }

    const inserted = await db
      .insert(performances)
      .values({
        studentEmail: effEmail,
        studentName: studentName || student_name || 'Student',
        testName: effTestName,
        subject: subject || 'Science + Mathematics',
        marksObtained: marksNum,
        maxMarks: maxNum,
        grade: calculatedGrade,
        testDate: testDate || date || new Date().toISOString().split('T')[0],
        remarks: remarks || '',
        userId: userId || null,
      })
      .returning();

    res.status(201).json({
      success: true,
      record: {
        ...inserted[0],
        student_name: inserted[0].studentName,
        student_email: inserted[0].studentEmail,
        test_name: inserted[0].testName,
        marks_obtained: inserted[0].marksObtained,
        max_marks: inserted[0].maxMarks,
        date: inserted[0].testDate,
        percentage,
      },
    });
  } catch (error) {
    console.error('Error saving performance:', error);
    res.status(500).json({ success: false, error: 'Failed to record performance' });
  }
});

adminRouter.put('/performances/:id', async (req, res) => {
  try {
    const perfId = Number(req.params.id);
    const {
      studentEmail, student_email,
      studentName, student_name,
      testName, test_name,
      subject,
      marksObtained, marks_obtained,
      maxMarks, max_marks,
      grade,
      testDate, date,
      remarks,
    } = req.body;

    const marksNum = Number(marksObtained !== undefined ? marksObtained : marks_obtained);
    const maxNum = Number(maxMarks !== undefined ? maxMarks : max_marks);
    const percentage = maxNum > 0 ? Math.round((marksNum / maxNum) * 100) : 0;
    let calculatedGrade = grade;
    if (!calculatedGrade && maxNum > 0) {
      if (percentage >= 90) calculatedGrade = 'A+';
      else if (percentage >= 80) calculatedGrade = 'A';
      else if (percentage >= 70) calculatedGrade = 'B+';
      else if (percentage >= 60) calculatedGrade = 'B';
      else calculatedGrade = 'C';
    }

    const updated = await db
      .update(performances)
      .set({
        studentEmail: studentEmail || student_email,
        studentName: studentName || student_name,
        testName: testName || test_name,
        subject,
        marksObtained: !isNaN(marksNum) ? marksNum : undefined,
        maxMarks: !isNaN(maxNum) ? maxNum : undefined,
        grade: calculatedGrade,
        testDate: testDate || date,
        remarks,
      })
      .where(eq(performances.id, perfId))
      .returning();

    res.json({
      success: true,
      record: {
        ...updated[0],
        student_name: updated[0].studentName,
        student_email: updated[0].studentEmail,
        test_name: updated[0].testName,
        marks_obtained: updated[0].marksObtained,
        max_marks: updated[0].maxMarks,
        date: updated[0].testDate,
        percentage,
      },
    });
  } catch (error) {
    console.error('Error updating performance:', error);
    res.status(500).json({ success: false, error: 'Failed to update performance' });
  }
});

adminRouter.delete('/performances/:id', async (req, res) => {
  try {
    const perfId = Number(req.params.id);
    await db.delete(performances).where(eq(performances.id, perfId));
    res.json({ success: true, message: 'Performance record deleted' });
  } catch (error) {
    console.error('Error deleting performance:', error);
    res.status(500).json({ success: false, error: 'Failed to delete performance' });
  }
});

// Admin: Activities
adminRouter.get('/activities', async (req, res) => {
  try {
    const activities = await db.select().from(studentActivities).orderBy(desc(studentActivities.createdAt));
    const formatted = activities.map((a) => ({
      ...a,
      student_name: a.studentName,
      student_email: a.studentEmail,
      type: a.category ? a.category.toLowerCase() : 'task',
      due_date: a.date,
    }));

    res.json({
      success: true,
      records: formatted,
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch activities' });
  }
});

adminRouter.post('/activities', async (req, res) => {
  try {
    const { studentEmail, student_email, studentName, student_name, title, category, type, description, date, due_date, status, userId } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: 'Activity title is required' });
    }

    const effEmail = (studentEmail || student_email || 'all').trim().toLowerCase();
    const effCategory = category || type || 'Academic';
    const effDate = date || due_date || new Date().toISOString().split('T')[0];

    const inserted = await db
      .insert(studentActivities)
      .values({
        studentEmail: effEmail,
        studentName: studentName || student_name || (effEmail === 'all' ? 'All Students' : 'Student'),
        title: title.trim(),
        category: effCategory,
        description: description || '',
        date: effDate,
        status: status || 'Completed',
        userId: userId || null,
      })
      .returning();

    res.status(201).json({
      success: true,
      activity: {
        ...inserted[0],
        student_name: inserted[0].studentName,
        student_email: inserted[0].studentEmail,
        type: inserted[0].category.toLowerCase(),
        due_date: inserted[0].date,
      },
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({ success: false, error: 'Failed to create activity' });
  }
});

adminRouter.put('/activities/:id', async (req, res) => {
  try {
    const actId = Number(req.params.id);
    const { studentEmail, student_email, studentName, student_name, title, category, type, description, date, due_date, status } = req.body;

    const updated = await db
      .update(studentActivities)
      .set({
        studentEmail: studentEmail || student_email,
        studentName: studentName || student_name,
        title,
        category: category || type,
        description,
        date: date || due_date,
        status,
      })
      .where(eq(studentActivities.id, actId))
      .returning();

    res.json({
      success: true,
      activity: {
        ...updated[0],
        student_name: updated[0].studentName,
        student_email: updated[0].studentEmail,
        type: (updated[0].category || 'task').toLowerCase(),
        due_date: updated[0].date,
      },
    });
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ success: false, error: 'Failed to update activity' });
  }
});

adminRouter.delete('/activities/:id', async (req, res) => {
  try {
    const actId = Number(req.params.id);
    await db.delete(studentActivities).where(eq(studentActivities.id, actId));
    res.json({ success: true, message: 'Activity record deleted' });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({ success: false, error: 'Failed to delete activity' });
  }
});

// Admin: Demo Bookings
adminRouter.get('/demo-bookings', async (req, res) => {
  try {
    const results = await db.select().from(demoBookings).orderBy(desc(demoBookings.createdAt));
    const formatted = results.map((b) => ({
      ...b,
      student_name: b.studentName,
      parent_name: b.parentName,
      phone: b.mobileNumber,
      mobile_number: b.mobileNumber,
      grade_level: b.classLevel,
      class_level: b.classLevel,
      subjects: b.subject,
      preferred_date: b.preferredDate,
      preferred_time: b.preferredTime,
    }));

    res.json({
      success: true,
      records: formatted,
    });
  } catch (error) {
    console.error('Error fetching demo bookings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch demo bookings' });
  }
});

adminRouter.post('/demo-bookings', async (req, res) => {
  try {
    const {
      studentName, student_name,
      parentName, parent_name,
      mobileNumber, phone, mobile_number,
      email,
      classLevel, class_level, grade_level,
      subject, subjects,
      preferredDate, preferred_date,
      preferredTime, preferred_time,
      address, message, status
    } = req.body;

    const sName = studentName || student_name;
    const mob = mobileNumber || phone || mobile_number;

    if (!sName || !mob) {
      return res.status(400).json({ success: false, error: 'Student name and phone are required' });
    }

    const inserted = await db
      .insert(demoBookings)
      .values({
        studentName: sName,
        parentName: parentName || parent_name || '',
        mobileNumber: mob,
        email: email || '',
        classLevel: classLevel || class_level || grade_level || 'Class 9–10',
        subject: subject || subjects || 'Science + Mathematics',
        preferredDate: preferredDate || preferred_date || new Date().toISOString().split('T')[0],
        preferredTime: preferredTime || preferred_time || '16:00',
        address: address || '',
        message: message || '',
        status: status || 'Confirmed',
      })
      .returning();

    res.status(201).json({ success: true, booking: inserted[0] });
  } catch (error) {
    console.error('Error inserting demo booking:', error);
    res.status(500).json({ success: false, error: 'Failed to create demo booking' });
  }
});

adminRouter.patch('/demo-bookings/:id', async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const {
      status, studentName, student_name,
      parentName, parent_name,
      mobileNumber, phone,
      email, classLevel, grade_level,
      subject, subjects,
      preferredDate, preferred_date,
      preferredTime, preferred_time,
      address, message
    } = req.body;

    const updated = await db
      .update(demoBookings)
      .set({
        status: status !== undefined ? status : undefined,
        studentName: studentName || student_name,
        parentName: parentName || parent_name,
        mobileNumber: mobileNumber || phone,
        email,
        classLevel: classLevel || grade_level,
        subject: subject || subjects,
        preferredDate: preferredDate || preferred_date,
        preferredTime: preferredTime || preferred_time,
        address,
        message,
      })
      .where(eq(demoBookings.id, bookingId))
      .returning();

    res.json({ success: true, booking: updated[0] });
  } catch (error) {
    console.error('Error updating demo booking:', error);
    res.status(500).json({ success: false, error: 'Failed to update booking' });
  }
});

adminRouter.put('/demo-bookings/:id', async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const {
      status, studentName, student_name,
      parentName, parent_name,
      mobileNumber, phone,
      email, classLevel, grade_level,
      subject, subjects,
      preferredDate, preferred_date,
      preferredTime, preferred_time,
      address, message
    } = req.body;

    const updated = await db
      .update(demoBookings)
      .set({
        status: status !== undefined ? status : undefined,
        studentName: studentName || student_name,
        parentName: parentName || parent_name,
        mobileNumber: mobileNumber || phone,
        email,
        classLevel: classLevel || grade_level,
        subject: subject || subjects,
        preferredDate: preferredDate || preferred_date,
        preferredTime: preferredTime || preferred_time,
        address,
        message,
      })
      .where(eq(demoBookings.id, bookingId))
      .returning();

    res.json({ success: true, booking: updated[0] });
  } catch (error) {
    console.error('Error updating demo booking:', error);
    res.status(500).json({ success: false, error: 'Failed to update booking' });
  }
});

adminRouter.delete('/demo-bookings/:id', async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    await db.delete(demoBookings).where(eq(demoBookings.id, bookingId));
    res.json({ success: true, message: 'Booking deleted' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ success: false, error: 'Failed to delete booking' });
  }
});

adminRouter.post('/update-booking-status', async (req, res) => {
  try {
    const { id, status } = req.body;
    if (!id || !status) return res.status(400).json({ success: false, error: 'ID and status required' });

    const updated = await db
      .update(demoBookings)
      .set({ status })
      .where(eq(demoBookings.id, Number(id)))
      .returning();

    res.json({ success: true, booking: updated[0] });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ success: false, error: 'Failed to update booking status' });
  }
});

// Admin: Payments
adminRouter.get('/payments', async (req, res) => {
  try {
    const results = await db.select().from(payments).orderBy(desc(payments.createdAt));
    const formatted = results.map((p) => ({
      ...p,
      student_name: p.studentName,
      batch_name: p.batch,
      contact_number: p.studentNumber || p.parentNumber,
      student_number: p.studentNumber,
      parent_name: p.parentName,
      parent_number: p.parentNumber,
      utr_number: p.utr,
      class_name: p.className,
    }));

    res.json({
      success: true,
      records: formatted,
    });
  } catch (error) {
    console.error('Error fetching admin payments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payments' });
  }
});

adminRouter.post('/payments', async (req, res) => {
  try {
    const {
      batch, batch_name,
      subjects,
      amount,
      studentName, student_name,
      className, class_name,
      board, school,
      studentNumber, student_number, contact_number,
      parentName, parent_name,
      parentNumber, parent_number,
      address, email, utr, utr_number, status
    } = req.body;

    const sName = studentName || student_name;
    const utrCode = utr || utr_number;

    if (!sName || !utrCode) {
      return res.status(400).json({ success: false, error: 'Student name and UTR are required' });
    }

    const inserted = await db
      .insert(payments)
      .values({
        batch: batch || batch_name || 'Class 9–10: Science + Mathematics',
        subjects: subjects || 'Science + Mathematics',
        amount: Number(amount) || 4000,
        studentName: sName,
        className: className || class_name || 'Class 10',
        board: board || 'CBSE',
        school: school || 'Local School',
        studentNumber: studentNumber || student_number || contact_number || '',
        parentName: parentName || parent_name || '',
        parentNumber: parentNumber || parent_number || '',
        address: address || '',
        email: email || '',
        utr: utrCode,
        status: status || 'Approved',
      })
      .returning();

    res.status(201).json({ success: true, payment: inserted[0] });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ success: false, error: 'Failed to create payment record' });
  }
});

adminRouter.patch('/payments/:id', async (req, res) => {
  try {
    const payId = Number(req.params.id);
    const {
      status, amount, utr, utr_number,
      studentName, student_name,
      batch, batch_name,
      studentNumber, contact_number,
      email, address
    } = req.body;

    const updated = await db
      .update(payments)
      .set({
        status: status !== undefined ? status : undefined,
        amount: amount !== undefined ? Number(amount) : undefined,
        utr: utr || utr_number,
        studentName: studentName || student_name,
        batch: batch || batch_name,
        studentNumber: studentNumber || contact_number,
        email,
        address,
      })
      .where(eq(payments.id, payId))
      .returning();

    res.json({ success: true, payment: updated[0] });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ success: false, error: 'Failed to update payment' });
  }
});

adminRouter.put('/payments/:id', async (req, res) => {
  try {
    const payId = Number(req.params.id);
    const {
      status, amount, utr, utr_number,
      studentName, student_name,
      batch, batch_name,
      studentNumber, contact_number,
      email, address
    } = req.body;

    const updated = await db
      .update(payments)
      .set({
        status: status !== undefined ? status : undefined,
        amount: amount !== undefined ? Number(amount) : undefined,
        utr: utr || utr_number,
        studentName: studentName || student_name,
        batch: batch || batch_name,
        studentNumber: studentNumber || contact_number,
        email,
        address,
      })
      .where(eq(payments.id, payId))
      .returning();

    res.json({ success: true, payment: updated[0] });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ success: false, error: 'Failed to update payment' });
  }
});

adminRouter.delete('/payments/:id', async (req, res) => {
  try {
    const payId = Number(req.params.id);
    await db.delete(payments).where(eq(payments.id, payId));
    res.json({ success: true, message: 'Payment record deleted' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ success: false, error: 'Failed to delete payment' });
  }
});

adminRouter.post('/update-payment-status', async (req, res) => {
  try {
    const { id, status } = req.body;
    if (!id || !status) return res.status(400).json({ success: false, error: 'ID and status required' });

    const updated = await db
      .update(payments)
      .set({ status })
      .where(eq(payments.id, Number(id)))
      .returning();

    res.json({ success: true, payment: updated[0] });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ success: false, error: 'Failed to update payment status' });
  }
});
