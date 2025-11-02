// src/components/HRAdmin/Clearance.tsx

import React, { useEffect, useState } from "react";
import supabase from "../../utils/supabase";
import toast, { Toaster } from "react-hot-toast";
import Swal from 'sweetalert2';

export const Clearance = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  // selected user for managing records
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewUser, setViewUser] = useState<any | null>(null);

  // form state for editing clearance fields
  const [form, setForm] = useState({
    name: "",
    position: "",
    employee_status: "",
    employee_type: "",
    clearance_status: "",
    remarks: "",
    date_cleared: "",
    time_cleared: "",
    complete_clearance: false,
    date_submitted: "",
    time_submitted: "",
    term: "",
    school_year: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // fetch all users with role 'Faculty' - adjust if your role name differs
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "Faculty")
        .order("name", { ascending: true });

      if (error) {
        console.error(error);
        toast.error("Failed to fetch users: " + error.message);
      } else {
        const usersData = data || [];
        // Fetch clearances for these users and merge the latest clearance into each user object
        try {
          const ids = usersData.map((u: any) => u.id).filter(Boolean);
          if (ids.length > 0) {
            const { data: clearancesData, error: clearErr } = await supabase
              .from('clearances')
              .select('*')
              .in('user_id', ids)
              .order('created_at', { ascending: false });

            if (clearErr) {
              console.error('Failed to fetch clearances', clearErr);
              // still use usersData even if clearances fetch failed
              setUsers(usersData);
            } else {
              const clearanceMap: Record<string, any> = {};
              // pick the latest clearance per user (results ordered by created_at desc)
              (clearancesData || []).forEach((c: any) => {
                if (!clearanceMap[c.user_id]) clearanceMap[c.user_id] = c;
              });
              const merged = usersData.map((u: any) => ({ ...u, clearance: clearanceMap[u.id] || null }));
              setUsers(merged);
            }
          } else {
            setUsers(usersData);
          }
        } catch (innerEx: any) {
          console.error('Unexpected error fetching clearances', innerEx);
          setUsers(usersData);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Unexpected error fetching users");
    }
    setLoading(false);
  };



  // Open the edit modal directly for a user (used from the table Edit button)
  const openUserEditModal = (user: any) => {
    // set selected user but do NOT open the right-side panel; open modal instead
    setSelectedUser(user);
    const clearance = user.clearance || null;
    setEditingRecord(clearance);
    setForm({
      name: user.name || "",
      position: Array.isArray(user.positions) ? user.positions.join(", ") : (user.position || user.positions || ""),
      employee_status: user.status || "",
      employee_type: Array.isArray(user.positions) ? user.positions.join(", ") : (user.position || user.positions || ""),
      clearance_status: clearance?.clearance_status || "Pending",
      remarks: clearance?.clearance_remarks || "",
      date_cleared: clearance?.date_cleared || "",
      time_cleared: clearance?.time_cleared || "",
      complete_clearance: !!clearance?.complete_clearance,
      date_submitted: clearance?.date_submitted || "",
      time_submitted: clearance?.time_submitted || "",
      term: clearance?.term || "",
      school_year: clearance?.school_year || "",
    });
    setRecordModalOpen(true);
  };


 

  const closeRecordModal = () => {
    setRecordModalOpen(false);
    setEditingRecord(null);
  };

  const openViewModal = (user: any) => {
    setViewUser(user);
    setViewModalOpen(true);
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setViewUser(null);
  };

  const saveRecord = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const recordObj: any = {
        user_id: selectedUser.id,
        clearance_status: form.clearance_status || null,
        clearance_remarks: form.remarks || null,
        date_cleared: form.date_cleared || null,
        time_cleared: form.time_cleared || null,
        complete_clearance: form.complete_clearance || false,
        date_submitted: form.date_submitted || null,
        time_submitted: form.time_submitted || null,
        term: form.term || null,
        school_year: form.school_year || null,
      };
      // If there's an existing clearance for this user, update it instead of inserting
      const existingId = editingRecord?.id || selectedUser?.clearance?.id;
      let returnedRecord: any = null;
      if (existingId) {
        const { data, error } = await supabase.from('clearances').update(recordObj).eq('id', existingId).select().limit(1).single();
        if (error) {
          console.error('Update record failed', error);
          await Swal.fire({ icon: 'error', title: 'Save failed', text: error.message });
          setSaving(false);
          return;
        }
        returnedRecord = data;
      } else {
        // No existing clearance -> insert
        const { data, error } = await supabase.from('clearances').insert(recordObj).select();
        if (error) {
          // handle unique constraint error more gracefully
          console.error('Insert record failed', error);
          if (error.message && error.message.includes('duplicate key')) {
            // Duplicate exists: silently fallback to updating the existing record
            const { data: found, error: findErr } = await supabase.from('clearances').select('*').eq('user_id', selectedUser.id).limit(1).single();
            if (findErr) {
              console.error('Failed to find existing clearance after duplicate error', findErr);
              await Swal.fire({ icon: 'error', title: 'Save failed', text: findErr.message });
              setSaving(false);
              return;
            }
            if (found?.id) {
              const { data: updated, error: updErr } = await supabase.from('clearances').update(recordObj).eq('id', found.id).select().limit(1).single();
              if (updErr) {
                console.error('Fallback update failed', updErr);
                await Swal.fire({ icon: 'error', title: 'Save failed', text: updErr.message });
                setSaving(false);
                return;
              }
              returnedRecord = updated;
            } else {
              setSaving(false);
              return;
            }
          } else {
            await Swal.fire({ icon: 'error', title: 'Save failed', text: error.message });
            setSaving(false);
            return;
          }
        } else {
          // data is an array when inserting
          returnedRecord = Array.isArray(data) ? data[0] : data;
        }
      }

      // update local users state so UI shows latest clearance info
      if (returnedRecord) {
        setUsers((prev) => prev.map((u) => u.id === selectedUser.id ? { ...u, clearance: returnedRecord } : u));
        // refresh from server to ensure UI matches DB (include any triggers/defaults)
        await fetchUsers();
      }

    await Swal.fire({ icon: 'success', title: 'Saved', text: 'Record saved', timer: 1200, showConfirmButton: false });
    // close modal; list refresh is omitted (no right-side records panel)
    closeRecordModal();
    } catch (ex: any) {
      console.error(ex);
      await Swal.fire({ icon: 'error', title: 'Save failed', text: 'Unexpected error' });
    }
    setSaving(false);
  };

  

  const handleChange = (key: string, value: any) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  // map clearance status to badge classes
  const statusBadgeClasses = (status: string | undefined) => {
    const s = String(status || '').toLowerCase();
    if (s === 'cleared') return 'inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800';
    if (s === 'pending') return 'inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800';
    if (s === 'on-hold' || s === 'on hold' || s === 'hold') return 'inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800';
    if (s === 'rejected' || s === 'denied') return 'inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800';
    // default
    return 'inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800';
  };

  // Export helpers for view modal
  const escapeCsv = (value: any) => {
    if (value === null || value === undefined) return '';
    const s = String(value);
    // escape double quotes
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const exportClearanceCSV = (user: any) => {
    const c = user.clearance || {};
    const rows = [
      ['Name', 'Email', 'Position', 'Term', 'School Year', 'Clearance Status', 'Remarks', 'Date submitted', 'Date cleared', 'Time cleared'],
      [user.name, user.email || '', Array.isArray(user.positions) ? user.positions.join('; ') : (user.position || ''), c.term || '', c.school_year || '', c.clearance_status || '', c.clearance_remarks || '', c.date_submitted || '', c.date_cleared || '', c.time_cleared || '']
    ];
    const csv = rows.map(r => r.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(user.name || 'clearance').replace(/\s+/g, '_')}_clearance.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  

  // Note: user-level save logic has been removed to avoid unused/dead code.
  // User updates should be performed via a dedicated UI or separate flow if required.

  // Delete removed - replaced by View functionality

  const filtered = users.filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (u.name || "").toLowerCase().includes(s) || (u.email || "").toLowerCase().includes(s) || (u.position || "").toLowerCase().includes(s);
  });

  // Calculate statistics
  const stats = {
    totalFaculty: users.length,
    cleared: users.filter(u => u.clearance?.clearance_status?.toLowerCase() === 'cleared').length,
    pending: users.filter(u => !u.clearance || u.clearance?.clearance_status?.toLowerCase() === 'pending').length,
    onHold: users.filter(u => u.clearance?.clearance_status?.toLowerCase() === 'on-hold' || u.clearance?.clearance_status?.toLowerCase() === 'on hold').length,
  };

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
      <Toaster position="top-right" />
      <ErrorBoundary>
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        {/* Modern Header */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Clearance Management</h1>
              <p className="text-gray-600">Manage faculty clearance records and approvals</p>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-90">Total Faculty</p>
                  <p className="text-2xl font-bold">{stats.totalFaculty}</p>
                </div>
                <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-90">Cleared</p>
                  <p className="text-2xl font-bold">{stats.cleared}</p>
                </div>
                <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-4 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-90">Pending</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
                <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-90">On Hold</p>
                  <p className="text-2xl font-bold">{stats.onHold}</p>
                </div>
                <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email or position"
                className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </section>

        {/* Modern Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-red-600 to-red-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Position</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Clearance</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Date Cleared</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-gray-600 font-medium">Loading clearance data...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                      </div>
                      <p className="text-gray-600 font-medium">No faculty users found</p>
                      <p className="text-gray-400 text-sm">Try adjusting your search criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-red-50 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {u.name?.charAt(0)?.toUpperCase() || 'F'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {Array.isArray(u.positions) ? u.positions.join(", ") : (u.position || u.positions || '-')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        u.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {u.status || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={statusBadgeClasses(u.clearance?.clearance_status)}>
                        {u.clearance?.clearance_status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {u.clearance?.date_cleared ? (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {u.clearance.date_cleared}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => openUserEditModal(u)} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button 
                          onClick={() => openViewModal(u)} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm hover:shadow-md"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                          </svg>
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* Modern View Modal */}
        {viewModalOpen && viewUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeViewModal} />
            <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white font-bold text-lg">
                      {viewUser.name?.charAt(0)?.toUpperCase() || 'F'}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Clearance Details</h3>
                      <p className="text-red-100 text-sm">{viewUser.name} • {Array.isArray(viewUser.positions) ? viewUser.positions.join(', ') : (viewUser.position || '')}</p>
                    </div>
                  </div>
                  <button 
                    onClick={closeViewModal}
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg flex items-center justify-center text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="px-6 py-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Name</label>
                    <div className="mt-1 text-sm text-gray-800">{viewUser.name}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Email</label>
                    <div className="mt-1 text-sm text-gray-800">{viewUser.email || '-'}</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Term</label>
                    <div className="mt-1 text-sm text-gray-800">{viewUser.clearance?.term || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">School Year</label>
                    <div className="mt-1 text-sm text-gray-800">{viewUser.clearance?.school_year || '-'}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-medium text-gray-600">Clearance Status</label>
                  <div className="mt-1">{viewUser.clearance ? <span className={statusBadgeClasses(viewUser.clearance.clearance_status)}>{viewUser.clearance.clearance_status}</span> : <span className="text-sm text-gray-500">No clearance</span>}</div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-medium text-gray-600">Remarks</label>
                  <div className="mt-1 text-sm text-gray-800">{viewUser.clearance?.clearance_remarks || '-'}</div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4 text-sm text-gray-700">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Date submitted</label>
                    <div className="mt-1">{viewUser.clearance?.date_submitted || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Date cleared</label>
                    <div className="mt-1">{viewUser.clearance?.date_cleared || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Time cleared</label>
                    <div className="mt-1">{viewUser.clearance?.time_cleared || '-'}</div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-center gap-3">
                  <button onClick={() => exportClearanceCSV(viewUser)} className="px-3 py-2 rounded-md bg-green-600 text-white text-sm hover:bg-green-700">Export CSV</button>
                  <button onClick={closeViewModal} className="px-4 py-2 rounded-lg border text-sm">Close</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modern Edit Modal */}
        {recordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeRecordModal} />
            <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white font-bold text-lg">
                      {selectedUser?.name?.charAt(0)?.toUpperCase() || 'F'}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Edit Clearance Record</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-red-100 text-sm">{selectedUser?.name}</p>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
                          {form.clearance_status || 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={closeRecordModal}
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg flex items-center justify-center text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="px-6 py-6">
                <form className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Term</label>
                      <select value={form.term} onChange={(e) => handleChange('term', e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                        <option value="">Select term</option>
                        <option value="1st sem">1st sem</option>
                        <option value="2nd sem">2nd sem</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">School Year</label>
                      <input value={form.school_year} onChange={(e) => handleChange('school_year', e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Clearance status</label>
                    <select value={form.clearance_status} onChange={(e) => handleChange('clearance_status', e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                      <option value="">Pending</option>
                      <option value="Pending">Pending</option>
                      <option value="Cleared">Cleared</option>
                      <option value="On-hold">On-hold</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Remarks</label>
                    <textarea value={form.remarks} onChange={(e) => handleChange('remarks', e.target.value)} rows={3} className="mt-1 block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm" />
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600">Date cleared</label>
                      <input type="date" value={form.date_cleared} onChange={(e) => handleChange('date_cleared', e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Time cleared</label>
                      <input type="time" value={form.time_cleared} onChange={(e) => handleChange('time_cleared', e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm" />
                    </div>
                    <div className="flex items-end">
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input id="complete" type="checkbox" checked={form.complete_clearance} onChange={(e) => handleChange('complete_clearance', e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                        Complete
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Date submitted</label>
                      <input type="date" value={form.date_submitted} onChange={(e) => handleChange('date_submitted', e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Time submitted</label>
                      <input type="time" value={form.time_submitted} onChange={(e) => handleChange('time_submitted', e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-3 mt-4">
                    <button type="button" onClick={closeRecordModal} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
                    <button type="button" onClick={saveRecord} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving...' : 'Save record'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
      </ErrorBoundary>
    </div>
  );
};

// Simple error boundary to avoid blank white screen and show error info
class ErrorBoundary extends React.Component<any, { hasError: boolean; error?: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error("Clearance component error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <h2 className="text-lg font-bold text-red-600">Something went wrong rendering Clearance</h2>
          <pre className="mt-3 text-sm text-gray-700">{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
