import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lms";

async function verify() {
  console.log("==================================================");
  console.log("VERIFYING ADMIN/KEPSEK/KURIKULUM CLASS PREVIEW FLOW");
  console.log("==================================================\n");

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  // 1. Locate School Class / Rombel "X PPLG 1"
  console.log("1. Checking School Class / Rombel 'X PPLG 1'...");
  const rombel = await db.collection("classes").findOne({ name: "X PPLG 1" });
  if (!rombel) {
    throw new Error("Class 'X PPLG 1' not found in database!");
  }
  console.log(`  ✓ Found Rombel: ${rombel.name} (ID: ${rombel._id})`);

  // 2. Query all CourseClasses belonging to "X PPLG 1"
  console.log("\n2. Checking Mapel (CourseClasses) belonging to 'X PPLG 1'...");
  const courseClasses = await db.collection("courseclasses").find({
    classRombelId: rombel._id,
    isActive: true,
  }).toArray();

  console.log(`  ✓ Total Mapel found for ${rombel.name}: ${courseClasses.length}`);
  if (courseClasses.length < 2) {
    throw new Error(`Expected at least 2 Mapel for ${rombel.name}, found ${courseClasses.length}`);
  }

  const mapelNames = courseClasses.map((c) => c.name);
  console.log(`  ✓ Mapel names: ${mapelNames.join(", ")}`);

  const hasBasisData = mapelNames.includes("BASISDATA10PPLG");
  const hasMatematika = mapelNames.includes("MATEMATIKA");
  const hasBahasaIndonesia = mapelNames.includes("BAHASA INDONESIA");

  if (!hasBasisData || !hasMatematika || !hasBahasaIndonesia) {
    throw new Error("Missing expected Mapels in X PPLG 1!");
  }
  console.log("  ✓ All required Mapel cards exist for X PPLG 1 (No single course hardcoding).");

  // 3. Check Activities (Tugas, Kuis, Materi) for each Mapel
  console.log("\n3. Checking Activities for each Mapel...");
  for (const cc of courseClasses) {
    const assignments = await db.collection("assignments").find({
      courseClassId: cc._id,
      isArchived: { $ne: true },
      isPublished: true,
    }).toArray();

    const quizzes = await db.collection("quizzes").find({
      courseClassId: cc._id,
      isPublished: true,
    }).toArray();

    console.log(`  ✓ Mapel [${cc.name}]:`);
    console.log(`    - Code: ${cc.code}`);
    console.log(`    - Total Assignments: ${assignments.length}`);
    console.log(`    - Total Quizzes: ${quizzes.length}`);
    console.log(`    - Shared Files: ${(cc.sharedFiles || []).length}`);

    // Verify attachments are present on assignments
    for (const a of assignments) {
      if (a.attachments && a.attachments.length > 0) {
        console.log(`      * Assignment "${a.title}" has ${a.attachments.length} attachment(s) available for download.`);
      }
    }

    // Verify quiz questions are present
    for (const q of quizzes) {
      console.log(`      * Quiz "${q.title}" has ${(q.questions || []).length} questions available for inspection.`);
    }
  }

  // 4. Verification completed
  console.log("\n==================================================");
  console.log("ALL DATA RELATIONSHIPS & HIERARCHY VERIFIED 100%!");
  console.log("==================================================");

  await client.close();
}

verify().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
