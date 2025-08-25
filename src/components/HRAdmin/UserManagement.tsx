// src/pages/UserManagement.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

export const UserManagement = () => {
  const [create, showCreate] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "Faculty",
  });

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";

    const { error } = await supabase
      .from("users")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      console.error(error.message);
      alert("Failed to update user status");
    } else {
      fetchUsers();
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setUsers(data || []);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("users").insert([
      {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: "Active",
      },
    ]);
    if (error) {
      alert(error.message);
    } else {
      showCreate(false);
      setNewUser({ name: "", email: "", role: "Faculty" });
      fetchUsers();
    }
  };

  return (
    <div className="flex h-screen w-full lg:w-[87%] justify-end relative py-5 roboto px-3 sm:px-5">
      <main className="flex flex-col w-full p-4 sm:p-6 bg-white shadow rounded-lg overflow-y-auto">
        {/* Header */}
        <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            User Management
          </h1>
          <button
            onClick={() => showCreate(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 w-full sm:w-auto"
          >
            + Create New User
          </button>
        </section>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg text-sm sm:text-base">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left border-b">ID</th>
                <th className="px-4 py-2 text-left border-b">Name</th>
                <th className="px-4 py-2 text-left border-b">Email</th>
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
                  <td className="px-4 py-2 border-b">{user.email}</td>
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
                  <td className="px-4 py-2 border-b flex flex-wrap gap-2">
                    <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                      Edit
                    </button>
                    {user.status === "Active" ? (
                      <button
                        onClick={() => handleToggleStatus(user.id, user.status)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleStatus(user.id, user.status)}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      >
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal */}
      {create && (
        <div className="absolute flex backdrop-blur-xs bg-gray-50/40 items-center justify-center h-full w-full top-0 left-0 px-4">
          <form
            onSubmit={handleCreate}
            className="w-full sm:w-[70%] md:w-[50%] lg:w-[40%] rounded"
          >
            <div className="flex flex-col p-4 bg-white shadow-md rounded-lg gap-3">
              <input
                type="text"
                placeholder="Full Name"
                value={newUser.name}
                onChange={(e) =>
                  setNewUser({ ...newUser, name: e.target.value })
                }
                className="border px-3 py-2 rounded"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
                className="border px-3 py-2 rounded"
                required
              />
              <select
                value={newUser.role}
                onChange={(e) =>
                  setNewUser({ ...newUser, role: e.target.value })
                }
                className="border px-3 py-2 rounded"
              >
                <option>Administrator</option>
                <option>HR Personnel</option>
                <option>Accounting</option>
                <option>Faculty</option>
                <option>Staff</option>
                <option>SA</option>
              </select>
              <div className="flex flex-col sm:flex-row gap-3 mt-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full sm:w-auto"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => showCreate(false)}
                  className="px-4 py-2 border rounded w-full sm:w-auto"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
