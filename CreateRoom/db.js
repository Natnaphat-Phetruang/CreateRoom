// db.js
require("dotenv").config();

const mysql = require("mysql2");
const bcrypt = require("bcrypt");

const saltRounds = 10; // กำหนดจำนวนรอบของการแฮชสำหรับ bcrypt

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectionLimit: process.env.DATABASE_CONNECTION_LIMIT,
});

// ฟังก์ชัน execute สำหรับเรียกใช้คำสั่ง SQL
const execute = (query, params) => {
  return new Promise((resolve, reject) => {
    pool.query(query, params, (err, results) => {
      if (err) {
        console.error("Database execute error:", err);
        return reject(err);
      }
      console.log("Executed Query:", query);
      console.log("With Params:", params);
      console.log("Query Results:", results);
      return resolve(results);
    });
  });
};

let db = {};

// Global Password Functions
db.getGlobalPassword = async () => {
  const query = "SELECT password FROM keytap WHERE id = 1";
  try {
    const results = await execute(query);
    if (results.length === 0) {
      throw new Error("Password not found in keytap table");
    }
    return results[0].password; // คืนรหัสผ่านที่แฮช
  } catch (error) {
    throw new Error(`Error fetching global password: ${error.message}`);
  }
};

db.setGlobalPassword = async (plainPassword) => {
  try {
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
    const query = `REPLACE INTO keytap (id, password) VALUES (1, ?)`;
    await execute(query, [hashedPassword]);
    console.log("Global password set successfully");
  } catch (error) {
    console.error("Error setting global password:", error);
  }
};

// Email Checking and User Management
db.checkEmailExists = async (email) => {
  const query = ` 
    SELECT COUNT(*) AS count FROM teacher WHERE email = ?
    UNION
    SELECT COUNT(*) AS count FROM nisit WHERE email = ?`;
  try {
    const result = await execute(query, [email, email]);
    const totalCount = result.reduce((sum, row) => sum + row.count, 0);
    return totalCount > 0; // ถ้าเจออีเมลในตารางใดตารางหนึ่งจะคืนค่า true
  } catch (error) {
    throw new Error(`Error checking email existence: ${error.message}`);
  }
};

db.deleteUserByEmail = async (email) => {
  const query = `DELETE FROM nisit WHERE email = ?`;
  try {
    const result = await execute(query, [email]);
    return result;
  } catch (err) {
    console.error("Database error:", err.message);
    throw new Error("Failed to delete user from database");
  }
};

db.updateUserData = async (
  userId,
  studentId,
  fname,
  lname,
  email,
  major,
  faculty
) => {
  try {
    const query = `
      UPDATE nisit
      SET studentId = ?, fname = ?, lname = ?, email = ?, major = ?, faculty = ?
      WHERE id = ?`;
    const result = await execute(query, [
      studentId,
      fname,
      lname,
      email,
      major,
      faculty,
      userId,
    ]);
    return result;
  } catch (err) {
    throw new Error("Database query failed: " + err.message);
  }
};

// Fetching Student Data
db.getAllNisitData = async (email) => {
  const query = `
    SELECT id, studentId, fname, lname, email, major, faculty
    FROM nisit
    WHERE email = ?`;
  try {
    const rows = await execute(query, [email]);
    return rows;
  } catch (error) {
    throw new Error(`Error fetching nisit data: ${error.message}`);
  }
};

// User Registration
db.registerUser = async (email, password, role, fname, lname) => {
  const query = `INSERT INTO teacher (email, password, role, fname, lname) VALUES (?, ?, ?, ?, ?)`;
  try {
    const result = await execute(query, [email, password, role, fname, lname]);
    return result;
  } catch (error) {
    throw new Error(`Error registering user: ${error.message}`);
  }
};

db.registerNisit = async (
  email,
  password,
  fname,
  lname,
  role,
  major,
  faculty,
  studentId
) => {
  const query = `INSERT INTO nisit (email, password, fname, lname, role, major, faculty, studentId)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  try {
    const result = await execute(query, [
      email,
      password,
      fname,
      lname,
      role,
      major,
      faculty,
      studentId,
    ]);
    return result;
  } catch (error) {
    throw new Error(`Error registering nisit: ${error.message}`);
  }
};

// User Authentication and Password Reset
db.getUserByEmail = async (email) => {
  const query = `
    SELECT email, id, password, role FROM nisit WHERE email = ?
    UNION
    SELECT email, id, password, role FROM teacher WHERE email = ?`;
  try {
    const results = await execute(query, [email, email]);
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    throw new Error(`Error fetching user by email: ${error.message}`);
  }
};

db.update_forgot_password_token = async (id, token) => {
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 60 * 60 * 24 * 1000).toISOString(); // หมดอายุใน 24 ชั่วโมง
  const query = `INSERT INTO reset_tokens(token, created_at, expires_at, user_id) VALUES(?, ?, ?, ?)`;
  try {
    await execute(query, [token, createdAt, expiresAt, id]);
    return;
  } catch (error) {
    throw new Error(`Error updating forgot password token: ${error.message}`);
  }
};

db.check_email = async (email) => {
  const query = `SELECT * FROM nisit WHERE email = ?`;
  try {
    const results = await execute(query, [email]);
    return results;
  } catch (error) {
    throw new Error(`Error checking email: ${error.message}`);
  }
};

db.get_password_reset_token = async (id) => {
  const query = `SELECT token, expires_at FROM reset_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 1;`;
  try {
    const results = await execute(query, [id]);
    return results;
  } catch (error) {
    throw new Error(`Error fetching password reset token: ${error.message}`);
  }
};

db.update_password_reset_token = async (id) => {
  const query = `DELETE FROM reset_tokens WHERE user_id = ?`;
  try {
    await execute(query, [id]);
    return;
  } catch (error) {
    throw new Error(`Error updating password reset token: ${error.message}`);
  }
};

db.check_user_in_teacher_or_nisit = async (id) => {
  const query = `
    SELECT 'teacher' AS table_name FROM teacher WHERE id = ?
    UNION ALL
    SELECT 'nisit' AS table_name FROM nisit WHERE id = ?;
  `;
  try {
    const results = await execute(query, [id, id]);
    if (results.length > 0) {
      return results[0].table_name; // คืนค่าตารางที่เจอข้อมูล
    } else {
      return null; // ไม่พบผู้ใช้ในทั้งสองตาราง
    }
  } catch (error) {
    throw new Error(`Error checking user table: ${error.message}`);
  }
};

db.update_user_password_teacher = async (id, password) => {
  const query = `UPDATE teacher SET password = ? WHERE id = ?`;
  try {
    const result = await execute(query, [password, id]);
    return result;
  } catch (error) {
    throw new Error(`Error updating teacher password: ${error.message}`);
  }
};

db.update_user_password_nisit = async (id, password) => {
  const query = `UPDATE nisit SET password = ? WHERE id = ?`;
  try {
    const result = await execute(query, [password, id]);
    return result;
  } catch (error) {
    throw new Error(`Error updating nisit password: ${error.message}`);
  }
};

// Adding Attendance History
db.addAttendanceHistory = async (studentId, classroomId, date, status) => {
  const query = `
    INSERT INTO attendance_history (student_id, classroom_id, date, status)
    VALUES (?, ?, ?, ?);
  `;
  try {
    const result = await execute(query, [studentId, classroomId, date, status]);
    return result;
  } catch (error) {
    throw new Error(`Error adding attendance history: ${error.message}`);
  }
};

// Retrieving Attendance History
db.getAttendanceHistory = async (studentId) => {
  const query = `
    SELECT * FROM attendance_history WHERE student_id = ?;
  `;
  try {
    const rows = await execute(query, [studentId]);
    return rows;
  } catch (error) {
    throw new Error(`Error fetching attendance history: ${error.message}`);
  }
};

// เพิ่มฟังก์ชันตรวจสอบการเป็นเจ้าของห้องเรียน
db.checkClassroomOwnership = async (classroomId, teacherId) => {
  const query = `
    SELECT COUNT(*) AS count FROM classrooms
    WHERE id = ? AND teacher_id = ?;
  `;
  try {
    const results = await execute(query, [classroomId, teacherId]);
    return results[0].count > 0;
  } catch (error) {
    throw new Error(`Error checking classroom ownership: ${error.message}`);
  }
};

// Adding a Student to a Classroom
db.addClassroomMember = async (classroomId, studentId) => {
  const query = `
    INSERT INTO classroom_members (classroom_id, student_id)
    VALUES (?, ?);
  `;
  try {
    const result = await execute(query, [classroomId, studentId]);
    return result;
  } catch (error) {
    throw new Error(`Error adding student to classroom: ${error.message}`);
  }
};

// Removing a Student from a Classroom
db.removeClassroomMember = async (classroomId, studentId) => {
  const query = `
    DELETE FROM classroom_members WHERE classroom_id = ? AND student_id = ?;
  `;
  try {
    const result = await execute(query, [classroomId, studentId]);
    if (result.affectedRows === 0) {
      throw new Error(
        `Student with ID ${studentId} is not a member of classroom ID ${classroomId}.`
      );
    }
    console.log(
      `Removed student ID ${studentId} from classroom ID ${classroomId}`
    );
    return result;
  } catch (error) {
    throw new Error(`Error removing student from classroom: ${error.message}`);
  }
};

// Retrieving Classroom Members
db.getClassroomMembers = async (classroomId) => {
  const query = `
    SELECT n.id, n.studentId, n.fname, n.lname, n.email, n.major, n.faculty
    FROM classroom_members cm
    JOIN nisit n ON cm.student_id = n.id
    WHERE cm.classroom_id = ?;
  `;
  try {
    const rows = await execute(query, [classroomId]);
    return rows;
  } catch (error) {
    throw new Error(`Error fetching classroom members: ${error.message}`);
  }
};

// Creating Classroom
db.createClassroom = async (classroomData) => {
  const {
    code,
    days,
    endTime,
    group,
    room,
    startTime,
    subject,
    type,
    teacher_id,
  } = classroomData;

  console.log("Creating classroom with data:", classroomData);

  // ตรวจสอบว่าอาจารย์มีอยู่จริง
  const teacherExistsQuery = `SELECT COUNT(*) AS count FROM teacher WHERE id = ?`;
  try {
    const teacherExistsResult = await execute(teacherExistsQuery, [teacher_id]);
    console.log("Teacher exists result:", teacherExistsResult); // เพิ่มการ log

    let count;
    if (Array.isArray(teacherExistsResult)) {
      count = teacherExistsResult[0].count;
    } else {
      count = teacherExistsResult.count;
    }

    if (count === 0) {
      throw new Error(`อาจารย์ที่มี ID ${teacher_id} ไม่มีอยู่.`);
    }
  } catch (error) {
    console.error("Error checking teacher existence:", error);
    throw new Error(`เกิดข้อผิดพลาดในการตรวจสอบอาจารย์: ${error.message}`);
  }

  const query = `
    INSERT INTO classrooms (code, days, endTime, \`group\`, room, startTime, subject, type, teacher_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const values = [
    code,
    JSON.stringify(days), // แปลง days เป็น JSON string
    endTime,
    group,
    room,
    startTime,
    subject,
    type,
    teacher_id, // รวม teacher_id ในคำสั่งเพิ่ม
  ];

  try {
    const result = await execute(query, values);
    console.log("Classroom created with ID:", result.insertId); // เพิ่มการ log
    return result.insertId; // ส่งคืน ID ของห้องเรียนที่สร้างใหม่
  } catch (error) {
    console.error("Database error while creating classroom:", error);
    throw new Error(`เกิดข้อผิดพลาดในการสร้างห้องเรียน: ${error.message}`);
  }
};

// Updating Classroom Information
db.updateClassroom = async (
  classroomId,
  { room, subject, group, startTime, endTime, days, type }
) => {
  const query = `
    UPDATE classrooms
    SET room = ?, subject = ?, \`group\` = ?, startTime = ?, endTime = ?, days = ?, type = ?
    WHERE id = ?;
  `;
  const params = [
    room,
    subject,
    group,
    startTime,
    endTime,
    JSON.stringify(days), // แปลง days เป็น JSON string
    type,
    classroomId,
  ];

  try {
    console.log(`Updating classroom ID: ${classroomId} with data:`, {
      room,
      subject,
      group,
      startTime,
      endTime,
      days,
      type,
    }); // เพิ่มการ log
    const result = await execute(query, params);
    console.log("Update Result:", result);
    if (result.affectedRows === 0) {
      throw new Error(`No classroom found with ID ${classroomId}`);
    }
    return result;
  } catch (error) {
    console.error(`Error updating classroom ID ${classroomId}:`, error);
    throw new Error(`Error updating classroom: ${error.message}`);
  }
};

// Deleting a Classroom
db.deleteClassroom = async (classroomId) => {
  // Step 1: Check if the classroom exists
  const checkQuery = `SELECT COUNT(*) AS count FROM classrooms WHERE id = ?`;
  const checkResult = await execute(checkQuery, [classroomId]);

  if (checkResult[0].count === 0) {
    throw new Error(`Classroom with ID ${classroomId} does not exist.`);
  }

  // Optional: Step 2: Remove classroom members before deleting the classroom
  const removeMembersQuery = `DELETE FROM classroom_members WHERE classroom_id = ?`;
  await execute(removeMembersQuery, [classroomId]);

  // Step 3: Proceed to delete the classroom
  const query = `DELETE FROM classrooms WHERE id = ?;`;
  try {
    const result = await execute(query, [classroomId]);
    console.log(`Deleted classroom with ID: ${classroomId}`);
    return result;
  } catch (error) {
    throw new Error(`Error deleting classroom: ${error.message}`);
  }
};

// Removing all members from a Classroom
db.removeAllClassroomMembers = async (classroomId) => {
  const query = `DELETE FROM classroom_members WHERE classroom_id = ?;`;
  try {
    const result = await execute(query, [classroomId]);
    console.log(`Removed all members from classroom ID: ${classroomId}`);
    return result;
  } catch (error) {
    throw new Error(
      `Error removing all members from classroom: ${error.message}`
    );
  }
};

// ฟังก์ชันดึงข้อมูลอาจารย์ตาม ID
db.getTeacherById = async (teacherId) => {
  const query = `
    SELECT id, fname, lname, email
    FROM teacher
    WHERE id = ?
  `;
  try {
    const rows = await execute(query, [teacherId]);
    if (rows.length > 0) {
      return rows[0];
    } else {
      return null;
    }
  } catch (error) {
    throw new Error(`เกิดข้อผิดพลาดในการดึงข้อมูลอาจารย์: ${error.message}`);
  }
};

// Updating Teacher Data
db.updateTeacherData = async (teacherId, fname, lname, email) => {
  const query = `
    UPDATE teacher 
    SET fname = ?, lname = ?, email = ? 
    WHERE id = ?;
  `;
  const values = [fname, lname, email, teacherId];

  try {
    const result = await execute(query, values);
    return result;
  } catch (error) {
    throw new Error(`เกิดข้อผิดพลาดในการอัปเดตข้อมูลอาจารย์: ${error.message}`);
  }
};
// Checking if a student is a member of a classroom
db.checkClassroomMembership = async (classroomId, studentId) => {
  const query = `SELECT COUNT(*) AS count FROM classroom_members WHERE classroom_id = ? AND student_id = ?`;
  try {
    const results = await execute(query, [classroomId, studentId]);
    return results[0].count > 0; // คืนค่า true ถ้าเป็นสมาชิกในห้องเรียน
  } catch (error) {
    throw new Error(`Error checking classroom membership: ${error.message}`);
  }
};

/**
 * ฟังก์ชันสำหรับดึงห้องเรียนที่สร้างโดยอาจารย์
 * แปลง `days` จาก string เป็น array ก่อนส่งกลับไปยัง frontend
 */
db.getClassroomsByTeacherId = async (teacherId) => {
  const query = `
      SELECT * FROM classrooms WHERE teacher_id = ?;
  `;
  try {
    const rows = await execute(query, [teacherId]);

    // แปลง days จาก string เป็น array
    const classrooms = rows.map((classroom) => ({
      ...classroom,
      days: JSON.parse(classroom.days),
    }));

    return classrooms; // คืนค่าห้องเรียนที่ได้
  } catch (error) {
    throw new Error(
      `Error fetching classrooms by teacher ID: ${error.message}`
    );
  }
};

/**
 * ฟังก์ชันสำหรับดึงห้องเรียนที่นิสิตเข้าร่วม
 * แปลง `days` จาก string เป็น array ก่อนส่งกลับไปยัง frontend
 */
db.getClassroomsByStudentId = async (studentId) => {
  const query = `
    SELECT c.* FROM classrooms c
    JOIN classroom_members cm ON c.id = cm.classroom_id
    WHERE cm.student_id = ?
  `;
  try {
    const rows = await execute(query, [studentId]);

    // แปลง days จาก string เป็น array
    const classrooms = rows.map((classroom) => ({
      ...classroom,
      days: JSON.parse(classroom.days),
    }));

    return classrooms;
  } catch (error) {
    throw new Error(
      `Error fetching classrooms by student ID: ${error.message}`
    );
  }
};

/**
 * ฟังก์ชันสำหรับดึงห้องเรียนตามรหัส
 * แปลง `days` จาก string เป็น array ก่อนส่งกลับไปยัง frontend
 */
db.getClassroomByCode = async (code) => {
  const query = "SELECT * FROM classrooms WHERE code = ?";
  try {
    const rows = await execute(query, [code]);
    if (rows.length > 0) {
      return {
        ...rows[0],
        days: JSON.parse(rows[0].days),
      };
    } else {
      return null; // คืนค่า null ถ้าไม่พบห้องเรียน
    }
  } catch (error) {
    throw new Error(`Error fetching classroom by code: ${error.message}`);
  }
};

/**
 * ฟังก์ชันสำหรับดึงห้องเรียนตาม ID
 * แปลง `days` จาก string เป็น array ก่อนส่งกลับไปยัง frontend
 */
db.getClassroomById = async (classroomId) => {
  const query = "SELECT * FROM classrooms WHERE id = ?";
  try {
    const rows = await execute(query, [classroomId]);
    if (rows.length > 0) {
      return {
        ...rows[0],
        days: JSON.parse(rows[0].days),
      };
    } else {
      return null; // คืนค่า null ถ้าไม่พบห้องเรียน
    }
  } catch (error) {
    throw new Error(`Error fetching classroom by ID: ${error.message}`);
  }
};

module.exports = db;
