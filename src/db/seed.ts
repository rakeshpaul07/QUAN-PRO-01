import { db } from './index.ts';
import {
  users,
  studentBatches,
  attendance,
  performances,
  studentActivities,
  demoBookings,
  payments,
} from './schema.ts';
import { eq } from 'drizzle-orm';

export async function seedInitialDataIfNeeded() {
  try {
    // 1. Ensure students exist
    const existingUsers = await db.select().from(users);
    
    // Ensure rakeshpaul9911@gmail.com has complete info
    const existingRakeshStudent = existingUsers.find(
      (u) => (u.email || '').toLowerCase() === 'rakeshpaul9911@gmail.com'
    );
    if (existingRakeshStudent && (!existingRakeshStudent.phone || existingRakeshStudent.name === 'Student')) {
      await db
        .update(users)
        .set({
          name: 'Rakesh Paul',
          phone: '+91 98621 54321',
          role: 'Student',
        })
        .where(eq(users.id, existingRakeshStudent.id));
    }

    // Additional sample students if fewer than 3
    const studentsToSeed = [
      {
        uid: 'user_ananya_debbarma_11',
        name: 'Ananya Debbarma',
        email: 'ananya.debbarma@student.quantumacademy.in',
        phone: '+91 94361 88721',
        role: 'Student',
      },
      {
        uid: 'user_sourav_bhowmik_10',
        name: 'Sourav Bhowmik',
        email: 'sourav.bhowmik@student.quantumacademy.in',
        phone: '+91 87941 22983',
        role: 'Student',
      },
      {
        uid: 'user_priyanka_saha_08',
        name: 'Priyanka Saha',
        email: 'priyanka.saha@student.quantumacademy.in',
        phone: '+91 70051 43290',
        role: 'Student',
      },
    ];

    for (const stu of studentsToSeed) {
      const exists = existingUsers.some((u) => (u.email || '').toLowerCase() === stu.email.toLowerCase());
      if (!exists) {
        await db.insert(users).values(stu);
      }
    }

    // 2. Batches
    const existingBatches = await db.select().from(studentBatches);
    if (existingBatches.length === 0) {
      await db.insert(studentBatches).values([
        {
          userId: existingRakeshStudent ? existingRakeshStudent.uid : 'LMYqCHnAxFgPjDRIDXO4EHJTn3B2',
          studentEmail: 'rakeshpaul9911@gmail.com',
          studentName: 'Rakesh Paul',
          batchName: 'Class 9–10: Science + Mathematics',
          timing: 'Mon, Wed, Fri • 4:00 PM – 5:30 PM',
          tutor: 'Rakesh Paul, M.Sc Physics',
          status: 'Active',
          startDate: '2026-09-01',
        },
        {
          userId: 'user_ananya_debbarma_11',
          studentEmail: 'ananya.debbarma@student.quantumacademy.in',
          studentName: 'Ananya Debbarma',
          batchName: 'Class 11–12: Physics Special',
          timing: 'Tue, Thu, Sat • 6:00 PM – 7:30 PM',
          tutor: 'Rakesh Paul, M.Sc Physics',
          status: 'Active',
          startDate: '2026-09-01',
        },
        {
          userId: 'user_sourav_bhowmik_10',
          studentEmail: 'sourav.bhowmik@student.quantumacademy.in',
          studentName: 'Sourav Bhowmik',
          batchName: 'Class 9–10: Science + Mathematics',
          timing: 'Mon, Wed, Fri • 4:00 PM – 5:30 PM',
          tutor: 'Rakesh Paul, M.Sc Physics',
          status: 'Active',
          startDate: '2026-09-01',
        },
        {
          userId: 'user_priyanka_saha_08',
          studentEmail: 'priyanka.saha@student.quantumacademy.in',
          studentName: 'Priyanka Saha',
          batchName: 'Class 6–8: Foundation Science & Math',
          timing: 'Tue, Thu, Sat • 4:00 PM – 5:15 PM',
          tutor: 'Rakesh Paul, M.Sc Physics',
          status: 'Active',
          startDate: '2026-09-01',
        },
      ]);
    }

    // 3. Attendance records
    const existingAttendance = await db.select().from(attendance);
    if (existingAttendance.length === 0) {
      await db.insert(attendance).values([
        {
          studentEmail: 'rakeshpaul9911@gmail.com',
          studentName: 'Rakesh Paul',
          date: '2026-09-15',
          batch: 'Class 9–10: Science + Mathematics',
          status: 'Present',
          topic: "Newton's 2nd & 3rd Laws of Motion + Free Body Numerical Problems",
          remarks: 'Highly attentive, solved equilibrium calculations accurately on board.',
        },
        {
          studentEmail: 'rakeshpaul9911@gmail.com',
          studentName: 'Rakesh Paul',
          date: '2026-09-12',
          batch: 'Class 9–10: Science + Mathematics',
          status: 'Present',
          topic: 'Quadratic Equations: Derivation of Discriminant & Nature of Roots',
          remarks: 'Submitted all step-by-step solutions without calculation errors.',
        },
        {
          studentEmail: 'rakeshpaul9911@gmail.com',
          studentName: 'Rakesh Paul',
          date: '2026-09-10',
          batch: 'Class 9–10: Science + Mathematics',
          status: 'Present',
          topic: 'Kinematics: Velocity-Time Graph Interpretation & Area Under Curve',
          remarks: 'Clear conceptual grasp of instantaneous acceleration.',
        },
        {
          studentEmail: 'rakeshpaul9911@gmail.com',
          studentName: 'Rakesh Paul',
          date: '2026-09-08',
          batch: 'Class 9–10: Science + Mathematics',
          status: 'Present',
          topic: 'Light & Optics: Ray Diagrams for Concave Mirrors & Focal Lengths',
          remarks: 'Neat geometrical ray diagrams and sign convention followed.',
        },
        {
          studentEmail: 'rakeshpaul9911@gmail.com',
          studentName: 'Rakesh Paul',
          date: '2026-09-05',
          batch: 'Class 9–10: Science + Mathematics',
          status: 'Late',
          topic: 'Polynomials & Algebraic Identities',
          remarks: 'Arrived 10 mins late due to school lab, actively caught up.',
        },
        {
          studentEmail: 'rakeshpaul9911@gmail.com',
          studentName: 'Rakesh Paul',
          date: '2026-09-03',
          batch: 'Class 9–10: Science + Mathematics',
          status: 'Present',
          topic: 'Gravitation: Kepler’s Planetary Laws & Universal Constant G',
          remarks: 'Excellent questions asked regarding planetary orbits.',
        },
        // Other students
        {
          studentEmail: 'ananya.debbarma@student.quantumacademy.in',
          studentName: 'Ananya Debbarma',
          date: '2026-09-16',
          batch: 'Class 11–12: Physics Special',
          status: 'Present',
          topic: 'Rotational Dynamics: Moment of Inertia & Parallel Axis Theorem',
          remarks: 'Excellent analytical aptitude in continuous mass integration.',
        },
        {
          studentEmail: 'sourav.bhowmik@student.quantumacademy.in',
          studentName: 'Sourav Bhowmik',
          date: '2026-09-15',
          batch: 'Class 9–10: Science + Mathematics',
          status: 'Present',
          topic: "Newton's 2nd & 3rd Laws of Motion + Free Body Numerical Problems",
          remarks: 'Needs a bit more practice on friction vector components.',
        },
      ]);
    }

    // 4. Performances / Test Marks
    const existingPerf = await db.select().from(performances);
    if (existingPerf.length === 0) {
      await db.insert(performances).values([
        {
          studentEmail: 'rakeshpaul9911@gmail.com',
          studentName: 'Rakesh Paul',
          testName: 'Periodic Assessment: Mechanics & Dynamics',
          subject: 'Physics',
          marksObtained: 24,
          maxMarks: 25,
          grade: 'A+',
          testDate: '2026-09-14',
          remarks: 'Superb conceptual clarity in vector resolution and free body diagrams.',
        },
        {
          studentEmail: 'rakeshpaul9911@gmail.com',
          studentName: 'Rakesh Paul',
          testName: 'Monthly Assessment: Polynomials & Quadratic Equations',
          subject: 'Mathematics',
          marksObtained: 47,
          maxMarks: 50,
          grade: 'A+',
          testDate: '2026-09-07',
          remarks: 'Strong calculation speed. Minor arithmetic slip on problem 8.',
        },
        {
          studentEmail: 'rakeshpaul9911@gmail.com',
          studentName: 'Rakesh Paul',
          testName: 'Unit Test: Chemical Reactions & Equations',
          subject: 'Science',
          marksObtained: 23,
          maxMarks: 25,
          grade: 'A',
          testDate: '2026-08-28',
          remarks: 'Well-balanced chemical equations and state symbols noted accurately.',
        },
        {
          studentEmail: 'ananya.debbarma@student.quantumacademy.in',
          studentName: 'Ananya Debbarma',
          testName: 'Rigid Body Mechanics & Center of Mass',
          subject: 'Physics',
          marksObtained: 48,
          maxMarks: 50,
          grade: 'A+',
          testDate: '2026-09-12',
          remarks: 'Exceptional solution derivation in angular momentum conservation.',
        },
        {
          studentEmail: 'sourav.bhowmik@student.quantumacademy.in',
          studentName: 'Sourav Bhowmik',
          testName: 'Periodic Assessment: Mechanics & Dynamics',
          subject: 'Physics',
          marksObtained: 21,
          maxMarks: 25,
          grade: 'A',
          testDate: '2026-09-14',
          remarks: 'Good grasp of Newton’s Laws; revise friction coefficients.',
        },
      ]);
    }

    // 5. Activities & Notices
    const existingActs = await db.select().from(studentActivities);
    if (existingActs.length === 0) {
      await db.insert(studentActivities).values([
        {
          studentEmail: 'all',
          studentName: 'All Enrolled Students',
          title: 'Homework Set #4: Friction & Work-Energy Theorem',
          category: 'Homework',
          description: 'Solve questions 1 through 15 from NCERT Chapter 6 with complete step-by-step units and diagrams.',
          date: '2026-09-18',
          status: 'Assigned',
        },
        {
          studentEmail: 'rakeshpaul9911@gmail.com',
          studentName: 'Rakesh Paul',
          title: 'Weekly 1-on-1 Physics Doubt Clearing Session Completed',
          category: 'Doubt Clearing',
          description: 'Cleared doubts on projectile trajectory at angle theta and maximum range formulas.',
          date: '2026-09-14',
          status: 'Completed',
        },
        {
          studentEmail: 'all',
          studentName: 'All Enrolled Students',
          title: 'Mid-Term Comprehensive Mock Board Examination Schedule',
          category: 'Notice',
          description: 'Full syllabus mock test will be conducted on Saturday, Sept 26 from 10:00 AM to 1:00 PM at Quantum Academy center.',
          date: '2026-09-26',
          status: 'Completed',
        },
        {
          studentEmail: 'ananya.debbarma@student.quantumacademy.in',
          studentName: 'Ananya Debbarma',
          title: 'Advanced JEE Physics Practice Problem Set #2',
          category: 'Homework',
          description: 'Complete rotational equilibrium and rolling without slipping problems from HC Verma.',
          date: '2026-09-19',
          status: 'Assigned',
        },
      ]);
    }

    // 6. Demo Bookings
    const existingBookings = await db.select().from(demoBookings);
    if (existingBookings.length === 0) {
      await db.insert(demoBookings).values([
        {
          studentName: 'Rakesh Paul',
          parentName: 'Debasish Paul',
          mobileNumber: '+91 98621 54321',
          email: 'rakeshpaul9911@gmail.com',
          classLevel: 'Class 9–10',
          subject: 'Science + Mathematics',
          preferredDate: '2026-09-18',
          preferredTime: '16:00',
          address: 'Ramnagar Road No. 2, Agartala, Tripura',
          message: 'Interested in intensive concept clarity and board preparation.',
          status: 'Confirmed',
        },
        {
          studentName: 'Subham Roy',
          parentName: 'Swapan Roy',
          mobileNumber: '+91 94365 11223',
          email: 'subham.roy@gmail.com',
          classLevel: 'Class 10',
          subject: 'Mathematics & Science',
          preferredDate: '2026-09-20',
          preferredTime: '17:30',
          address: 'Banamalipur, Agartala',
          message: 'Looking for guidance in Trigonometry and Light ray optics.',
          status: 'Pending',
        },
        {
          studentName: 'Dipayan Ghosh',
          parentName: 'Manoj Ghosh',
          mobileNumber: '+91 87942 33445',
          email: 'dipayan.ghosh@gmail.com',
          classLevel: 'Class 11',
          subject: 'Physics Special',
          preferredDate: '2026-09-22',
          preferredTime: '18:00',
          address: 'Dhaleswar Road 4, Agartala',
          message: 'Aiming for NEET/JEE Physics foundation.',
          status: 'Confirmed',
        },
      ]);
    }

    // 7. Payments / Fee Submissions
    const existingPayments = await db.select().from(payments);
    if (existingPayments.length === 0) {
      await db.insert(payments).values([
        {
          batch: 'Class 9–10: Science + Mathematics',
          subjects: 'Physics, Chemistry, Biology & Mathematics',
          amount: 4000,
          studentName: 'Rakesh Paul',
          className: 'Class 10',
          board: 'CBSE',
          school: 'Holy Cross School, Agartala',
          studentNumber: '+91 98621 54321',
          parentName: 'Debasish Paul',
          parentNumber: '+91 98621 54320',
          address: 'Ramnagar Road No. 2, Agartala, Tripura',
          email: 'rakeshpaul9911@gmail.com',
          utr: 'UPI982348102941',
          status: 'Approved',
        },
        {
          batch: 'Class 11–12: Physics Special',
          subjects: 'Physics Core & Advanced Problem Solving',
          amount: 4500,
          studentName: 'Ananya Debbarma',
          className: 'Class 11',
          board: 'TBSE',
          school: 'Shishu Bihar H.S. School',
          studentNumber: '+91 94361 88721',
          parentName: 'Bidur Debbarma',
          parentNumber: '+91 94361 88720',
          address: 'Kunjaban, Agartala',
          email: 'ananya.debbarma@student.quantumacademy.in',
          utr: 'UPI872391023911',
          status: 'Approved',
        },
        {
          batch: 'Class 9–10: Science + Mathematics',
          subjects: 'Science & Mathematics',
          amount: 4000,
          studentName: 'Sourav Bhowmik',
          className: 'Class 9',
          board: 'CBSE',
          school: 'Bhavans Tripura Vidyamandir',
          studentNumber: '+91 87941 22983',
          parentName: 'Alok Bhowmik',
          parentNumber: '+91 87941 22980',
          address: 'Indranagar, Agartala',
          email: 'sourav.bhowmik@student.quantumacademy.in',
          utr: 'UPI652391029402',
          status: 'Approved',
        },
        {
          batch: 'Class 6–8: Foundation Science & Math',
          subjects: 'Foundation Science & Math',
          amount: 3000,
          studentName: 'Priyanka Saha',
          className: 'Class 8',
          board: 'ICSE',
          school: 'St. Pauls School, Agartala',
          studentNumber: '+91 70051 43290',
          parentName: 'Subrata Saha',
          parentNumber: '+91 70051 43291',
          address: 'Bardowali, Agartala',
          email: 'priyanka.saha@student.quantumacademy.in',
          utr: 'UPI338291048291',
          status: 'Under Review',
        },
      ]);
    }

    console.log('Database initial seed check completed successfully.');
  } catch (err) {
    console.error('Error in seedInitialDataIfNeeded:', err);
  }
}
