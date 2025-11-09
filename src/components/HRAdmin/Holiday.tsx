import { useState, useEffect } from "react";
import supabase from "../../utils/supabase";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

interface Holiday {
  id: number;
  title: string;
  date: string;
  description: string;
  type: string;
  is_active: boolean;
  created_by: number | null;
  created_at: string;
}

export const Holiday = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    description: "",
    type: "Regular Holiday",
    is_active: true,
  });

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("holidays")
        .select("*")
        .order("date", { ascending: true });

      if (error) throw error;
      setHolidays(data || []);
    } catch (error) {
      console.error("Error fetching holidays:", error);
      toast.error("Failed to load holidays");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingHoliday) {
        // Update existing holiday - only update editable fields
        const updateData = {
          title: formData.title,
          date: formData.date,
          description: formData.description,
          type: formData.type,
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        };
        
        const { error } = await supabase
          .from("holidays")
          .update(updateData)
          .eq("id", editingHoliday.id);

        if (error) throw error;
        
        await Swal.fire({
          title: "Updated!",
          text: "Holiday has been updated successfully.",
          icon: "success",
          confirmButtonColor: "#dc2626",
          timer: 2000,
        });
      } else {
        // Create new holiday - get current user ID
        const { data: { user } } = await supabase.auth.getUser();
        
        // Get user's database ID from users table
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("auth_id", user?.id)
          .single();

        const holidayData = {
          title: formData.title,
          date: formData.date,
          description: formData.description,
          type: formData.type,
          is_active: formData.is_active,
          created_by: userData?.id || null
        };

        const { error } = await supabase.from("holidays").insert([holidayData]);

        if (error) throw error;
        
        await Swal.fire({
          title: "Created!",
          text: "Holiday has been created successfully.",
          icon: "success",
          confirmButtonColor: "#dc2626",
          timer: 2000,
        });
      }

      setShowModal(false);
      setEditingHoliday(null);
      setFormData({ title: "", date: "", description: "", type: "Regular Holiday", is_active: true });
      fetchHolidays();
    } catch (error) {
      console.error("Error saving holiday:", error);
      await Swal.fire({
        title: "Error!",
        text: "Failed to save holiday. Please try again.",
        icon: "error",
        confirmButtonColor: "#dc2626",
      });
    }
  };

  const handleDelete = async (id: number, title: string) => {
    const result = await Swal.fire({
      title: "Delete Holiday?",
      html: `Are you sure you want to delete <strong>${title}</strong>?<br><span style="color: #dc2626;">This action cannot be undone.</span>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      const { error } = await supabase.from("holidays").delete().eq("id", id);

      if (error) throw error;
      
      await Swal.fire({
        title: "Deleted!",
        text: "Holiday has been deleted successfully.",
        icon: "success",
        confirmButtonColor: "#dc2626",
        timer: 2000,
      });
      
      fetchHolidays();
    } catch (error) {
      console.error("Error deleting holiday:", error);
      await Swal.fire({
        title: "Error!",
        text: "Failed to delete holiday. Please try again.",
        icon: "error",
        confirmButtonColor: "#dc2626",
      });
    }
  };

  const openEditModal = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      title: holiday.title,
      date: holiday.date,
      description: holiday.description,
      type: holiday.type,
      is_active: holiday.is_active,
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingHoliday(null);
    setFormData({ title: "", date: "", description: "", type: "Regular Holiday", is_active: true });
    setShowModal(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Regular Holiday":
        return "bg-red-100 text-red-800 border-red-200";
      case "Special Holiday":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "School Event":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
                Holiday Management
              </h1>
              <p className="mt-2 text-sm text-gray-600">Manage school holidays and special events</p>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white text-sm font-medium rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Holiday
            </button>
          </div>
        </div>

        {/* Holidays List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-200 border-t-red-600"></div>
              <p className="text-sm text-gray-600">Loading holidays...</p>
            </div>
          </div>
        ) : holidays.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No holidays yet</h3>
              <p className="text-gray-600 mb-6">Get started by adding your first holiday to the system</p>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white text-sm font-medium rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Holiday
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {holidays.map((holiday) => (
              <div
                key={holiday.id}
                className={`bg-white rounded-xl border-2 p-5 transition-all duration-200 ${
                  !holiday.is_active 
                    ? "border-gray-300 opacity-60 hover:shadow-md" 
                    : "border-gray-200 hover:border-red-300 hover:shadow-lg transform hover:scale-[1.02]"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 line-clamp-1">{holiday.title}</h3>
                      {!holiday.is_active && (
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-medium rounded-full whitespace-nowrap">
                          Inactive
                        </span>
                      )}
                    </div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border-2 ${getTypeColor(holiday.type)}`}>
                      {holiday.type}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => openEditModal(holiday)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:scale-110"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(holiday.id, holiday.title)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="space-y-2.5 mt-4">
                  <div className="flex items-start gap-2 text-gray-700">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs sm:text-sm font-medium">{formatDate(holiday.date)}</span>
                  </div>
                  {holiday.description && (
                    <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 pl-6">{holiday.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingHoliday ? "Edit Holiday" : "Add Holiday"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., Christmas Day"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="Regular Holiday">Regular Holiday</option>
                    <option value="Special Holiday">Special Holiday</option>
                    <option value="School Event">School Event</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    placeholder="Optional description..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                    Active (Users will be exempted from attendance on this date)
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200"
                  >
                    {editingHoliday ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
};
