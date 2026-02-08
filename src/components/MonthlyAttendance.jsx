import React from "react";

const MonthlyAttendanceTable = ({ attendance = [] }) => {
  return (
    <div className="attendance-section mb-6 bg-white p-4 rounded shadow">
      <h3 className="text-lg font-semibold mb-3">Monthly Attendance</h3>

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-300 table-fixed">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2 text-center">Date</th>
              <th className="border p-2 text-center">Check In</th>
              <th className="border p-2 text-center">Check Out</th>
              <th className="border p-2 text-center">Office Time</th>
              <th className="border p-2 text-left w-[220px]">Status</th>
              <th className="border p-2 text-center">Shift</th>
            </tr>
          </thead>

          <tbody>
            {attendance && attendance.length > 0 ? (
              attendance.map((item, index) => (
                <tr key={index}>
                  <td className="border p-2 text-center">{item.date || "—"}</td>
                  <td className="border p-2 text-center">{item.checkIn || "—"}</td>
                  <td className="border p-2 text-center">{item.checkOut || "—"}</td>
                  <td className="border p-2 text-center">{item.officeTime || "—"}</td>

                 {/* STATUS ALIGNMENT FIX */}
                  <td className="border p-2 text-left align-middle">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-yellow-300 text-black whitespace-nowrap">
                      {(item.status || "—").replaceAll("_", " ").toUpperCase()}
                    </span>
                  </td>

                  <td className="border p-2 text-center">{item.shift || "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="border p-3 text-center text-gray-500">
                  No attendance records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MonthlyAttendanceTable;
