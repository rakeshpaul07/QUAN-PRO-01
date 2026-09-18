import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db/index.ts';
import {
  attendance,
  demoBookings,
  enquiries,
  payments,
  performances,
  studentActivities,
  studentBatches,
  users,
} from './src/db/schema.ts';
import { desc, eq } from 'drizzle-orm';
import { seedInitialDataIfNeeded } from './src/db/seed.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  await seedInitialDataIfNeeded();
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check API
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      database: 'Cloud SQL (PostgreSQL)',
      region: 'asia-southeast1',
      firebaseProject: 'fit-depth-153bd',
    });
  });

  // Demo Bookings API (Cloud SQL)
  app.post('/api/demo-bookings', async (req, res) => {
    try {
      const {
        studentName,
        parentName,
        mobileNumber,
        email,
        classLevel,
        subject,
        preferredDate,
        preferredTime,
        address,
        message,
        userId,
      } = req.body;

      if (!studentName || !parentName || !mobileNumber || !email) {
        return res.status(400).json({ error: 'Missing required booking fields' });
      }

      const inserted = await db
        .insert(demoBookings)
        .values({
          studentName,
          parentName,
          mobileNumber,
          email,
          classLevel: classLevel || 'Class 6–8',
          subject: subject || 'Science + Mathematics',
          preferredDate: preferredDate || new Date().toISOString().split('T')[0],
          preferredTime: preferredTime || '16:00',
          address: address || '',
          message: message || '',
          status: 'Pending',
          userId: userId || null,
        })
        .returning();

      res.status(201).json({ success: true, booking: inserted[0] });
    } catch (error) {
      console.error('Error inserting demo booking in Cloud SQL:', error);
      res.status(500).json({ error: 'Failed to record demo booking in database' });
    }
  });

  app.get('/api/demo-bookings', async (req, res) => {
    try {
      const results = await db
        .select()
        .from(demoBookings)
        .orderBy(desc(demoBookings.createdAt));
      res.json(results);
    } catch (error) {
      console.error('Error fetching demo bookings:', error);
      res.status(500).json({ error: 'Failed to fetch demo bookings' });
    }
  });

  // Payments / Admission Enrolment API (Cloud SQL)
  app.post('/api/payments', async (req, res) => {
    try {
      const {
        batch,
        subjects,
        amount,
        studentName,
        className,
        board,
        school,
        studentNumber,
        parentName,
        parentNumber,
        address,
        email,
        utr,
        userId,
      } = req.body;

      if (!studentName || !utr) {
        return res.status(400).json({ error: 'Student name and UTR are required' });
      }

      const inserted = await db
        .insert(payments)
        .values({
          batch: batch || 'Class 9–10',
          subjects: subjects || 'Science + Mathematics',
          amount: Number(amount) || 4000,
          studentName,
          className: className || 'Class 9',
          board: board || 'CBSE',
          school: school || 'Local School',
          studentNumber: studentNumber || '',
          parentName: parentName || '',
          parentNumber: parentNumber || '',
          address: address || '',
          email: email || '',
          utr,
          status: 'Under Review',
          userId: userId || null,
        })
        .returning();

      res.status(201).json({ success: true, payment: inserted[0] });
    } catch (error) {
      console.error('Error inserting payment record in Cloud SQL:', error);
      res.status(500).json({ error: 'Failed to record payment in database' });
    }
  });

  app.get('/api/payments', async (req, res) => {
    try {
      const results = await db
        .select()
        .from(payments)
        .orderBy(desc(payments.createdAt));
      res.json(results);
    } catch (error) {
      console.error('Error fetching payments:', error);
      res.status(500).json({ error: 'Failed to fetch payments' });
    }
  });

  // Service Enquiries API (Cloud SQL)
  app.post('/api/enquiries', async (req, res) => {
    try {
      const { name, phone, area, details } = req.body;
      if (!name || !phone) {
        return res.status(400).json({ error: 'Name and phone are required' });
      }

      const inserted = await db
        .insert(enquiries)
        .values({
          name,
          phone,
          area: area || 'Agartala',
          details: details || '',
          status: 'Pending',
        })
        .returning();

      res.status(201).json({ success: true, enquiry: inserted[0] });
    } catch (error) {
      console.error('Error inserting enquiry in Cloud SQL:', error);
      res.status(500).json({ error: 'Failed to record enquiry in database' });
    }
  });

  app.get('/api/enquiries', async (req, res) => {
    try {
      const results = await db
        .select()
        .from(enquiries)
        .orderBy(desc(enquiries.createdAt));
      res.json(results);
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      res.status(500).json({ error: 'Failed to fetch enquiries' });
    }
  });

  // User Profile Sync API (Firebase UID -> Cloud SQL)
  app.post('/api/users/sync', async (req, res) => {
    try {
      const { uid, name, email, role, phone } = req.body;
      if (!uid) {
        return res.status(400).json({ error: 'UID is required' });
      }

      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.uid, uid));

      let userRecord;
      if (existingUser.length > 0) {
        const updated = await db
          .update(users)
          .set({
            name: name || existingUser[0].name,
            role: role || existingUser[0].role,
            email: email || existingUser[0].email,
            phone: phone || existingUser[0].phone,
          })
          .where(eq(users.uid, uid))
          .returning();
        userRecord = updated[0];
      } else {
        const inserted = await db
          .insert(users)
          .values({
            uid,
            name: name || 'Student',
            email: email || `${uid.slice(0, 8)}@phone.quantumacademy.in`,
            role: role || 'Student',
            phone: phone || null,
          })
          .returning();
        userRecord = inserted[0];
      }

      res.json({ success: true, user: userRecord });
    } catch (error) {
      console.error('Error syncing user with Cloud SQL:', error);
      res.status(500).json({ error: 'Failed to sync user record' });
    }
  });

  // Phone number lookup for login
  app.post('/api/users/lookup-by-phone', async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
      }
      const cleanDigits = phone.replace(/[^0-9]/g, '');
      if (cleanDigits.length < 6) {
        return res.json({ found: false, message: 'Invalid phone length' });
      }
      const last10 = cleanDigits.slice(-10);

      // 1. Search in users table
      const allUsers = await db.select().from(users);
      const matchedUser = allUsers.find((u) => {
        if (!u.phone) return false;
        const uDigits = u.phone.replace(/[^0-9]/g, '');
        return uDigits.endsWith(last10) || last10.endsWith(uDigits);
      });

      if (matchedUser && matchedUser.email) {
        return res.json({ found: true, email: matchedUser.email, name: matchedUser.name });
      }

      // 2. Search in demo bookings
      const bookings = await db.select().from(demoBookings);
      const matchedBooking = bookings.find((b) => {
        if (!b.mobileNumber) return false;
        const bDigits = b.mobileNumber.replace(/[^0-9]/g, '');
        return bDigits.endsWith(last10) || last10.endsWith(bDigits);
      });

      if (matchedBooking && matchedBooking.email) {
        return res.json({ found: true, email: matchedBooking.email, name: matchedBooking.studentName });
      }

      // 3. Search in payments table
      const payList = await db.select().from(payments);
      const matchedPay = payList.find((p) => {
        const sDigits = (p.studentNumber || '').replace(/[^0-9]/g, '');
        const pDigits = (p.parentNumber || '').replace(/[^0-9]/g, '');
        return (sDigits && sDigits.endsWith(last10)) || (pDigits && pDigits.endsWith(last10));
      });

      if (matchedPay && matchedPay.email) {
        return res.json({ found: true, email: matchedPay.email, name: matchedPay.studentName });
      }

      return res.json({ found: false });
    } catch (error) {
      console.error('Error looking up user by phone:', error);
      res.status(500).json({ error: 'Failed to look up phone' });
    }
  });

  // Dashboard Stats API (Cloud SQL aggregate data)
  app.get('/api/stats', async (req, res) => {
    try {
      const allBookings = await db.select().from(demoBookings);
      const allPayments = await db.select().from(payments);
      const allEnquiries = await db.select().from(enquiries);
      const allUsers = await db.select().from(users);

      res.json({
        totalStudents: allUsers.length,
        demoBookings: allBookings.length,
        pendingPayments: allPayments.filter((p) => p.status === 'Under Review').length,
        approvedPayments: allPayments.filter((p) => p.status === 'Approved').length,
        enquiries: allEnquiries.length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  });

  // ================= ADMIN SYSTEM APIS =================

  // Admin Login Endpoint
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanPass = (password || '').trim();

      // Explicit Admin credential verification
      if (cleanEmail === 'rakeshpaul6009@gmail.com' && cleanPass === '56781234') {
        // Ensure admin user is registered in users table
        const adminUid = 'admin_rakesh_paul_6009';
        const existing = await db.select().from(users).where(eq(users.email, cleanEmail));
        if (existing.length === 0) {
          await db.insert(users).values({
            uid: adminUid,
            name: 'Rakesh Paul (Admin)',
            email: cleanEmail,
            role: 'Admin',
            phone: '+916009619039',
          });
        }

        return res.json({
          success: true,
          admin: {
            uid: adminUid,
            name: 'Rakesh Paul (Admin)',
            email: cleanEmail,
            role: 'Admin',
            phone: '+91 6009619039',
            designation: 'Founder & Senior Faculty (M.Sc Physics)',
            token: 'admin_session_token_' + Date.now(),
          },
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Invalid administrator credentials. Please check email and password.',
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ error: 'Admin authentication failed' });
    }
  });

  // Admin Overview: aggregated counts and activities
  app.get('/api/admin/overview', async (req, res) => {
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

  // Admin: Get all students with their batches and stats
  app.get('/api/admin/students', async (req, res) => {
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

  // Admin: Create new student
  app.post('/api/admin/students', async (req, res) => {
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

      const newStudent = insertedUsers[0];
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
          ...newStudent,
          batch: insertedBatches[0],
        },
      });
    } catch (error) {
      console.error('Error creating student:', error);
      res.status(500).json({ success: false, error: 'Failed to create student' });
    }
  });

  // Admin: Update student details & batch
  app.put('/api/admin/students/:id', async (req, res) => {
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

      // Update or create batch assignment
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
  app.delete('/api/admin/students/:id', async (req, res) => {
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

  // Admin Batch Assignment (Form action)
  app.post('/api/admin/assign-batch', async (req, res) => {
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

  // Admin Batches: GET, POST, PUT, DELETE
  app.get('/api/admin/batches', async (req, res) => {
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

  app.post('/api/admin/batches', async (req, res) => {
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

  app.put('/api/admin/batches/:id', async (req, res) => {
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

  app.delete('/api/admin/batches/:id', async (req, res) => {
    try {
      const batchId = Number(req.params.id);
      await db.delete(studentBatches).where(eq(studentBatches.id, batchId));
      res.json({ success: true, message: 'Batch assignment removed' });
    } catch (error) {
      console.error('Error deleting batch:', error);
      res.status(500).json({ success: false, error: 'Failed to delete batch' });
    }
  });

  // Admin Attendance: GET, POST, PUT, DELETE
  app.get('/api/admin/attendance', async (req, res) => {
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

  app.post('/api/admin/attendance', async (req, res) => {
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

      res.status(201).json({ success: true, record: inserted[0] });
    } catch (error) {
      console.error('Error saving attendance:', error);
      res.status(500).json({ success: false, error: 'Failed to record attendance' });
    }
  });

  app.put('/api/admin/attendance/:id', async (req, res) => {
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

      res.json({ success: true, record: updated[0] });
    } catch (error) {
      console.error('Error updating attendance:', error);
      res.status(500).json({ success: false, error: 'Failed to update attendance' });
    }
  });

  app.delete('/api/admin/attendance/:id', async (req, res) => {
    try {
      const attId = Number(req.params.id);
      await db.delete(attendance).where(eq(attendance.id, attId));
      res.json({ success: true, message: 'Attendance record deleted' });
    } catch (error) {
      console.error('Error deleting attendance:', error);
      res.status(500).json({ success: false, error: 'Failed to delete attendance' });
    }
  });

  // Admin Performances: GET, POST, PUT, DELETE
  app.get('/api/admin/performances', async (req, res) => {
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

  app.post('/api/admin/performances', async (req, res) => {
    try {
      const {
        studentEmail,
        student_email,
        studentName,
        student_name,
        testName,
        test_name,
        subject,
        marksObtained,
        marks_obtained,
        maxMarks,
        max_marks,
        grade,
        testDate,
        date,
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

      res.status(201).json({ success: true, record: inserted[0] });
    } catch (error) {
      console.error('Error saving performance:', error);
      res.status(500).json({ success: false, error: 'Failed to record performance' });
    }
  });

  app.put('/api/admin/performances/:id', async (req, res) => {
    try {
      const perfId = Number(req.params.id);
      const {
        studentEmail,
        student_email,
        studentName,
        student_name,
        testName,
        test_name,
        subject,
        marksObtained,
        marks_obtained,
        maxMarks,
        max_marks,
        grade,
        testDate,
        date,
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

      res.json({ success: true, record: updated[0] });
    } catch (error) {
      console.error('Error updating performance:', error);
      res.status(500).json({ success: false, error: 'Failed to update performance' });
    }
  });

  app.delete('/api/admin/performances/:id', async (req, res) => {
    try {
      const perfId = Number(req.params.id);
      await db.delete(performances).where(eq(performances.id, perfId));
      res.json({ success: true, message: 'Performance record deleted' });
    } catch (error) {
      console.error('Error deleting performance:', error);
      res.status(500).json({ success: false, error: 'Failed to delete performance' });
    }
  });

  // Admin Activities / Notices: GET, POST, PUT, DELETE
  app.get('/api/admin/activities', async (req, res) => {
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

  app.post('/api/admin/activities', async (req, res) => {
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

      res.status(201).json({ success: true, activity: inserted[0] });
    } catch (error) {
      console.error('Error creating activity:', error);
      res.status(500).json({ success: false, error: 'Failed to create activity' });
    }
  });

  app.put('/api/admin/activities/:id', async (req, res) => {
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

      res.json({ success: true, activity: updated[0] });
    } catch (error) {
      console.error('Error updating activity:', error);
      res.status(500).json({ success: false, error: 'Failed to update activity' });
    }
  });

  app.delete('/api/admin/activities/:id', async (req, res) => {
    try {
      const actId = Number(req.params.id);
      await db.delete(studentActivities).where(eq(studentActivities.id, actId));
      res.json({ success: true, message: 'Activity record deleted' });
    } catch (error) {
      console.error('Error deleting activity:', error);
      res.status(500).json({ success: false, error: 'Failed to delete activity' });
    }
  });

  // Admin Demo Bookings: GET, POST, PUT/PATCH, DELETE
  app.get('/api/admin/demo-bookings', async (req, res) => {
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
      console.error('Error fetching admin demo bookings:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch demo bookings' });
    }
  });

  app.post('/api/admin/demo-bookings', async (req, res) => {
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
      const pName = parentName || parent_name;
      const mob = mobileNumber || phone || mobile_number;
      const em = email || '';

      if (!sName || !mob) {
        return res.status(400).json({ success: false, error: 'Student name and phone are required' });
      }

      const inserted = await db
        .insert(demoBookings)
        .values({
          studentName: sName,
          parentName: pName || '',
          mobileNumber: mob,
          email: em,
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

  app.patch('/api/admin/demo-bookings/:id', async (req, res) => {
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

  app.put('/api/admin/demo-bookings/:id', async (req, res) => {
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

  app.delete('/api/admin/demo-bookings/:id', async (req, res) => {
    try {
      const bookingId = Number(req.params.id);
      await db.delete(demoBookings).where(eq(demoBookings.id, bookingId));
      res.json({ success: true, message: 'Booking deleted' });
    } catch (error) {
      console.error('Error deleting booking:', error);
      res.status(500).json({ success: false, error: 'Failed to delete booking' });
    }
  });

  app.post('/api/admin/update-booking-status', async (req, res) => {
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

  // Admin Payments: GET, POST, PUT/PATCH, DELETE
  app.get('/api/admin/payments', async (req, res) => {
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

  app.post('/api/admin/payments', async (req, res) => {
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

  app.patch('/api/admin/payments/:id', async (req, res) => {
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

  app.put('/api/admin/payments/:id', async (req, res) => {
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

  app.delete('/api/admin/payments/:id', async (req, res) => {
    try {
      const payId = Number(req.params.id);
      await db.delete(payments).where(eq(payments.id, payId));
      res.json({ success: true, message: 'Payment record deleted' });
    } catch (error) {
      console.error('Error deleting payment:', error);
      res.status(500).json({ success: false, error: 'Failed to delete payment' });
    }
  });

  app.post('/api/admin/update-payment-status', async (req, res) => {
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

  // ================= STUDENT PORTAL API =================
  // Fetch a student's full academic dossier (Batch, Attendance, Performances, Activities, Payments)
  app.get('/api/student/portal-data', async (req, res) => {
    try {
      const emailQuery = (req.query.email ? String(req.query.email) : '').trim().toLowerCase();
      const uidQuery = req.query.uid ? String(req.query.uid).trim() : '';

      // Match student profile
      const allUsers = await db.select().from(users);
      let student = allUsers.find(
        (u) =>
          (emailQuery && (u.email || '').toLowerCase() === emailQuery) ||
          (uidQuery && u.uid === uidQuery)
      );

      // If user not in DB yet, create a real entry
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
        // Create an active batch record for this student
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

      // 3. Performances / Test scores
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

      // 4. Activities, Homework & Notices
      const allActivities = await db.select().from(studentActivities).orderBy(desc(studentActivities.createdAt));
      let studentActs = allActivities.filter(
        (act) =>
          act.studentEmail === 'all' ||
          (effectiveEmail && (act.studentEmail || '').toLowerCase() === effectiveEmail) ||
          (effectiveUid && act.userId === effectiveUid)
      );

      // 5. Payment status & Bookings
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

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
