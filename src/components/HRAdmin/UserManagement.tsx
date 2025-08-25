// src/pages/UserManagement.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

export const UserManagement = () => {
  const [create, showCreate] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state for new user
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "Faculty",
  });

  // Fetch users from Supabase
  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from("users")
      .insert([
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
    <div className="flex h-screen w-[87%] justify-end relative py-5 roboto pl-5">
      <main className="flex flex-col w-full p-6 bg-white shadow rounded-l-xl overflow-y-auto">
        <section className="flex justify-between items-center mb-6">
          <h1 className="text-2xl">User Management</h1>
          <button
            onClick={() => showCreate(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            + Create New User
          </button>
        </section>

        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg">
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

      {create && (
          <div className="absolute flex backdrop-blur-xs bg-gray-50/40 items-center -translate-y-5 justify-center h-full w-full">
            <form
              onSubmit={handleCreate}
              className="w-[70%]  rounded"
            >
              <div className="flex flex-col p-4 bg-white shadow-xs/60 rounded-lg gap-3">
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
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => showCreate(false)}
                    className="px-4 py-2 border rounded"
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
