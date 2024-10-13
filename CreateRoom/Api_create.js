// Api_create.js
require("dotenv").config({ path: "Project_comsci/server/.env" });
const express = require("express");
const router = express.Router();
const db = require("./db"); // ตรวจสอบให้แน่ใจว่าเส้นทางถูกต้อง
const jwt = require("jsonwebtoken");
const secret = process.env.API_KEY || "API_KEY_2024"; // คีย์สำหรับการตรวจสอบ JWT

// Middleware สำหรับตรวจสอบ token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  console.log("Token:", token);

  if (!token) {
    return res
      .status(401)
      .json({ status: "error", message: "No token provided" });
  }

  jwt.verify(token, secret, (err, user) => {
    if (err) {
      return res
        .status(403)
        .json({ status: "error", message: "Token is invalid" });
    }
    req.user = user; // เก็บข้อมูลผู้ใช้ใน request
    console.log("User data:", req.user); // เพิ่มการ log user data
    next();
  });
};

// Middleware สำหรับตรวจสอบสิทธิ์ผู้ใช้ว่าเป็นอาจารย์
const authorizeTeacher = (req, res, next) => {
  console.log("User role:", req.user.role);
  if (req.user.role !== "teacher") {
    return res
      .status(403)
      .json({ status: "error", message: "You do not have permission" });
  }
  next();
};

// Middleware สำหรับตรวจสอบสิทธิ์ผู้ใช้ว่าเป็นนิสิต
const authorizeStudent = (req, res, next) => {
  const userRole = req.user.role;
  console.log("authorizeStudent - User role:", userRole); // เพิ่มการ log เพื่อตรวจสอบบทบาท
  if (userRole !== "nisit") {
    return res.status(403).json({
      status: "error",
      message: "Forbidden: Only nisit can perform this action",
    });
  }
  next();
};

// ลบสมาชิกออกจากห้องเรียน (สำหรับนิสิต)
router.delete(
  "/classroom/:classroomId/member/self",
  authenticateToken,
  authorizeStudent,
  async (req, res) => {
    const classroomId = req.params.classroomId;
    const studentId = req.user.id; // ใช้ ID ของนิสิตจาก token

    console.log(
      `Attempting to remove student ID ${studentId} from classroom ID ${classroomId}`
    );

    try {
      // ตรวจสอบว่าห้องเรียนมีอยู่ในระบบหรือไม่
      const classroom = await db.getClassroomById(classroomId);
      console.log("Classroom:", classroom);
      if (!classroom) {
        return res
          .status(404)
          .json({ status: "error", message: "Classroom not found" });
      }

      // ตรวจสอบว่านิสิตเป็นสมาชิกของห้องเรียนนี้หรือไม่
      const isMember = await db.checkClassroomMembership(
        classroomId,
        studentId
      );
      console.log("Is member:", isMember); // เพิ่มการ log ตรวจสอบสมาชิก

      if (!isMember) {
        return res.status(400).json({
          status: "error",
          message: "You are not a member of this classroom",
        });
      }

      // ลบสมาชิก
      await db.removeClassroomMember(classroomId, studentId);
      console.log(
        `Student ID ${studentId} has left classroom ID ${classroomId}`
      );
      res.json({ status: "success", message: "You have left the classroom" });
    } catch (error) {
      console.error("Error leaving classroom:", error); // log ข้อผิดพลาด
      res.status(500).json({ status: "error", message: error.message });
    }
  }
);

// ลบสมาชิกออกจากห้องเรียน (สำหรับอาจารย์)
router.delete(
  "/classroom/:classroomId/member/:studentId",
  authenticateToken,
  authorizeTeacher,
  async (req, res) => {
    const classroomId = req.params.classroomId;
    const studentId = req.params.studentId;

    console.log(
      `Attempting to remove student ID ${studentId} from classroom ID ${classroomId} by teacher ID ${req.user.id}`
    );

    try {
      // ตรวจสอบว่าห้องเรียนมีอยู่ในระบบหรือไม่
      const classroom = await db.getClassroomById(classroomId);
      if (!classroom) {
        return res
          .status(404)
          .json({ status: "error", message: "Classroom not found" });
      }

      // ตรวจสอบว่าอาจารย์เป็นเจ้าของห้องเรียนหรือไม่
      const isOwner = await db.checkClassroomOwnership(
        classroomId,
        req.user.id
      );
      if (!isOwner) {
        return res.status(403).json({
          status: "error",
          message:
            "You do not have permission to remove members from this classroom",
        });
      }

      // ตรวจสอบว่านิสิตเป็นสมาชิกของห้องเรียนนี้หรือไม่
      const isMember = await db.checkClassroomMembership(
        classroomId,
        studentId
      );
      if (!isMember) {
        return res.status(400).json({
          status: "error",
          message: "Student is not a member of this classroom",
        });
      }

      // ลบสมาชิก
      await db.removeClassroomMember(classroomId, studentId);
      console.log(
        `Teacher ID ${req.user.id} removed student ID ${studentId} from classroom ID ${classroomId}`
      );
      res.json({ status: "success", message: "Member removed from classroom" });
    } catch (error) {
      console.error("Error removing member:", error); // log ข้อผิดพลาด
      res.status(500).json({ status: "error", message: error.message });
    }
  }
);

// เพิ่มห้องเรียน
router.post(
  "/classroom",
  authenticateToken,
  authorizeTeacher,
  async (req, res) => {
    const { code, days, endTime, group, room, startTime, subject, type } =
      req.body;

    // ตรวจสอบว่าฟิลด์ที่จำเป็นทั้งหมดมีอยู่
    if (
      !code ||
      !days ||
      !endTime ||
      !group ||
      !room ||
      !startTime ||
      !subject ||
      !type
    ) {
      return res
        .status(400)
        .json({ status: "error", message: "All fields are required" });
    }

    try {
      // ใช้ req.user.id แทน teacher_id จาก frontend
      const teacher_id = req.user.id;

      console.log("User data:", req.user); // เช็คค่าของ req.user
      console.log("Teacher ID:", teacher_id); // เช็คค่าของ teacher_id

      // ตรวจสอบว่า teacher_id มีค่าหรือไม่
      if (!teacher_id) {
        return res
          .status(400)
          .json({ status: "error", message: "Teacher ID is undefined" });
      }

      console.log("Creating classroom for teacher_id:", teacher_id);

      // สร้างห้องเรียน โดยส่ง teacher_id เป็นส่วนหนึ่งของอ็อบเจ็กต์
      const classroomId = await db.createClassroom({
        code,
        teacher_id, // เพิ่ม teacher_id เข้าไปในอ็อบเจ็กต์
        days,
        endTime,
        group,
        room,
        startTime,
        subject,
        type,
      });

      res.status(201).json({
        status: "success",
        message: "Classroom created",
        classroomId,
      });
    } catch (error) {
      console.error("Error creating classroom:", error); // เพิ่มการ log error
      res.status(500).json({ status: "error", message: error.message });
    }
  }
);

// ดึงข้อมูลห้องเรียนทั้งหมดที่ผู้ใช้สามารถเข้าถึงได้
router.get("/classrooms", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    let classrooms;

    if (userRole === "teacher") {
      // สำหรับอาจารย์ ดึงห้องเรียนที่สร้างโดยอาจารย์คนนี้
      classrooms = await db.getClassroomsByTeacherId(userId);
    } else if (userRole === "nisit") {
      // สำหรับนิสิต ดึงห้องเรียนที่นิสิตเข้าร่วม
      classrooms = await db.getClassroomsByStudentId(userId);
    } else {
      return res.status(403).json({ status: "error", message: "Invalid role" });
    }

    res.json(classrooms);
  } catch (error) {
    console.error("Error fetching classrooms:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// เพิ่มนิสิตเข้าห้องเรียนด้วยรหัส
router.post("/join-classroom", authenticateToken, async (req, res) => {
  const { code } = req.body; // รหัสห้องเรียน
  const studentId = req.user.id; // ใช้ ID ของนิสิตจาก token

  // ตรวจสอบว่ามีรหัสห้องเรียนหรือไม่
  if (!code) {
    return res
      .status(400)
      .json({ status: "error", message: "Class code is required" });
  }

  try {
    // ตรวจสอบว่าห้องเรียนมีอยู่ในฐานข้อมูล
    const classroom = await db.getClassroomByCode(code);
    if (!classroom) {
      return res
        .status(404)
        .json({ status: "error", message: "Classroom not found" });
    }

    // ตรวจสอบว่าผู้ใช้เป็นสมาชิกในห้องเรียนอยู่แล้วหรือไม่
    const isMember = await db.checkClassroomMembership(classroom.id, studentId);
    if (isMember) {
      return res.status(400).json({
        status: "error",
        message: "You are already a member of this classroom",
      });
    }

    // เพิ่มนิสิตเข้าห้องเรียน
    await db.addClassroomMember(classroom.id, studentId);
    res.json({
      status: "success",
      message: "Successfully joined the classroom",
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// ดึงสมาชิกในห้องเรียน
router.get(
  "/classroom/:classroomId/members",
  authenticateToken,
  async (req, res) => {
    const classroomId = req.params.classroomId;

    try {
      const members = await db.getClassroomMembers(classroomId);
      if (!members.length) {
        return res
          .status(404)
          .json({ status: "error", message: "No members found" });
      }
      res.json(members);
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }
);

// ลบห้องเรียน (สำหรับอาจารย์) โดยไม่ต้องตรวจสอบว่ามีสมาชิกอยู่หรือไม่
router.delete(
  "/classroom/:classroomId",
  authenticateToken,
  authorizeTeacher,
  async (req, res) => {
    const classroomId = req.params.classroomId;

    try {
      // ลบสมาชิกทั้งหมดก่อน
      await db.removeAllClassroomMembers(classroomId); // ฟังก์ชันนี้ต้องสร้างใน db.js
      console.log(`All members removed from classroom ID ${classroomId}`);

      // ลบห้องเรียน
      await db.deleteClassroom(classroomId);
      res.json({
        status: "success",
        message: "Classroom deleted successfully",
      });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }
);

// ดึงข้อมูลห้องเรียน
router.get("/classroom/:classroomId", authenticateToken, async (req, res) => {
  const classroomId = req.params.classroomId;

  try {
    const classroom = await db.getClassroomById(classroomId);
    if (!classroom) {
      return res
        .status(404)
        .json({ status: "error", message: "Classroom not found" });
    }
    res.json(classroom);
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// อัปเดตข้อมูลห้องเรียน
router.put(
  "/classroom/:classroomId",
  authenticateToken,
  authorizeTeacher,
  async (req, res) => {
    const classroomId = req.params.classroomId;
    const { room, subject, group, startTime, endTime, days, type } = req.body;

    // ตรวจสอบว่ามีข้อมูลที่จะอัปเดตทั้งหมด
    if (
      !room ||
      !subject ||
      !group ||
      !startTime ||
      !endTime ||
      !days ||
      !type
    ) {
      return res.status(400).json({
        status: "error",
        message: "All fields are required to update",
      });
    }

    try {
      console.log(
        "Updating classroom with ID:",
        classroomId,
        "and data:",
        req.body
      ); // เพิ่มการ log
      await db.updateClassroom(classroomId, {
        room,
        subject,
        group,
        startTime,
        endTime,
        days,
        type,
      });
      res.json({
        status: "success",
        message: "Classroom updated successfully",
      });
    } catch (error) {
      console.error("Error updating classroom:", error);
      res.status(500).json({ status: "error", message: error.message });
    }
  }
);

module.exports = router;
