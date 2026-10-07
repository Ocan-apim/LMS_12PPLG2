import mongoose from "mongoose";

async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/lms");
  const db = mongoose.connection.db;

  const siti = await db.collection("users").findOne({ name: /Siti/i, role: "guru" });
  console.log("Siti ID:", siti._id);

  // 1. Check Siti's assignments
  const assignments = await db.collection("assignments").find({ teacherId: siti._id }).toArray();
  console.log("Siti assignments:", assignments.map((a) => ({ id: a._id, title: a.title, courseClassId: a.courseClassId, classId: a.classId })));

  // 2. Check submissions for Siti's assignments
  const assignIds = assignments.map((a) => a._id);
  const submissions = await db.collection("submissions").find({ assignmentId: { $in: assignIds } }).toArray();
  console.log("Submissions for Siti assignments:", submissions);

  // 3. For each assignment, simulate /api/guru/assignments/[id]/submissions logic:
  for (const a of assignments) {
    const courseClass = a.courseClassId ? await db.collection("courseclasses").findOne({ _id: a.courseClassId }) : null;
    const rombelClass = a.classId ? await db.collection("classes").findOne({ _id: a.classId }) : null;
    
    let studentIds = [];
    if (courseClass && Array.isArray(courseClass.studentIds)) {
      studentIds = courseClass.studentIds.map(String);
    } else if (rombelClass && Array.isArray(rombelClass.studentIds)) {
      studentIds = rombelClass.studentIds.map(String);
    }
    console.log(`\nAssignment [${a.title}] (${a._id}):`);
    console.log("Determined studentIds:", studentIds);

    const students = await db.collection("users").find({ _id: { $in: studentIds.map(id => new mongoose.Types.ObjectId(id)) }, role: "siswa" }).toArray();
    console.log("Found students count:", students.length);

    const subs = await db.collection("submissions").find({ assignmentId: a._id }).toArray();
    console.log("Found submissions count:", subs.length, subs.map(s => ({ id: s._id, studentId: s.studentId, status: s.status })));
  }

  // 4. Simulate /api/guru/grades logic
  const teacherClasses = await db.collection("courseclasses").find({ teacherId: siti._id, isActive: true }).toArray();
  console.log("\nSiti course classes:", teacherClasses.map(c => ({ id: c._id, name: c.name, studentCount: c.studentIds?.length })));

  const targetClassId = teacherClasses[0]?._id;
  console.log("Default selectedClassId for grades:", targetClassId);
  const selectedClass = targetClassId ? await db.collection("courseclasses").findOne({ _id: targetClassId }) : null;
  console.log("selectedClass studentIds:", selectedClass?.studentIds);

  const classAssignments = await db.collection("assignments").find({ courseClassId: targetClassId }).toArray();
  console.log("classAssignments count:", classAssignments.length, classAssignments.map(a => a.title));
  const classAssignIds = classAssignments.map(a => a._id);
  const classSubs = await db.collection("submissions").find({ assignmentId: { $in: classAssignIds } }).toArray();
  console.log("classSubs count:", classSubs.length);

  // 5. Test populate on Submission
  const { User, Assignment, Submission } = await import("../src/models/index.ts");
  const teacherAssigns = await Assignment.find({ teacherId: siti._id }).select("_id");
  const tIds = teacherAssigns.map(a => a._id);
  const recSubs = await Submission.find({ assignmentId: { $in: tIds } })
    .populate("studentId", "name nisn email")
    .populate("assignmentId", "title maxScore")
    .lean();
  console.log("\nPopulated recSubs for Siti:", recSubs.map(s => ({ id: s._id, student: s.studentId, assignment: s.assignmentId, status: s.status })));
  process.exit(0);
}


run().catch((e) => {
  console.error(e);
  process.exit(1);
});
