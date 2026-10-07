import mongoose from "mongoose";

async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/lms");
  const db = mongoose.connection.db;

  const users = await db.collection("users").find({ role: { $in: ["siswa", "guru"] } }).toArray();
  console.log("=== USERS ===");
  users.forEach((u) =>
    console.log({ id: String(u._id), name: u.name, role: u.role, classId: String(u.classId || "") })
  );

  const classes = await db.collection("classes").find().toArray();
  console.log("=== ROMBELS (ClassModel) ===");
  classes.forEach((c) =>
    console.log({ id: String(c._id), name: c.name, studentIds: (c.studentIds || []).map(String) })
  );

  const courseClasses = await db.collection("courseclasses").find().toArray();
  console.log("=== COURSE CLASSES ===");
  courseClasses.forEach((c) =>
    console.log({
      id: String(c._id),
      name: c.name,
      teacherId: String(c.teacherId || ""),
      classRombelId: String(c.classRombelId || ""),
      studentIds: (c.studentIds || []).map(String),
    })
  );

  const assignments = await db.collection("assignments").find().toArray();
  console.log("=== ASSIGNMENTS ===");
  assignments.forEach((a) =>
    console.log({
      id: String(a._id),
      title: a.title,
      teacherId: String(a.teacherId || ""),
      courseClassId: String(a.courseClassId || ""),
      classId: String(a.classId || ""),
    })
  );

  const submissions = await db.collection("submissions").find().toArray();
  console.log("=== SUBMISSIONS ===");
  submissions.forEach((s) =>
    console.log({
      id: String(s._id),
      assignmentId: String(s.assignmentId || ""),
      studentId: String(s.studentId || ""),
      status: s.status,
    })
  );

  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
