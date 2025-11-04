// src/components/HR/ClearanceDocuments.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";
import toast, { Toaster } from "react-hot-toast";
import Swal from 'sweetalert2';

interface ClearanceDocument {
  id?: number;
  user_id: number;
  employment_status: string;
  employment_type: string;
  date_hired: string | null;
  degree_earned: string;
  philhealth_no: string;
  pagibig_no: string;
  tin_no: string;
  sss_no: string;
  tor_status: string;
  diploma_status: string;
  nbi_clearance: string;
  certification_employment: string;
  medical_certificate: string;
  birth_certificate: string;
  marital_status: string;
  marriage_certificate: string;
  letter_of_intent: string;
  permit_to_teach: string;
  updated_pis: string;
  appointment: string;
  general_remarks: string;
  contract_status: string;
  date_entered_contract: string | null;
  contract_remarks: string;
  date_notarized: string | null;
  seminar_certificates: string;
  certificates_years: string;
  narrative_report: string;
  personal_memo: string;
  memo_date: string | null;
  memo_subject: string;
  memo_date_responded: string | null;
  acknowledgement_form_march14: string;
  lackings: string;
}

export const ClearanceDocuments = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const [form, setForm] = useState<ClearanceDocument>({
    user_id: 0,
    employment_status: "Active",
    employment_type: "Full Time",
    date_hired: "",
    degree_earned: "",
    philhealth_no: "",
    pagibig_no: "",
    tin_no: "",
    sss_no: "",
    tor_status: "None",
    diploma_status: "None",
    nbi_clearance: "NO SUBMISSION",
    certification_employment: "NO SUBMISSION",
    medical_certificate: "NO SUBMISSION",
    birth_certificate: "NO SUBMISSION",
    marital_status: "Single",
    marriage_certificate: "N/A",
    letter_of_intent: "NONE",
    permit_to_teach: "N/A",
    updated_pis: "NO",
    appointment: "NONE",
    general_remarks: "",
    contract_status: "NOT UPDATED",
    date_entered_contract: "",
    contract_remarks: "",
    date_notarized: "",
    seminar_certificates: "NO",
    certificates_years: "",
    narrative_report: "NONE",
    personal_memo: "NONE",
    memo_date: "",
    memo_subject: "",
    memo_date_responded: "",
    acknowledgement_form_march14: "NO",
    lackings: ""
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const formatDateForInput = (date: string | null | undefined): string => {
    if (!date) return '';
    // If it's already in YYYY-MM-DD format, return as is
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // If it's a full ISO datetime string, extract just the date part
    if (typeof date === 'string' && date.includes('T')) {
      return date.split('T')[0];
    }
    // Try to parse and format the date
    try {
      const dateObj = new Date(date);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().split('T')[0];
      }
    } catch (e) {
      console.error('Error formatting date:', e);
    }
    return '';
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, role, status, positions, profile_picture, hiredDate")
        .in("role", ["Faculty", "Staff"])
        .order("name", { ascending: true });

      if (error) {
        console.error(error);
        toast.error("Failed to fetch users");
      } else {
        const usersData = data || [];
        const ids = usersData.map((u: any) => u.id).filter(Boolean);
        
        if (ids.length > 0) {
          const { data: docsData } = await supabase
            .from('clearance_documents')
            .select('*')
            .in('user_id', ids);

          const docsMap: Record<string, any> = {};
          (docsData || []).forEach((doc: any) => {
            docsMap[doc.user_id] = doc;
          });
          
          setUsers(usersData.map((u: any) => ({ 
            ...u, 
            clearance_doc: docsMap[u.id] || null 
          })));
        } else {
          setUsers(usersData);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching users");
    }
    setLoading(false);
  };

  const getCompletionPercentage = (doc: any) => {
    if (!doc) return 0;
    
    // Define all required fields for completion
    const requiredFields = [
      doc.philhealth_no,
      doc.pagibig_no,
      doc.tin_no,
      doc.sss_no,
      doc.degree_earned,
      doc.tor_status !== 'None' ? doc.tor_status : null,
      doc.diploma_status !== 'None' ? doc.diploma_status : null,
      doc.nbi_clearance !== 'NO SUBMISSION' ? doc.nbi_clearance : null,
      doc.certification_employment !== 'NO SUBMISSION' ? doc.certification_employment : null,
      doc.medical_certificate !== 'NO SUBMISSION' ? doc.medical_certificate : null,
      doc.birth_certificate !== 'NO SUBMISSION' ? doc.birth_certificate : null,
      doc.updated_pis !== 'NO' ? doc.updated_pis : null,
      doc.seminar_certificates !== 'NO' ? doc.seminar_certificates : null,
      doc.acknowledgement_form_march14 !== 'NO' ? doc.acknowledgement_form_march14 : null,
      doc.contract_status !== 'NOT UPDATED' ? doc.contract_status : null,
      doc.personal_memo !== 'NONE' ? doc.personal_memo : null,
      doc.narrative_report !== 'NONE' ? doc.narrative_report : null,
      doc.appointment !== 'NONE' ? doc.appointment : null,
      doc.letter_of_intent !== 'NONE' ? doc.letter_of_intent : null
    ];

    // Count completed fields (non-empty, not default "empty" values)
    const completed = requiredFields.filter(field => {
      if (!field) return false;
      if (typeof field === 'string') {
        const trimmed = field.trim();
        return trimmed !== '' && 
               trimmed !== 'NO SUBMISSION' && 
               trimmed !== 'NONE' && 
               trimmed !== 'N/A' && 
               trimmed !== 'NOT UPDATED' &&
               trimmed !== 'NO';
      }
      return true;
    }).length;

    return Math.round((completed / requiredFields.length) * 100);
  };

  const openEditModal = (user: any) => {
    setSelectedUser(user);
    const doc = user.clearance_doc;
    
    console.log('Opening edit modal for user:', user);
    console.log('Clearance doc data:', doc);
    console.log('NBI Clearance value:', doc?.nbi_clearance);
    console.log('Cert Employment value:', doc?.certification_employment);
    console.log('Medical Cert value:', doc?.medical_certificate);
    console.log('Birth Cert value:', doc?.birth_certificate);
    
    setForm({
      user_id: user.id,
      employment_status: doc?.employment_status || user.status || "Active",
      employment_type: doc?.employment_type || user.positions || "Full Time",
      date_hired: formatDateForInput(user.hiredDate || doc?.date_hired) || "",
      degree_earned: doc?.degree_earned || "",
      philhealth_no: doc?.philhealth_no || "",
      pagibig_no: doc?.pagibig_no || "",
      tin_no: doc?.tin_no || "",
      sss_no: doc?.sss_no || "",
      tor_status: doc?.tor_status || "None",
      diploma_status: doc?.diploma_status || "None",
      nbi_clearance: doc?.nbi_clearance || "NO SUBMISSION",
      certification_employment: doc?.certification_employment || "NO SUBMISSION",
      medical_certificate: doc?.medical_certificate || "NO SUBMISSION",
      birth_certificate: doc?.birth_certificate || "NO SUBMISSION",
      marital_status: doc?.marital_status || "Single",
      marriage_certificate: doc?.marriage_certificate || "N/A",
      letter_of_intent: doc?.letter_of_intent || "NONE",
      permit_to_teach: doc?.permit_to_teach || "N/A",
      updated_pis: doc?.updated_pis || "NO",
      appointment: doc?.appointment || "NONE",
      general_remarks: doc?.general_remarks || "",
      contract_status: doc?.contract_status || "NOT UPDATED",
      date_entered_contract: formatDateForInput(doc?.date_entered_contract) || "",
      contract_remarks: doc?.contract_remarks || "",
      date_notarized: formatDateForInput(doc?.date_notarized) || "",
      seminar_certificates: doc?.seminar_certificates || "NO",
      certificates_years: doc?.certificates_years || "",
      narrative_report: doc?.narrative_report || "NONE",
      personal_memo: doc?.personal_memo || "NONE",
      memo_date: formatDateForInput(doc?.memo_date) || "",
      memo_subject: doc?.memo_subject || "",
      memo_date_responded: formatDateForInput(doc?.memo_date_responded) || "",
      acknowledgement_form_march14: doc?.acknowledgement_form_march14 || "NO",
      lackings: doc?.lackings || ""
    });
    
    setModalOpen(true);
  };

  const openViewModal = (user: any) => {
    console.log('Opening view modal for user:', user);
    console.log('Clearance doc:', user.clearance_doc);
    if (user.clearance_doc) {
      console.log('=== IMAGE FIELDS IN DATABASE ===');
      console.log('NBI Clearance:', user.clearance_doc.nbi_clearance);
      console.log('Cert Employment:', user.clearance_doc.certification_employment);
      console.log('Medical Cert:', user.clearance_doc.medical_certificate);
      console.log('Birth Cert:', user.clearance_doc.birth_certificate);
      console.log('================================');
    }
    setSelectedUser(user);
    setViewModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedUser(null);
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setSelectedUser(null);
  };

  const saveDocument = async () => {
    if (!selectedUser) return;
    setSaving(true);
    
    try {
      const existingDoc = selectedUser.clearance_doc;
      
      // Prepare form data with null for empty dates
      const formData = {
        ...form,
        date_hired: form.date_hired || null,
        date_entered_contract: form.date_entered_contract || null,
        date_notarized: form.date_notarized || null,
        memo_date: form.memo_date || null,
        memo_date_responded: form.memo_date_responded || null,
      };
      
      console.log('Saving document with data:', formData);
      console.log('NBI Clearance being saved:', formData.nbi_clearance);
      console.log('Cert Employment being saved:', formData.certification_employment);
      console.log('Medical Cert being saved:', formData.medical_certificate);
      console.log('Birth Cert being saved:', formData.birth_certificate);
      
      if (existingDoc?.id) {
        console.log('Updating existing document with ID:', existingDoc.id);
        const { data, error } = await supabase
          .from('clearance_documents')
          .update(formData)
          .eq('id', existingDoc.id)
          .select();
          
        if (error) throw error;
        console.log('Update successful, returned data:', data);
      } else {
        console.log('Inserting new document');
        const { data, error } = await supabase
          .from('clearance_documents')
          .insert(formData)
          .select();
          
        if (error) throw error;
        console.log('Insert successful, returned data:', data);
      }
      
      await Swal.fire({ 
        icon: 'success', 
        title: 'Saved', 
        text: 'Document record saved', 
        timer: 1500, 
        showConfirmButton: false 
      });
      
      closeModal();
      await fetchUsers();
    } catch (ex: any) {
      console.error('Save error:', ex);
      await Swal.fire({ icon: 'error', title: 'Save failed', text: ex.message });
    }
    setSaving(false);
  };

  const handleChange = (field: keyof ClearanceDocument, value: any) => {
    console.log(`Updating field ${field} with value:`, value);
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      console.log('Updated form state:', updated);
      return updated;
    });
  };

  const handleFileUpload = async (field: keyof ClearanceDocument, file: File) => {
    try {
      console.log('Starting upload for field:', field);
      console.log('File:', file.name, 'Size:', file.size);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedUser?.id}_${field}_${Date.now()}.${fileExt}`;
      const filePath = `clearance_documents/${fileName}`;
      
      console.log('Uploading to path:', filePath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
      
      console.log('Upload successful:', uploadData);

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      console.log('Public URL:', publicUrl);
      
      handleChange(field, publicUrl);
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image: ' + error.message);
    }
  };

  const resetAllFields = () => {
    if (!selectedUser) return;
    
    Swal.fire({
      title: 'Reset All Fields?',
      text: 'This will clear all filled fields and reset them to default values. This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Reset All',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        setForm({
          user_id: selectedUser.id,
          employment_status: selectedUser.status || "Active",
          employment_type: selectedUser.positions || "Full Time",
          date_hired: formatDateForInput(selectedUser.hiredDate) || "",
          degree_earned: "",
          philhealth_no: "",
          pagibig_no: "",
          tin_no: "",
          sss_no: "",
          tor_status: "None",
          diploma_status: "None",
          nbi_clearance: "NO SUBMISSION",
          certification_employment: "NO SUBMISSION",
          medical_certificate: "NO SUBMISSION",
          birth_certificate: "NO SUBMISSION",
          marital_status: "Single",
          marriage_certificate: "N/A",
          letter_of_intent: "NONE",
          permit_to_teach: "N/A",
          updated_pis: "NO",
          appointment: "NONE",
          general_remarks: "",
          contract_status: "NOT UPDATED",
          date_entered_contract: "",
          contract_remarks: "",
          date_notarized: "",
          seminar_certificates: "NO",
          certificates_years: "",
          narrative_report: "NONE",
          personal_memo: "NONE",
          memo_date: "",
          memo_subject: "",
          memo_date_responded: "",
          acknowledgement_form_march14: "NO",
          lackings: ""
        });
        toast.success('All fields have been reset to default values');
      }
    });
  };

  const exportCSV = (user: any) => {
    const doc = user.clearance_doc || {};
    const rows = [
      ['Field', 'Value'],
      ['Name', user.name],
      ['Employment Status', doc.employment_status || ''],
      ['Employment Type', doc.employment_type || ''],
      ['Date Hired', doc.date_hired || ''],
      ['Degree Earned', doc.degree_earned || ''],
      ['Philhealth No.', doc.philhealth_no || ''],
      ['Pag-Ibig No.', doc.pagibig_no || ''],
      ['TIN No.', doc.tin_no || ''],
      ['SSS No.', doc.sss_no || ''],
      ['TOR', doc.tor_status || ''],
      ['Diploma', doc.diploma_status || ''],
      ['NBI Clearance', doc.nbi_clearance || ''],
      ['Cert of Employment', doc.certification_employment || ''],
      ['Medical Cert', doc.medical_certificate || ''],
      ['Birth Cert', doc.birth_certificate || ''],
      ['Marital Status', doc.marital_status || ''],
      ['Marriage Cert', doc.marriage_certificate || ''],
      ['Letter of Intent', doc.letter_of_intent || ''],
      ['Permit to Teach', doc.permit_to_teach || ''],
      ['Updated PIS', doc.updated_pis || ''],
      ['Appointment', doc.appointment || ''],
      ['Contract Status', doc.contract_status || ''],
      ['Date Entered Contract', doc.date_entered_contract || ''],
      ['Date Notarized', doc.date_notarized || ''],
      ['Seminar Certificates', doc.seminar_certificates || ''],
      ['Certificates Years', doc.certificates_years || ''],
      ['Narrative Report', doc.narrative_report || ''],
      ['Personal Memo', doc.personal_memo || ''],
      ['Acknowledgement Form', doc.acknowledgement_form_march14 || ''],
      ['Lackings', doc.lackings || '']
    ];
    
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(user.name || 'clearance').replace(/\s+/g, '_')}_documents.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const filtered = users.filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (u.name || "").toLowerCase().includes(s) || (u.email || "").toLowerCase().includes(s);
  });

  const stats = {
  total: users.length,
  complete: users.filter(u => getCompletionPercentage(u.clearance_doc) === 100).length,
  incomplete: users.filter(u => {
    const percentage = getCompletionPercentage(u.clearance_doc);
    return percentage > 0 && percentage < 100;
  }).length,
  noRecords: users.filter(u => {
    const percentage = getCompletionPercentage(u.clearance_doc);
    return !u.clearance_doc || percentage === 0;
  }).length
};

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
      <Toaster position="top-right" />
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Clearance Documents</h1>
              <p className="text-gray-600">Manage comprehensive document requirements</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-90">Total Records</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-90">Complete</p>
                  <p className="text-2xl font-bold">{stats.complete}</p>
                </div>
                <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-4 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-90">Incomplete</p>
                  <p className="text-2xl font-bold">{stats.incomplete}</p>
                </div>
                <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-90">No Records</p>
                  <p className="text-2xl font-bold">{stats.noRecords}</p>
                </div>
                <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email"
              className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            />
          </div>
        </section>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-red-600 to-red-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Completion</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-gray-600 font-medium">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                        </div>
                        <p className="text-gray-600 font-medium">No users found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => {
                    const completion = getCompletionPercentage(u.clearance_doc);
                    return (
                      <tr key={u.id} className="hover:bg-red-50 transition-colors duration-150">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {u.profile_picture ? (
                              <img 
                                src={u.profile_picture} 
                                alt={u.name || 'User'} 
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-red-200"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center text-white font-semibold">
                                {u.name?.charAt(0)?.toUpperCase() || 'U'}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{u.name}</p>
                              <p className="text-xs text-gray-500">{u.email || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            u.role === 'Faculty' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            u.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {u.status || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all ${
                                  completion === 100 ? 'bg-green-500' : 
                                  completion >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${completion}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-600">{completion}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => openEditModal(u)} 
                              disabled={u.status !== 'Active'}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors shadow-sm ${
                                u.status !== 'Active' 
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button 
                              onClick={() => openViewModal(u)} 
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                              </svg>
                              View
                            </button>
                            <button 
                              onClick={() => exportCSV(u)} 
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Export
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Modal */}
        {modalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
            <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedUser.profile_picture ? (
                      <img src={selectedUser.profile_picture} alt={selectedUser.name} className="w-10 h-10 rounded-lg object-cover ring-2 ring-white/30" />
                    ) : (
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-white font-bold">
                        {selectedUser.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-bold text-white">Edit Documents</h3>
                      <p className="text-red-100 text-xs">{selectedUser.name}</p>
                    </div>
                  </div>
                  <button onClick={closeModal} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Completion Indicator */}
              <div className="px-6 py-3 bg-white border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Completion:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            getCompletionPercentage(form) === 100 ? 'bg-green-500' : 
                            getCompletionPercentage(form) >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${getCompletionPercentage(form)}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-600">{getCompletionPercentage(form)}%</span>
                    </div>
                  </div>
                  {getCompletionPercentage(form) === 100 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Complete!
                    </span>
                  )}
                </div>
              </div>
              
              <div className="px-6 py-4 overflow-y-auto flex-1">
                <form className="space-y-4">
                  {/* Employment Info */}
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2 text-sm">Employment Information</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                        <select value={form.employment_status} onChange={(e) => handleChange('employment_status', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                        <select value={form.employment_type} onChange={(e) => handleChange('employment_type', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
                          <option value="Full Time">Full Time</option>
                          <option value="Part Time">Part Time</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Date Hired</label>
                        <input type="date" value={form.date_hired || ''} onChange={(e) => handleChange('date_hired', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Degree Earned/Major</label>
                        <input type="text" value={form.degree_earned} onChange={(e) => handleChange('degree_earned', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Government IDs */}
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2 text-sm">Government IDs</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Philhealth No.</label>
                        <input type="text" value={form.philhealth_no} onChange={(e) => handleChange('philhealth_no', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Pag-Ibig No.</label>
                        <input type="text" value={form.pagibig_no} onChange={(e) => handleChange('pagibig_no', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">TIN No.</label>
                        <input type="text" value={form.tin_no} onChange={(e) => handleChange('tin_no', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">SSS No.</label>
                        <input type="text" value={form.sss_no} onChange={(e) => handleChange('sss_no', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Credentials */}
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-purple-900 mb-2 text-sm">Credentials</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">TOR</label>
                        <select value={form.tor_status} onChange={(e) => handleChange('tor_status', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                          <option value="None">None</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Diploma</label>
                        <select value={form.diploma_status} onChange={(e) => handleChange('diploma_status', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                          <option value="None">None</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SPC Requirements */}
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-yellow-900 mb-2 text-sm">SPC Requirements</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">NBI Clearance</label>
                        <div className="space-y-2">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload('nbi_clearance', e.target.files[0])}
                            className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer border border-gray-300 rounded-lg"
                          />
                          {form.nbi_clearance && form.nbi_clearance.startsWith('http') && (
                            <div className="relative group">
                              <img src={form.nbi_clearance} alt="NBI" className="w-full h-32 object-cover rounded-lg border-2 border-blue-200" />
                              <button
                                type="button"
                                onClick={() => handleChange('nbi_clearance', '')}
                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Cert of Employment</label>
                        <div className="space-y-2">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload('certification_employment', e.target.files[0])}
                            className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer border border-gray-300 rounded-lg"
                          />
                          {form.certification_employment && form.certification_employment.startsWith('http') && (
                            <div className="relative group">
                              <img src={form.certification_employment} alt="Cert" className="w-full h-32 object-cover rounded-lg border-2 border-blue-200" />
                              <button
                                type="button"
                                onClick={() => handleChange('certification_employment', '')}
                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Medical Certificate</label>
                        <div className="space-y-2">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload('medical_certificate', e.target.files[0])}
                            className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer border border-gray-300 rounded-lg"
                          />
                          {form.medical_certificate && form.medical_certificate.startsWith('http') && (
                            <div className="relative group">
                              <img src={form.medical_certificate} alt="Medical" className="w-full h-32 object-cover rounded-lg border-2 border-blue-200" />
                              <button
                                type="button"
                                onClick={() => handleChange('medical_certificate', '')}
                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Birth Certificate</label>
                        <div className="space-y-2">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload('birth_certificate', e.target.files[0])}
                            className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer border border-gray-300 rounded-lg"
                          />
                          {form.birth_certificate && form.birth_certificate.startsWith('http') && (
                            <div className="relative group">
                              <img src={form.birth_certificate} alt="Birth Cert" className="w-full h-32 object-cover rounded-lg border-2 border-blue-200" />
                              <button
                                type="button"
                                onClick={() => handleChange('birth_certificate', '')}
                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Marital Status</label>
                        <select value={form.marital_status} onChange={(e) => handleChange('marital_status', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
                          <option value="Single">Single</option>
                          <option value="Married">Married</option>
                          <option value="Widowed">Widowed</option>
                          <option value="Separated">Separated</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Marriage Certificate</label>
                        <select value={form.marriage_certificate} onChange={(e) => handleChange('marriage_certificate', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
                          <option value="YES">YES</option>
                          <option value="NO">NO</option>
                          <option value="N/A">N/A</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Letter of Intent</label>
                        <input type="text" value={form.letter_of_intent} onChange={(e) => handleChange('letter_of_intent', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Permit to Teach</label>
                        <input type="text" value={form.permit_to_teach} onChange={(e) => handleChange('permit_to_teach', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Updated PIS</label>
                        <select value={form.updated_pis} onChange={(e) => handleChange('updated_pis', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
                          <option value="YES">YES</option>
                          <option value="NO">NO</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Appointment</label>
                        <input type="text" value={form.appointment} onChange={(e) => handleChange('appointment', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
                      <textarea value={form.general_remarks} onChange={(e) => handleChange('general_remarks', e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                    </div>
                  </div>

                  {/* Contract */}
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-orange-900 mb-2 text-sm">Contract of Service</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                        <select value={form.contract_status} onChange={(e) => handleChange('contract_status', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
                          <option value="UPDATED">UPDATED</option>
                          <option value="NOT UPDATED">NOT UPDATED</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Date Entered</label>
                        <input type="date" value={form.date_entered_contract || ''} onChange={(e) => handleChange('date_entered_contract', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Date Notarized</label>
                        <input type="date" value={form.date_notarized || ''} onChange={(e) => handleChange('date_notarized', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
                        <input type="text" value={form.contract_remarks} onChange={(e) => handleChange('contract_remarks', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Seminar */}
                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-indigo-900 mb-2 text-sm">Seminar/Training</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Certificates</label>
                        <select value={form.seminar_certificates} onChange={(e) => handleChange('seminar_certificates', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
                          <option value="YES">YES</option>
                          <option value="NO">NO</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Years (e.g., 2020-2025)</label>
                        <input type="text" value={form.certificates_years} onChange={(e) => handleChange('certificates_years', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Narrative Report</label>
                        <input type="text" value={form.narrative_report} onChange={(e) => handleChange('narrative_report', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Memo */}
                  <div className="bg-pink-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-pink-900 mb-2 text-sm">Memorandum</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Personal Memo</label>
                        <input type="text" value={form.personal_memo} onChange={(e) => handleChange('personal_memo', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                        <input type="date" value={form.memo_date || ''} onChange={(e) => handleChange('memo_date', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                        <input type="text" value={form.memo_subject} onChange={(e) => handleChange('memo_subject', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Date Responded</label>
                        <input type="date" value={form.memo_date_responded || ''} onChange={(e) => handleChange('memo_date_responded', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Acknowledgement */}
                  <div className="bg-teal-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-teal-900 mb-2 text-sm">Acknowledgement</h4>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">March 14, 2025 Assembly</label>
                      <select value={form.acknowledgement_form_march14} onChange={(e) => handleChange('acknowledgement_form_march14', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </select>
                    </div>
                  </div>

                  {/* Lackings */}
                  <div className="bg-red-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-red-900 mb-2 text-sm">Lackings</h4>
                    <textarea value={form.lackings} onChange={(e) => handleChange('lackings', e.target.value)} rows={3} placeholder="List missing documents..." className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                  </div>
                </form>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t flex-shrink-0">
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <button 
                    type="button" 
                    onClick={closeModal} 
                    className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-100 transition-colors shadow-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={resetAllFields} 
                    className="px-5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors shadow-sm inline-flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset All
                  </button>
                  <button 
                    type="button" 
                    onClick={saveDocument} 
                    disabled={saving} 
                    className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {viewModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeViewModal} />
            <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedUser.profile_picture ? (
                      <img src={selectedUser.profile_picture} alt={selectedUser.name} className="w-10 h-10 rounded-lg object-cover ring-2 ring-white/30" />
                    ) : (
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-white font-bold">
                        {selectedUser.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-bold text-white">View Documents</h3>
                      <p className="text-red-100 text-xs">{selectedUser.name}</p>
                    </div>
                  </div>
                  <button onClick={closeViewModal} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="px-6 py-4 overflow-y-auto flex-1">
                {selectedUser.clearance_doc ? (
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2 text-sm">Employment</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="font-medium">Status:</span> {selectedUser.clearance_doc.employment_status || '-'}</div>
                        <div><span className="font-medium">Type:</span> {selectedUser.clearance_doc.employment_type || '-'}</div>
                        <div><span className="font-medium">Date Hired:</span> {selectedUser.clearance_doc.date_hired || '-'}</div>
                        <div><span className="font-medium">Degree:</span> {selectedUser.clearance_doc.degree_earned || '-'}</div>
                      </div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-2 text-sm">Government IDs</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="font-medium">Philhealth:</span> {selectedUser.clearance_doc.philhealth_no || '-'}</div>
                        <div><span className="font-medium">Pag-Ibig:</span> {selectedUser.clearance_doc.pagibig_no || '-'}</div>
                        <div><span className="font-medium">TIN:</span> {selectedUser.clearance_doc.tin_no || '-'}</div>
                        <div><span className="font-medium">SSS:</span> {selectedUser.clearance_doc.sss_no || '-'}</div>
                      </div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <h4 className="font-semibold text-purple-900 mb-2 text-sm">Credentials</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="font-medium">TOR:</span> {selectedUser.clearance_doc.tor_status || '-'}</div>
                        <div><span className="font-medium">Diploma:</span> {selectedUser.clearance_doc.diploma_status || '-'}</div>
                      </div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-yellow-900 mb-3 text-base flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        SPC Requirements
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* NBI Clearance */}
                        <div className="bg-white p-3 rounded-lg border border-yellow-200">
                          <p className="font-medium text-gray-700 mb-2 text-sm">NBI Clearance</p>
                          {selectedUser.clearance_doc?.nbi_clearance && String(selectedUser.clearance_doc.nbi_clearance).startsWith('http') ? (
                            <a href={selectedUser.clearance_doc.nbi_clearance} target="_blank" rel="noopener noreferrer" className="block">
                              <img 
                                src={selectedUser.clearance_doc.nbi_clearance} 
                                alt="NBI Clearance" 
                                className="w-full h-40 object-cover rounded border-2 border-yellow-300 hover:border-yellow-500 transition-colors cursor-pointer"
                                onError={(e) => {
                                  console.error('Image load error:', selectedUser.clearance_doc.nbi_clearance);
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              <p className="text-xs text-blue-600 mt-1 hover:underline">Click to view full size</p>
                            </a>
                          ) : (
                            <p className="text-sm text-gray-500">{selectedUser.clearance_doc?.nbi_clearance || 'Not provided'}</p>
                          )}
                        </div>
                        
                        {/* Certificate of Employment */}
                        <div className="bg-white p-3 rounded-lg border border-yellow-200">
                          <p className="font-medium text-gray-700 mb-2 text-sm">Certificate of Employment</p>
                          {selectedUser.clearance_doc?.certification_employment && String(selectedUser.clearance_doc.certification_employment).startsWith('http') ? (
                            <a href={selectedUser.clearance_doc.certification_employment} target="_blank" rel="noopener noreferrer" className="block">
                              <img 
                                src={selectedUser.clearance_doc.certification_employment} 
                                alt="Cert of Employment" 
                                className="w-full h-40 object-cover rounded border-2 border-yellow-300 hover:border-yellow-500 transition-colors cursor-pointer"
                                onError={(e) => {
                                  console.error('Image load error:', selectedUser.clearance_doc.certification_employment);
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              <p className="text-xs text-blue-600 mt-1 hover:underline">Click to view full size</p>
                            </a>
                          ) : (
                            <p className="text-sm text-gray-500">{selectedUser.clearance_doc?.certification_employment || 'Not provided'}</p>
                          )}
                        </div>
                        
                        {/* Medical Certificate */}
                        <div className="bg-white p-3 rounded-lg border border-yellow-200">
                          <p className="font-medium text-gray-700 mb-2 text-sm">Medical Certificate</p>
                          {selectedUser.clearance_doc?.medical_certificate && String(selectedUser.clearance_doc.medical_certificate).startsWith('http') ? (
                            <a href={selectedUser.clearance_doc.medical_certificate} target="_blank" rel="noopener noreferrer" className="block">
                              <img 
                                src={selectedUser.clearance_doc.medical_certificate} 
                                alt="Medical Certificate" 
                                className="w-full h-40 object-cover rounded border-2 border-yellow-300 hover:border-yellow-500 transition-colors cursor-pointer"
                                onError={(e) => {
                                  console.error('Image load error:', selectedUser.clearance_doc.medical_certificate);
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              <p className="text-xs text-blue-600 mt-1 hover:underline">Click to view full size</p>
                            </a>
                          ) : (
                            <p className="text-sm text-gray-500">{selectedUser.clearance_doc?.medical_certificate || 'Not provided'}</p>
                          )}
                        </div>
                        
                        {/* Birth Certificate */}
                        <div className="bg-white p-3 rounded-lg border border-yellow-200">
                          <p className="font-medium text-gray-700 mb-2 text-sm">Birth Certificate</p>
                          {selectedUser.clearance_doc?.birth_certificate && String(selectedUser.clearance_doc.birth_certificate).startsWith('http') ? (
                            <a href={selectedUser.clearance_doc.birth_certificate} target="_blank" rel="noopener noreferrer" className="block">
                              <img 
                                src={selectedUser.clearance_doc.birth_certificate} 
                                alt="Birth Certificate" 
                                className="w-full h-40 object-cover rounded border-2 border-yellow-300 hover:border-yellow-500 transition-colors cursor-pointer"
                                onError={(e) => {
                                  console.error('Image load error:', selectedUser.clearance_doc.birth_certificate);
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              <p className="text-xs text-blue-600 mt-1 hover:underline">Click to view full size</p>
                            </a>
                          ) : (
                            <p className="text-sm text-gray-500">{selectedUser.clearance_doc?.birth_certificate || 'Not provided'}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Other Requirements */}
                      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-yellow-200">
                        <div className="text-sm"><span className="font-medium text-gray-700">Marital Status:</span> <span className="text-gray-600">{selectedUser.clearance_doc.marital_status || '-'}</span></div>
                        <div className="text-sm"><span className="font-medium text-gray-700">Marriage Cert:</span> <span className="text-gray-600">{selectedUser.clearance_doc.marriage_certificate || '-'}</span></div>
                        <div className="text-sm"><span className="font-medium text-gray-700">Letter of Intent:</span> <span className="text-gray-600">{selectedUser.clearance_doc.letter_of_intent || '-'}</span></div>
                        <div className="text-sm"><span className="font-medium text-gray-700">Permit to Teach:</span> <span className="text-gray-600">{selectedUser.clearance_doc.permit_to_teach || '-'}</span></div>
                        <div className="text-sm"><span className="font-medium text-gray-700">Updated PIS:</span> <span className="text-gray-600">{selectedUser.clearance_doc.updated_pis || '-'}</span></div>
                        <div className="text-sm"><span className="font-medium text-gray-700">Appointment:</span> <span className="text-gray-600">{selectedUser.clearance_doc.appointment || '-'}</span></div>
                      </div>
                      
                      {selectedUser.clearance_doc.general_remarks && (
                        <div className="mt-4 p-3 bg-white rounded border border-yellow-200">
                          <p className="font-medium text-gray-700 text-sm mb-1">Remarks:</p>
                          <p className="text-sm text-gray-600">{selectedUser.clearance_doc.general_remarks}</p>
                        </div>
                      )}
                    </div>
                    {selectedUser.clearance_doc.lackings && (
                      <div className="bg-red-50 p-3 rounded-lg">
                        <h4 className="font-semibold text-red-900 mb-2 text-sm">Lackings</h4>
                        <p className="text-sm whitespace-pre-wrap">{selectedUser.clearance_doc.lackings}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">No document records found</div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};