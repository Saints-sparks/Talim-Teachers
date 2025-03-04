"use client";

import React from "react";
import Image from "next/image";
import TaskRow, { TaskStatus, TaskRowProps } from "./TaskRow";
import bg from "../../public/image/dash/picstude.png";

const TaskTable: React.FC = () => {
  const tasks: (Omit<TaskRowProps, 'student'> & { student: string | typeof bg })[] = [
    {
      name: "Further Mathematics",
      student: bg,
      className: "Ss 2",
      duration: "16 hours",
      status: "In Progress",
      completed: 5,
      total: 20,
    },
    {
      name: "Mathematics",
      student: "Ss 3",
      className: "Ss 3",
      duration: "14 hours",
      status: "Pending",
      completed: 5,
      total: 20,
    },
    {
      name: "Statistics",
      student: "Ss 2",
      className: "Ss 2",
      duration: "6 hours",
      status: "Completed",
      completed: 20,
      total: 20,
    },
    {
      name: "Mathematics",
      student: "Jss 1",
      className: "Jss 1",
      duration: "5 hours",
      status: "Completed",
      completed: 20,
      total: 20,
    },
  ];

  return (
    <div className="px-4 py-6">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Tasks</h2>
        <p className="text-sm text-gray-600">
          Keep track of your students' assignments and course activities.
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Name</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Student</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Class</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Duration</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Status</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Completion rate</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <TaskRow
                key={task.name}
                {...task}
                student={typeof task.student === 'string' ? task.student : task.student.src}
              />
            ))}
          </tbody>
        </table>
      </div>

      <footer className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <span>Row per page: 4</span>
        <span>Showing 1-4 of 40</span>
        <div className="flex space-x-2">
          <button className="px-2 py-1 border border-gray-300 rounded-md" aria-label="Previous page">
            &lt;
          </button>
          <button className="px-2 py-1 border border-gray-300 rounded-md" aria-label="Next page">
            &gt;
          </button>
        </div>
      </footer>
    </div>
  );
};

export default TaskTable;

