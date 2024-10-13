import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, TextField, Typography, Paper } from "@mui/material";
import ClassIcon from "@mui/icons-material/Class";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

function JoinClassroom({ setShowJoin }) {
  const [classCode, setClassCode] = useState("");
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");

  const handleJoinClassroom = async () => {
    if (classCode.trim() === "") {
      setErrorMessage("กรุณาใส่รหัสห้องเรียนที่ถูกต้อง");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMessage("ไม่พบ Token กรุณาเข้าสู่ระบบอีกครั้ง");
      return;
    }

    try {
      const decodedToken = jwtDecode(token);
      const userId = decodedToken.id;

      const response = await axios.post(
        "http://localhost:3333/api/join-classroom",
        { code: classCode },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        alert(`เข้าร่วมห้องเรียนด้วยรหัส '${classCode}' เรียบร้อยแล้ว!`);
        setShowJoin(false);
        navigate("/room");
      } else {
        setErrorMessage("เกิดข้อผิดพลาดในการเข้าร่วมห้องเรียน");
      }
    } catch (error) {
      console.error(
        "Error joining classroom:",
        error.response?.data || error.message
      );
      setErrorMessage(
        error.response?.data?.message || "เกิดข้อผิดพลาดในการเข้าร่วมห้องเรียน"
      );
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        padding: 4,
        maxWidth: 400,
        width: "100%",
        textAlign: "center",
        borderRadius: 2,
        backgroundColor: "#ffffff",
      }}
    >
      <ClassIcon
        sx={{
          fontSize: 50,
          color: "#3f51b5",
          marginBottom: 2,
        }}
      />
      <Typography variant="h5" gutterBottom>
        เข้าร่วมห้องเรียน
      </Typography>
      <TextField
        variant="outlined"
        label="รหัสห้องเรียน"
        fullWidth
        value={classCode}
        onChange={(e) => {
          setClassCode(e.target.value);
          setErrorMessage(""); // รีเซ็ตข้อความข้อผิดพลาดเมื่อมีการเปลี่ยนแปลงรหัส
        }}
        sx={{
          marginBottom: 3,
        }}
      />
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={handleJoinClassroom}
        sx={{
          backgroundColor: "#3f51b5",
          "&:hover": {
            backgroundColor: "#303f9f",
          },
        }}
      >
        เข้าร่วม
      </Button>
      {errorMessage && (
        <Typography color="error" variant="body2" mt={2}>
          {errorMessage}
        </Typography>
      )}
    </Paper>
  );
}

export default JoinClassroom;
