import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import {
  Typography,
  Paper,
  Button,
  Box,
  Grid,
  Skeleton,
  Snackbar,
} from "@mui/material";

function ClassroomPage() {
  const [classrooms, setClassrooms] = useState([]);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          alert("ไม่พบโทเคน กรุณาล็อกอินใหม่");
          navigate("/login");
          return;
        }

        const decodedToken = jwtDecode(token);
        setRole(decodedToken.role);

        const response = await axios.get(
          "http://localhost:3333/api/classrooms",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setClassrooms(response.data);
      } catch (error) {
        console.error(
          "Error fetching classroom data:",
          error.response?.data || error.message
        );
        setSnackbarMessage(
          "ไม่สามารถดึงข้อมูลห้องเรียนได้ กรุณาลองใหม่อีกครั้ง"
        );
        setSnackbarOpen(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const handleDeleteClassroom = async (classroomId) => {
    const confirmDelete = window.confirm(
      "คุณแน่ใจหรือไม่ว่าต้องการลบห้องเรียนนี้?"
    );
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:3333/api/classroom/${classroomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClassrooms((prevClassrooms) =>
        prevClassrooms.filter((classroom) => classroom.id !== classroomId)
      );
      setSnackbarMessage("ห้องเรียนถูกลบเรียบร้อยแล้ว");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error deleting classroom:", error);
      if (error.response?.status === 404) {
        setSnackbarMessage("ไม่พบห้องเรียนที่ต้องการลบ");
      } else {
        setSnackbarMessage("เกิดข้อผิดพลาดในการลบห้องเรียน: " + error.message);
      }
      setSnackbarOpen(true);
    }
  };

  const handleLeaveClassroom = async (classroomId) => {
    const confirmLeave = window.confirm(
      "คุณแน่ใจหรือไม่ว่าต้องการออกจากห้องเรียนนี้?"
    );
    if (!confirmLeave) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("ไม่พบโทเคน กรุณาล็อกอินใหม่");
        return;
      }

      await axios.delete(
        `http://localhost:3333/api/classroom/${classroomId}/member/self`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setClassrooms((prevClassrooms) =>
        prevClassrooms.filter((classroom) => classroom.id !== classroomId)
      );
      setSnackbarMessage("คุณได้ออกจากห้องเรียนเรียบร้อยแล้ว");
      setSnackbarOpen(true);
    } catch (error) {
      console.error(
        "Error leaving classroom:",
        error.response?.data || error.message
      );
      setSnackbarMessage(
        "เกิดข้อผิดพลาดในการออกจากห้องเรียน: " +
          (error.response?.data?.message || error.message)
      );
      setSnackbarOpen(true);
    }
  };

  const handleNavigateToClassroom = useCallback(
    (classroomId) => {
      navigate(`/room/${classroomId}`);
    },
    [navigate]
  );

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h5" gutterBottom>
        ข้อมูลห้องเรียนทั้งหมด
      </Typography>
      {loading ? (
        <Skeleton variant="rectangular" height={118} />
      ) : (
        <Grid container spacing={3}>
          {classrooms.map((classroom) => (
            <Grid item xs={12} sm={6} md={4} key={classroom.id}>
              <Paper
                elevation={3}
                sx={{ padding: 2, cursor: "pointer" }}
                onClick={() => handleNavigateToClassroom(classroom.id)}
              >
                <Typography variant="h6">{classroom.subject}</Typography>
                <Typography>หมู่เรียน: {classroom.group}</Typography>
                <Typography>ห้องเรียน: {classroom.room}</Typography>
                <Typography>ประเภท: {classroom.type}</Typography>
                <Typography>เวลาเริ่ม: {classroom.startTime}</Typography>
                <Typography>เวลาสิ้นสุด: {classroom.endTime}</Typography>
                <Typography>วันเรียน: {classroom.days.join(", ")}</Typography>

                <Box
                  sx={{
                    marginTop: 2,
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  {role === "teacher" && (
                    <Button
                      variant="contained"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClassroom(classroom.id);
                      }}
                      sx={{ marginRight: 1 }}
                    >
                      ลบห้องเรียน
                    </Button>
                  )}

                  {role === "nisit" && (
                    <Button
                      variant="contained"
                      color="warning"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLeaveClassroom(classroom.id);
                      }}
                    >
                      ออกจากห้องเรียน
                    </Button>
                  )}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
      />
    </Box>
  );
}

export default ClassroomPage;
