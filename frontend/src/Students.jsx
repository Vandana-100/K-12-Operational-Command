import { useEffect, useState } from "react";
import axios from "axios";

function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("https://k-12-operational-command.onrender.com/api/students")
      .then((response) => {
        setStudents(response.data);
      })
      .catch((error) => {
        console.error("Error fetching students:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <h2>Loading students...</h2>;
  }

  return (
    <div>
      <h1>Students</h1>

      {students.map((student) => (
        <div key={student.id}>
          <h3>{student.name}</h3>
          <p>Class: {student.class_name}</p>
          <p>Attendance: {student.attendance_rate}%</p>
          <p>Learning Score: {student.learning_score}</p>
        </div>
      ))}
    </div>
  );
}

export default Students;