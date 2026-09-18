import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull().default('Student'),
  email: text('email').notNull(),
  phone: text('phone'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const demoBookings = pgTable('demo_bookings', {
  id: serial('id').primaryKey(),
  userId: text('user_id'),
  studentName: text('student_name').notNull(),
  parentName: text('parent_name').notNull(),
  mobileNumber: text('mobile_number').notNull(),
  email: text('email').notNull(),
  classLevel: text('class_level').notNull(),
  subject: text('subject').notNull(),
  preferredDate: text('preferred_date').notNull(),
  preferredTime: text('preferred_time').notNull(),
  address: text('address').notNull(),
  message: text('message'),
  status: text('status').notNull().default('Pending'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  userId: text('user_id'),
  batch: text('batch').notNull(),
  subjects: text('subjects').notNull(),
  amount: integer('amount').notNull(),
  studentName: text('student_name').notNull(),
  className: text('class_name').notNull(),
  board: text('board').notNull(),
  school: text('school').notNull(),
  studentNumber: text('student_number').notNull(),
  parentName: text('parent_name').notNull(),
  parentNumber: text('parent_number').notNull(),
  address: text('address').notNull(),
  email: text('email').notNull(),
  utr: text('utr').notNull(),
  status: text('status').notNull().default('Under Review'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const enquiries = pgTable('enquiries', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  area: text('area').notNull(),
  details: text('details').notNull(),
  status: text('status').notNull().default('Pending'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const studentBatches = pgTable('student_batches', {
  id: serial('id').primaryKey(),
  userId: text('user_id'),
  studentEmail: text('student_email').notNull(),
  studentName: text('student_name').notNull(),
  batchName: text('batch_name').notNull(),
  timing: text('timing').notNull().default('Mon, Wed, Fri • 4:00 PM – 5:30 PM'),
  tutor: text('tutor').notNull().default('Rakesh Paul, M.Sc Physics'),
  status: text('status').notNull().default('Active'),
  startDate: text('start_date').notNull().default('2026-09-01'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const attendance = pgTable('attendance', {
  id: serial('id').primaryKey(),
  userId: text('user_id'),
  studentEmail: text('student_email').notNull(),
  studentName: text('student_name').notNull(),
  date: text('date').notNull(),
  batch: text('batch').notNull(),
  status: text('status').notNull().default('Present'), // 'Present', 'Absent', 'Late'
  topic: text('topic'),
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const performances = pgTable('performances', {
  id: serial('id').primaryKey(),
  userId: text('user_id'),
  studentEmail: text('student_email').notNull(),
  studentName: text('student_name').notNull(),
  testName: text('test_name').notNull(),
  subject: text('subject').notNull(),
  marksObtained: integer('marks_obtained').notNull(),
  maxMarks: integer('max_marks').notNull(),
  grade: text('grade').notNull().default('A'),
  testDate: text('test_date').notNull(),
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const studentActivities = pgTable('student_activities', {
  id: serial('id').primaryKey(),
  userId: text('user_id'),
  studentEmail: text('student_email').notNull(),
  studentName: text('student_name').notNull(),
  title: text('title').notNull(),
  category: text('category').notNull().default('Academic'), // 'Homework', 'Test', 'Doubt Clearing', 'Notice'
  description: text('description'),
  date: text('date').notNull(),
  status: text('status').notNull().default('Completed'), // 'Completed', 'Assigned', 'Pending'
  createdAt: timestamp('created_at').defaultNow(),
});

