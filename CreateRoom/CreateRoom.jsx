// CreateClassrooms.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { Box, Button, Typography } from "@mui/material";
import CreateClassroomForm from "./CreateClassroomForm";
import JoinClassroom from "./Joinclass";

function CreateClassrooms() {
  const [role, setRole] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        console.log("Decoded Token:", decodedToken);
        if (decodedToken.role) {
          setRole(decodedToken.role);
        }
      } catch (error) {
        console.error("Invalid token", error);
      }
    } else {
      alert("กรุณาเข้าสู่ระบบก่อน");
      navigate("/login");
    }
  }, [navigate]);

  const handleCreateClassroom = () => {
    if (role === "teacher") {
      setShowCreateForm(true);
      setShowJoinForm(false);
      console.log("Form should appear");
    } else {
      alert("คุณไม่มีสิทธิ์สร้างห้องเรียน");
    }
  };

  const handleJoinClassroom = () => {
    if (role === "nisit") {
      setShowJoinForm(true);
      setShowCreateForm(false);
      console.log("Join Form should appear");
    } else {
      alert("คุณไม่มีสิทธิ์เข้าร่วมห้องเรียน");
    }
  };

  return (
    <Box sx={{ textAlign: "center", paddingTop: "2rem" }}>
      {!showCreateForm && !showJoinForm && (
        <>
          {role === "teacher" && (
            <Button
              variant="contained"
              onClick={handleCreateClassroom}
              sx={{ margin: 1 }}
            >
              Create Classroom
            </Button>
          )}
          {role === "nisit" && (
            <Button
              variant="outlined"
              onClick={handleJoinClassroom}
              sx={{ margin: 1 }}
            >
              Join Classroom
            </Button>
          )}
        </>
      )}
      {showCreateForm && (
        <CreateClassroomForm setShowForm={setShowCreateForm} />
      )}
      {showJoinForm && <JoinClassroom setShowJoin={setShowJoinForm} />}
    </Box>
  );
}

export default CreateClassrooms;
