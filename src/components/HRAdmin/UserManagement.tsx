// src/pages/UserManagement.tsx
import { useState } from "react";

export const UserManagement = () => {
  // Mock users (later connect to DB)
  const [users, setUsers] = useState([
    { id: 1, name: "Admin User", role: "Administrator", status: "Active" },
    { id: 2, name: "Jane Smith", role: "HR Personnel", status: "Active" },
    { id: 3, name: "Mark Reyes", role: "Faculty", status: "Inactive" },
  ]);

  return (
    <div className="flex h-screen w-[87%] justify-end py-5 roboto pl-5">
      <main className="flex flex-col w-full p-6 bg-white shadow rounded-l-xl overflow-y-auto">
        <section className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            + Create New User
          </button>
        </section>

        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left border-b">ID</th>
                <th className="px-4 py-2 text-left border-b">Name</th>
                <th className="px-4 py-2 text-left border-b">Role</th>
                <th className="px-4 py-2 text-left border-b">Status</th>
                <th className="px-4 py-2 text-left border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border-b">{user.id}</td>
                  <td className="px-4 py-2 border-b">{user.name}</td>
                  <td className="px-4 py-2 border-b">{user.role}</td>
                  <td
                    className={`px-4 py-2 border-b font-semibold ${
                      user.status === "Active"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {user.status}
                  </td>
                  <td className="px-4 py-2 border-b">
                    <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2">
                      Edit
                    </button>
                    <button className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">
                      Deactivate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};
