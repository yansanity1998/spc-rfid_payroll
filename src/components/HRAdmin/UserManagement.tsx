// src/pages/UserManagement.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

export const UserManagement = () => {
  const [create, showCreate] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rows = 10;

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

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

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

  // Filtered users based on search
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  );

  const indexLast = currentPage * rows;
  const indexFirst = indexLast - rows;
  const currentUsers = filteredUsers.slice(indexFirst, indexLast);

  return (
    <div className="flex h-screen w-full lg:w-[87%] justify-end relative py-5 roboto px-3 sm:px-5">
      <main className="flex flex-col w-full p-4 sm:p-6 bg-white shadow rounded-lg overflow-y-auto">
        {/* Header */}
        <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            User Management
          </h1>
          <div className="space-x-10 flex">
            <div className="relative w-full max-w-md flex items-center">
              <input
                id="searchInput"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="transition-all duration-500 ease-in-out border w-72 border-gray-800 text-gray-700 rounded-full pl-5 pr-12 py-2 outline-none"
              />
              <svg
                className="search-bar absolute right-5 h-5 w-5 text-gray-600 transition-transform duration-200 ease-in-out"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15.7955 15.8111L21 21M18 10.5C18 14.6421 14.6421 18 10.5 18C6.35786 18 3 14.6421 3 10.5C3 6.35786 6.35786 3 10.5 3C14.6421 3 18 6.35786 18 10.5Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <button
              onClick={() => showCreate(true)}
              className="bg-green-600 text-white px-4 py-2 text-nowrap rounded-lg hover:bg-green-700 w-full sm:w-auto"
            >
              + Create New User
            </button>
          </div>
        </section>

        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full border-collapse bg-white text-sm sm:text-base">
            <thead className="bg-red-800 text-white sticky top-0 z-10">
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
              {currentUsers.map((user) => (
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
              {filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-4 text-gray-500 italic"
                  >
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-center space-x-2 items-center mt-4">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 cursor-pointer"
          >
            <svg
              className="h-6"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
              <g
                id="SVGRepo_tracerCarrier"
                stroke-linecap="round"
                stroke-linejoin="round"
              ></g>
              <g id="SVGRepo_iconCarrier">
                {" "}
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M15.7071 4.29289C16.0976 4.68342 16.0976 5.31658 15.7071 5.70711L9.41421 12L15.7071 18.2929C16.0976 18.6834 16.0976 19.3166 15.7071 19.7071C15.3166 20.0976 14.6834 20.0976 14.2929 19.7071L7.29289 12.7071C7.10536 12.5196 7 12.2652 7 12C7 11.7348 7.10536 11.4804 7.29289 11.2929L14.2929 4.29289C14.6834 3.90237 15.3166 3.90237 15.7071 4.29289Z"
                  fill="#000000"
                ></path>{" "}
              </g>
            </svg>
          </button>

          <span>
            Page {currentPage} of {Math.ceil(filteredUsers.length / rows)}
          </span>

          <button
            onClick={() =>
              setCurrentPage((prev) =>
                prev < Math.ceil(filteredUsers.length / rows) ? prev + 1 : prev
              )
            }
            disabled={currentPage === Math.ceil(filteredUsers.length / rows)}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 cursor-pointer" 
          >
            <svg
              className="h-6"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
              <g
                id="SVGRepo_tracerCarrier"
                stroke-linecap="round"
                stroke-linejoin="round"
              ></g>
              <g id="SVGRepo_iconCarrier">
                {" "}
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M8.29289 4.29289C8.68342 3.90237 9.31658 3.90237 9.70711 4.29289L16.7071 11.2929C17.0976 11.6834 17.0976 12.3166 16.7071 12.7071L9.70711 19.7071C9.31658 20.0976 8.68342 20.0976 8.29289 19.7071C7.90237 19.3166 7.90237 18.6834 8.29289 18.2929L14.5858 12L8.29289 5.70711C7.90237 5.31658 7.90237 4.68342 8.29289 4.29289Z"
                  fill="#000000"
                ></path>{" "}
              </g>
            </svg>
          </button>
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
