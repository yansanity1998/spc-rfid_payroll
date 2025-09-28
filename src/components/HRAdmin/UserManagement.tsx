import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";
import toast from "react-hot-toast";

export const UserManagement = () => {
  const [create, showCreate] = useState(false);
  const [edit, showEdit] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingRfid, setEditingRfid] = useState(false);
  const [newRfid, setNewRfid] = useState("");
  const [sortBy, setSortBy] = useState("All");
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedUserInfo, setSelectedUserInfo] = useState<any>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showInfoModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showInfoModal]);

  // Color coding system for employee types
  const getEmployeeTypeColor = (role: string) => {
    switch (role) {
      case "Administrator":
        return "from-purple-500 to-purple-600 text-purple-800 bg-purple-100";
      case "HR Personnel":
        return "from-blue-500 to-blue-600 text-blue-800 bg-blue-100";
      case "Accounting":
        return "from-green-500 to-green-600 text-green-800 bg-green-100";
      case "Faculty":
        return "from-red-500 to-red-600 text-red-800 bg-red-100";
      case "Staff":
        return "from-orange-500 to-orange-600 text-orange-800 bg-orange-100";
      case "SA":
        return "from-yellow-500 to-yellow-600 text-yellow-800 bg-yellow-100";
      case "Guard":
        return "from-teal-500 to-teal-600 text-teal-800 bg-teal-100";
      default:
        return "from-gray-500 to-gray-600 text-gray-800 bg-gray-100";
    }
  };

  const [scanningRfid, setScanningRfid] = useState(false);
  const [scannedCard, setScannedCard] = useState("");

  const rows = 10;

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "Faculty",
    semester: "",
    schoolYear: "",
    hiredDate: "",
    department: "",
    age: "",
    gender: "",
    address: "",
    contact_no: "",
    positions: "",
    profile_picture: null as File | null,
  });

  const [editUser, setEditUser] = useState<any | null>(null);



  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";

    const { error } = await supabase
      .from("users")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      console.error(error.message);
      toast.error("Failed to update user status");
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
    
    // Debug: Check form state before showing RFID scanner
    console.log('=== FORM SUBMISSION DEBUG ===');
    console.log('Current newUser state at form submission:', newUser);
    console.log('Form validation:');
    console.log('- Name filled:', !!newUser.name, '"' + newUser.name + '"');
    console.log('- Email filled:', !!newUser.email, '"' + newUser.email + '"');
    console.log('- Age filled:', !!newUser.age, '"' + newUser.age + '"');
    console.log('- Gender filled:', !!newUser.gender, '"' + newUser.gender + '"');
    console.log('- Address filled:', !!newUser.address, '"' + newUser.address + '"');
    console.log('- Contact filled:', !!newUser.contact_no, '"' + newUser.contact_no + '"');
    console.log('- Position filled:', !!newUser.positions, '"' + newUser.positions + '"');
    console.log('- Profile picture:', newUser.profile_picture ? 'File selected: ' + newUser.profile_picture.name : 'No file');
    
    // Show RFID scanner modal
    setScanningRfid(true);
  };

  const handleUpdateRfid = async () => {
    if (!editUser || !newRfid) return;

    const { error } = await supabase
      .from("users")
      .update({ rfid_id: Number(newRfid) }) // update separate column
      .eq("id", editUser.id); // keep primary key intact

    if (error) {
      console.log(error.message);
      toast.error("RFID is already in use.");
    } else {
      toast.success("RFID updated successfully");
      setEditingRfid(false);
      setNewRfid("");
      fetchUsers();
    }
  };


  const handleConfirmCreate = async () => {
    if (!scannedCard) {
      toast.error("No RFID card scanned!");
      return;
    }

    // Add a longer delay to ensure all form state is properly captured
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log("=== FORM STATE DEBUG ===");
    console.log("Full newUser state:", newUser);
    console.log("Field check:");
    console.log("- name:", `"${newUser.name}"`, "length:", newUser.name.length);
    console.log("- email:", `"${newUser.email}"`, "length:", newUser.email.length);
    console.log("- role:", `"${newUser.role}"`);
    console.log("- department:", `"${newUser.department}"`);
    console.log("- hiredDate:", `"${newUser.hiredDate}"`);
    console.log("- age:", `"${newUser.age}"`);
    console.log("- gender:", `"${newUser.gender}"`);
    console.log("- address:", `"${newUser.address}"`);
    console.log("- contact_no:", `"${newUser.contact_no}"`);
    console.log("- positions:", `"${newUser.positions}"`);
    console.log("- profile_picture:", newUser.profile_picture ? 'File selected' : 'No file');

    // Check if required fields are filled
    if (!newUser.name || !newUser.email) {
      toast.error("Please fill in all required fields (Name and Email) before scanning RFID!");
      setScanningRfid(false);
      setScannedCard("");
      return;
    }


    // Prepare payload with all fields including new ones
    const payload = {
      rfid_id: Number(scannedCard),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      semester: newUser.semester || null,
      schoolYear: newUser.schoolYear || null,
      hiredDate: newUser.hiredDate || null,
      department:
        newUser.role === "Faculty" || newUser.role === "SA"
          ? newUser.department
          : null,
      age: newUser.age ? parseInt(newUser.age) : null,
      gender: newUser.gender || null,
      address: newUser.address || null,
      contact_no: newUser.contact_no || null,
      positions: (newUser.role === "Faculty" || newUser.role === "SA" || newUser.role === "Staff") ? newUser.positions : null,
      status: "Active",
      password: "ChangePassword",
    };

    console.log("=== PAYLOAD DEBUG ===");
    console.log("Final payload:", payload);
    console.log("Payload field check:");
    console.log("- name:", payload.name, typeof payload.name);
    console.log("- email:", payload.email, typeof payload.email);
    console.log("- role:", payload.role, typeof payload.role);
    console.log("- department:", payload.department, typeof payload.department);
    console.log("- age:", payload.age, typeof payload.age);
    console.log("- gender:", payload.gender, typeof payload.gender);
    console.log("- address:", payload.address, typeof payload.address);
    console.log("- contact_no:", payload.contact_no, typeof payload.contact_no);
    console.log("- positions:", payload.positions, typeof payload.positions);
    console.log("=== END DEBUG ===");

    try {
      // get the current session (logged-in admin)
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert("You must be logged in as an admin to create users.");
        return;
      }

      const response = await fetch(
        "https://squtybkgujjgrxeqmrfs.supabase.co/functions/v1/create-user",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session.access_token}`, // ✅ FIX
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      console.log('Edge Function Response:', data);

      if (!response.ok) {
        console.error('Edge Function Error:', data);
        toast.error("Error creating user: " + (data.error || "Failed to create user"));
        return;
      }

      // Try to get user ID from different possible response structures
      const userId = data.user?.id || data.id || data.user_id;
      console.log('Extracted User ID:', userId);

      // Update user with all additional fields including profile picture
      if (userId) {
        console.log('User created with ID:', userId);
        const updateData: any = {
          // Add all the new fields that Edge Function might not handle
          age: newUser.age ? parseInt(newUser.age) : null,
          gender: newUser.gender || null,
          address: newUser.address || null,
          contact_no: newUser.contact_no || null,
          positions: (newUser.role === "Faculty" || newUser.role === "SA" || newUser.role === "Staff") ? newUser.positions : null,
        };
        
        // Handle profile picture upload
        if (newUser.profile_picture) {
          try {
            const fileExt = newUser.profile_picture.name.split('.').pop();
            const fileName = `${userId}.${fileExt}`;
            const filePath = `profile-pictures/${fileName}`;
            
            console.log('Uploading profile picture:', filePath);
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('profile-pictures')
              .upload(filePath, newUser.profile_picture, {
                cacheControl: '3600',
                upsert: true
              });
              
            if (uploadError) {
              console.error('Profile picture upload error:', uploadError);
              toast.error('Failed to upload profile picture: ' + uploadError.message);
            } else {
              console.log('Profile picture uploaded successfully:', uploadData);
              
              // Get public URL
              const { data: { publicUrl } } = supabase.storage
                .from('profile-pictures')
                .getPublicUrl(filePath);
                
              updateData.profile_picture = publicUrl;
              console.log('Profile picture URL:', publicUrl);
            }
          } catch (error: any) {
            console.error('Profile picture upload error:', error);
            toast.error('Failed to upload profile picture: ' + error.message);
          }
        }
        
        console.log('Update data to be saved:', updateData);
        console.log('User ID for update:', userId);
        console.log('Update data keys:', Object.keys(updateData));
        console.log('All field values:', {
          age: updateData.age,
          gender: updateData.gender,
          address: updateData.address,
          contact_no: updateData.contact_no,
          positions: updateData.positions,
          profile_picture: updateData.profile_picture
        });
        
        // Update user record with additional fields
        if (Object.keys(updateData).length > 0) {
          console.log('=== ATTEMPTING DATABASE UPDATE ===');
          console.log('Update query details:');
          console.log('- Table: users');
          console.log('- User ID:', userId);
          console.log('- Update data:', JSON.stringify(updateData, null, 2));
          
          const { data: updateResult, error: updateError } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId)
            .select();
            
          console.log('=== DATABASE UPDATE RESULT ===');
          console.log('- Error:', updateError);
          console.log('- Result:', updateResult);
          
          if (updateError) {
            console.error('Error updating user with additional fields:', updateError);
            console.error('Error details:', {
              message: updateError.message,
              details: updateError.details,
              hint: updateError.hint,
              code: updateError.code
            });
            toast.error('User created but failed to save additional information: ' + updateError.message);
            
            // Try to verify what was actually saved
            const { data: verifyData } = await supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .single();
            
            console.log('Verification - What was actually saved:', verifyData);
          } else {
            console.log('User updated successfully:', updateResult);
            toast.success('User created with all information saved!');
            
            // Verify all fields were saved
            const savedUser = updateResult[0];
            console.log('Verification - All fields saved:', {
              age: savedUser.age,
              gender: savedUser.gender,
              address: savedUser.address,
              contact_no: savedUser.contact_no,
              positions: savedUser.positions,
              profile_picture: savedUser.profile_picture
            });
          }
        } else {
          console.log('No additional data to update');
          // Still show success since user was created
          toast.success('User created successfully!');
        }
      } else {
        console.error('No user ID returned from Edge Function');
        console.log('Trying to find user by email...');
        
        // Fallback: try to find the user by email and update
        const { data: foundUsers, error: findError } = await supabase
          .from('users')
          .select('id')
          .eq('email', newUser.email)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (findError) {
          console.error('Error finding user by email:', findError);
        } else if (foundUsers && foundUsers.length > 0) {
          const foundUserId = foundUsers[0].id;
          console.log('Found user by email with ID:', foundUserId);
          
          const updateData: any = {
            // Add all the new fields that Edge Function might not handle
            age: newUser.age ? parseInt(newUser.age) : null,
            gender: newUser.gender || null,
            address: newUser.address || null,
            contact_no: newUser.contact_no || null,
            positions: (newUser.role === "Faculty" || newUser.role === "SA" || newUser.role === "Staff") ? newUser.positions : null,
          };
          
          // Handle profile picture upload for fallback user
          if (newUser.profile_picture) {
            try {
              const fileExt = newUser.profile_picture.name.split('.').pop();
              const fileName = `${foundUserId}.${fileExt}`;
              const filePath = `profile-pictures/${fileName}`;
              
              console.log('Uploading profile picture for fallback user:', filePath);
              
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('profile-pictures')
                .upload(filePath, newUser.profile_picture, {
                  cacheControl: '3600',
                  upsert: true
                });
                
              if (uploadError) {
                console.error('Fallback profile picture upload error:', uploadError);
              } else {
                console.log('Fallback profile picture uploaded successfully:', uploadData);
                
                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                  .from('profile-pictures')
                  .getPublicUrl(filePath);
                  
                updateData.profile_picture = publicUrl;
                console.log('Fallback profile picture URL:', publicUrl);
              }
            } catch (error: any) {
              console.error('Fallback profile picture upload error:', error);
            }
          }
          
          console.log('Fallback update data:', updateData);
          
          if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
              .from('users')
              .update(updateData)
              .eq('id', foundUserId);
              
            if (updateError) {
              console.error('Error updating found user:', updateError);
              toast.error('User created but failed to save additional information: ' + updateError.message);
              
              // Try to verify what was actually saved
              const { data: verifyData } = await supabase
                .from('users')
                .select('*')
                .eq('id', foundUserId)
                .single();
              
              console.log('Fallback Verification - What was actually saved:', verifyData);
            } else {
              console.log('Found user updated successfully');
              toast.success('User created with all information saved!');
            }
          }
        } else {
          console.error('Could not find created user by email');
          toast.error('User created but could not save additional information');
        }
      }
      setScanningRfid(false);
      setScannedCard("");
      setNewUser({
        name: "",
        email: "",
        role: "Faculty",
        semester: "",
        schoolYear: "",
        hiredDate: "",
        department: "",
        age: "",
        gender: "",
        address: "",
        contact_no: "",
        positions: "",
        profile_picture: null,
      });
      fetchUsers();
    } catch (err: any) {
      console.error('User Creation Error:', err);
      toast.error("Network error: " + err.message);
      
      // Reset scanning state on error
      setScanningRfid(false);
      setScannedCard("");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;

    try {
      const updateData: any = {
        name: editUser.name,
        email: editUser.email,
        role: editUser.role,
        status: editUser.status,
        semester: editUser.semester,
        schoolYear: editUser.schoolYear,
        hiredDate: editUser.hiredDate,
        department: editUser.department,
        age: editUser.age ? parseInt(editUser.age) : null,
        gender: editUser.gender || null,
        address: editUser.address || null,
        contact_no: editUser.contact_no || null,
        positions: (editUser.role === "Faculty" || editUser.role === "SA" || editUser.role === "Staff") ? editUser.positions : null,
      };

      // Handle profile picture upload if a new one was selected
      if (editUser.newProfilePicture) {
        try {
          const fileExt = editUser.newProfilePicture.name.split('.').pop();
          const fileName = `${editUser.id}.${fileExt}`;
          const filePath = `profile-pictures/${fileName}`;
          
          console.log('Uploading new profile picture:', filePath);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('profile-pictures')
            .upload(filePath, editUser.newProfilePicture, {
              cacheControl: '3600',
              upsert: true
            });
            
          if (uploadError) {
            console.error('Profile picture upload error:', uploadError);
            toast.error('Failed to upload profile picture: ' + uploadError.message);
          } else {
            console.log('Profile picture uploaded successfully:', uploadData);
            
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('profile-pictures')
              .getPublicUrl(filePath);
              
            updateData.profile_picture = publicUrl;
            console.log('New profile picture URL:', publicUrl);
          }
        } catch (error: any) {
          console.error('Profile picture upload error:', error);
          toast.error('Failed to upload profile picture: ' + error.message);
        }
      }

      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", editUser.id);

      if (error) {
        console.error('User update error:', error);
        toast.error('Failed to update user: ' + error.message);
      } else {
        toast.success('User updated successfully!');
        showEdit(false);
        setEditUser(null);
        fetchUsers();
      }
    } catch (err: any) {
      console.error('User update error:', err);
      toast.error('Failed to update user: ' + err.message);
    }
  };

  const filteredUsers = users.filter(
    (user) => {
      const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        user.role.toLowerCase().includes(search.toLowerCase()) ||
        user.status.toLowerCase().startsWith(search.toLowerCase());
      
      const matchesSort = sortBy === "All" || user.role === sortBy;
      
      return matchesSearch && matchesSort;
    }
  );

  const indexLast = currentPage * rows;
  const indexFirst = indexLast - rows;
  const currentUsers = filteredUsers.slice(indexFirst, indexLast);

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        {/* Modern Header */}
        <section className="flex-shrink-0 space-y-4">
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">User Management</h1>
            </div>
            <p className="text-gray-600">Manage employee accounts and permissions</p>
          </div>

          {/* Modern Controls */}
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 shadow-sm"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 cursor-pointer shadow-sm"
                >
                  <option value="All">All Employee Types</option>
                  <option value="Administrator">Administrator</option>
                  <option value="HR Personnel">HR Personnel</option>
                  <option value="Accounting">Accounting</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Staff">Staff</option>
                  <option value="SA">SA</option>
                  <option value="Guard">Guard</option>
                </select>
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Create Button */}
            <button
              onClick={() => showCreate(true)}
              className="group relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create New User
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        </section>

        {/* Modern User Table */}
        <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl mt-4 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Employee Directory</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-gradient-to-r from-red-600 to-red-700 text-white sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Profile</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Name</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Email</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Employee Type</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Position</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Information</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Department</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Hired Date</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Status</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.length > 0 ? (
                  currentUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-white/80 transition-all duration-200 group">
                      <td className="px-3 py-3 border-b border-gray-200">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                          {user.profile_picture ? (
                            <img
                              src={user.profile_picture}
                              alt={user.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800 text-sm">{user.name || 'No Name'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="text-gray-600 text-sm">{user.email}</span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${getEmployeeTypeColor(user.role).split(' ').slice(2).join(' ')}`}>
                          {user.role || 'No Role Assigned'}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200 text-gray-600 text-sm">
                        {user.positions || '--'}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <button
                          onClick={() => {
                            setSelectedUserInfo(user);
                            setShowInfoModal(true);
                          }}
                          className="px-3 py-1.5 bg-white border border-red-800 text-red-800 rounded-md hover:bg-red-50 text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Info
                        </button>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200 text-gray-600 text-sm">
                        {user.department || '--'}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200 text-gray-600 text-sm">
                        {user.hiredDate ? new Date(user.hiredDate).toLocaleDateString() : '--'}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.status === "Active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() => {
                              setEditUser(user);
                              showEdit(true);
                            }}
                            className="px-2.5 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md hover:from-blue-600 hover:to-blue-700 text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                          >
                            Edit
                          </button>
                          {user.status === "Active" ? (
                            <button
                              onClick={() => handleToggleStatus(user.id, user.status)}
                              className="px-2.5 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md hover:from-red-600 hover:to-red-700 text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(user.id, user.status)}
                              className="px-2.5 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-md hover:from-green-600 hover:to-green-700 text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-gray-800 mb-1">No Users Found</h3>
                          <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Modern Pagination */}
          <div className="flex justify-center space-x-3 items-center mt-4 p-3">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="flex items-center justify-center w-10 h-10 bg-white border border-gray-300 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-all duration-200 shadow-lg disabled:cursor-not-allowed"
            >
              <svg
                className="h-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M15.7071 4.29289C16.0976 4.68342 16.0976 5.31658 15.7071 5.70711L9.41421 12L15.7071 18.2929C16.0976 18.6834 16.0976 19.3166 15.7071 19.7071C15.3166 20.0976 14.6834 20.0976 14.2929 19.7071L7.29289 12.7071C7.10536 12.5196 7 12.2652 7 12C7 11.7348 7.10536 11.4804 7.29289 11.2929L14.2929 4.29289C14.6834 3.90237 15.3166 3.90237 15.7071 4.29289Z"
                    fill="#000000"
                  ></path>
                </g>
              </svg>
            </button>

            <span className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700">
              Page {currentPage} of {Math.ceil(filteredUsers.length / rows) || 1}
            </span>

            <button
              onClick={() =>
                setCurrentPage((prev) =>
                  prev < Math.ceil(filteredUsers.length / rows) ? prev + 1 : prev
                )
              }
              disabled={currentPage === Math.ceil(filteredUsers.length / rows)}
              className="flex items-center justify-center w-10 h-10 bg-white border border-gray-300 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-all duration-200 shadow-lg disabled:cursor-not-allowed"
            >
              <svg
                className="h-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M8.29289 4.29289C8.68342 3.90237 9.31658 3.90237 9.70711 4.29289L16.7071 11.2929C17.0976 11.6834 17.0976 12.3166 16.7071 12.7071L9.70711 19.7071C9.31658 20.0976 8.68342 20.0976 8.29289 19.7071C7.90237 19.3166 7.90237 18.6834 8.29289 18.2929L14.5858 12L8.29289 5.70711C7.90237 5.31658 7.90237 4.68342 8.29289 4.29289Z"
                    fill="#000000"
                  ></path>
                </g>
              </svg>
            </button>
          </div>
        </div>
      </main>

      {/* Modern Create Modal */}
      {create && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/50 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-md bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl overflow-hidden max-h-[90vh]"
          >
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Create New Employee
              </h2>
            </div>
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Employee Type</label>
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                >
                  <option>Administrator</option>
                  <option>HR Personnel</option>
                  <option>Accounting</option>
                  <option>Faculty</option>
                  <option>Staff</option>
                  <option>SA</option>
                  <option>Guard</option>
                </select>
              </div>
              
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter full name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter email address"
                  required
                />
              </div>
              {(newUser.role === "Faculty" || newUser.role === "SA") && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Academic Year</label>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      placeholder="Semester"
                      value={newUser.semester}
                      onChange={(e) =>
                        setNewUser({ ...newUser, semester: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                    <input
                      type="number"
                      placeholder="School Year"
                      value={newUser.schoolYear}
                      onChange={(e) =>
                        setNewUser({ ...newUser, schoolYear: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Hired Date</label>
                <input
                  type="date"
                  value={newUser.hiredDate}
                  onChange={(e) =>
                    setNewUser({ ...newUser, hiredDate: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>
              
              {(newUser.role === "Faculty" || newUser.role === "SA") && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
                  <select
                    value={newUser.department}
                    onChange={(e) =>
                      setNewUser({ ...newUser, department: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                    required
                  >
                    <option value="">-- Select Department --</option>
                    <option value="CCS">CCS</option>
                  </select>
                </div>
              )}
              
              {/* Profile Picture Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Profile Picture</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300">
                    {newUser.profile_picture ? (
                      <img
                        src={URL.createObjectURL(newUser.profile_picture)}
                        alt="Preview"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setNewUser({ ...newUser, profile_picture: file });
                        }
                      }}
                      className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Upload a profile picture (JPG, PNG, etc.)</p>
                  </div>
                </div>
              </div>
              
              {/* Positions Field - Conditional based on role */}
              {(newUser.role === "Faculty" || newUser.role === "SA" || newUser.role === "Staff") && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Position</label>
                  <select
                    value={newUser.positions}
                    onChange={(e) =>
                      setNewUser({ ...newUser, positions: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                    required
                  >
                    <option value="">-- Select Position --</option>
                    {newUser.role === "Faculty" && (
                      <>
                        <option value="Dean">Dean</option>
                        <option value="Program Head">Program Head</option>
                        <option value="Full Time">Full Time</option>
                        <option value="Part Time">Part Time</option>
                      </>
                    )}
                    {(newUser.role === "SA" || newUser.role === "Staff") && (
                      <>
                        <option value="Full Time">Full Time</option>
                        <option value="Part Time">Part Time</option>
                      </>
                    )}
                  </select>
                </div>
              )}
              
              {/* Personal Information */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Age</label>
                <input
                  type="number"
                  value={newUser.age}
                  onChange={(e) =>
                    setNewUser({ ...newUser, age: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter age"
                  min="18"
                  max="100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                <select
                  value={newUser.gender}
                  onChange={(e) =>
                    setNewUser({ ...newUser, gender: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">-- Select Gender --</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Number</label>
                <input
                  type="tel"
                  value={newUser.contact_no}
                  onChange={(e) =>
                    setNewUser({ ...newUser, contact_no: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter contact number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                <textarea
                  value={newUser.address}
                  onChange={(e) =>
                    setNewUser({ ...newUser, address: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 resize-none"
                  placeholder="Enter full address"
                  rows={3}
                />
              </div>
              
            </div>

            {/* Modern Modal Buttons */}
            <div className="bg-gray-50/50 backdrop-blur-md px-6 py-4 flex justify-center gap-4">
              <button
                type="submit"
                className="group relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Create Employee
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
              <button
                type="button"
                onClick={() => showCreate(false)}
                className="px-8 py-3 bg-white/70 backdrop-blur-md border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-white/90 transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modern RFID Scan Modal */}
      {scanningRfid && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Scan RFID Card</h2>
            <input
              autoFocus
              type="text"
              value={scannedCard}
              onChange={(e) => setScannedCard(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && e.currentTarget.value.trim() !== "") {
                  const cardValue = e.currentTarget.value.trim();
                  setScannedCard(cardValue);
                  
                  // Show processing state immediately
                  toast.loading('Processing RFID card...', { duration: 3000 });
                  
                  // Add a longer delay to ensure all form state is captured
                  setTimeout(() => {
                    handleConfirmCreate();
                  }, 1500);
                }
              }}
              className="opacity-0 absolute -left-96"
            />
            <p className="text-gray-600 mb-4">
              Waiting for RFID scan... Please tap the card and wait for processing.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-blue-800 text-sm font-medium">⚠️ Important:</p>
              <p className="text-blue-700 text-sm">After scanning, please wait a moment for all information to be saved properly.</p>
            </div>
            {scannedCard && (
              <div className="bg-green-100 border border-green-300 rounded-xl p-3 mb-4">
                <p className="text-green-800 font-semibold">
                  Card Scanned: {scannedCard}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setScanningRfid(false)}
              className="px-6 py-3 bg-white/70 backdrop-blur-md border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-white/90 transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Modern Edit Modal */}
      {edit && editUser && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/50 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleEdit}
            className="w-full max-w-md bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl overflow-hidden max-h-[90vh]"
          >
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Employee
              </h2>
            </div>
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Profile Picture Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Profile Picture</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300">
                    {editUser.newProfilePicture ? (
                      <img
                        src={URL.createObjectURL(editUser.newProfilePicture)}
                        alt="Preview"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : editUser.profile_picture ? (
                      <img
                        src={editUser.profile_picture}
                        alt={editUser.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setEditUser({ ...editUser, newProfilePicture: file });
                        }
                      }}
                      className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Upload a new profile picture (JPG, PNG, etc.)</p>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Employee Type</label>
                <select
                  value={editUser.role}
                  onChange={(e) =>
                    setEditUser({ ...editUser, role: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                >
                  <option>Administrator</option>
                  <option>HR Personnel</option>
                  <option>Accounting</option>
                  <option>Faculty</option>
                  <option>Staff</option>
                  <option>SA</option>
                  <option>Guard</option>
                </select>
              </div>
              
              {/* Positions Field - Conditional based on role */}
              {(editUser.role === "Faculty" || editUser.role === "SA" || editUser.role === "Staff") && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Position</label>
                  <select
                    value={editUser.positions || ''}
                    onChange={(e) =>
                      setEditUser({ ...editUser, positions: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                    required
                  >
                    <option value="">-- Select Position --</option>
                    {editUser.role === "Faculty" && (
                      <>
                        <option value="Dean">Dean</option>
                        <option value="Program Head">Program Head</option>
                        <option value="Full Time">Full Time</option>
                        <option value="Part Time">Part Time</option>
                      </>
                    )}
                    {(editUser.role === "SA" || editUser.role === "Staff") && (
                      <>
                        <option value="Full Time">Full Time</option>
                        <option value="Part Time">Part Time</option>
                      </>
                    )}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={editUser.name}
                  onChange={(e) =>
                    setEditUser({ ...editUser, name: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter full name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={editUser.email}
                  onChange={(e) =>
                    setEditUser({ ...editUser, email: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter email address"
                  required
                />
              </div>
              
              {(editUser.role === "Faculty" || editUser.role === "SA") && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Academic Year</label>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      placeholder="Semester"
                      value={editUser.semester}
                      onChange={(e) =>
                        setEditUser({ ...editUser, semester: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                    <input
                      type="number"
                      placeholder="School Year"
                      value={editUser.schoolYear}
                      onChange={(e) =>
                        setEditUser({ ...editUser, schoolYear: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Hired Date</label>
                <input
                  type="date"
                  value={editUser.hiredDate}
                  onChange={(e) =>
                    setEditUser({ ...editUser, hiredDate: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              
              {(editUser.role === "Faculty" || editUser.role === "SA") && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
                  <select
                    value={editUser.department}
                    onChange={(e) =>
                      setEditUser({ ...editUser, department: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                    required
                  >
                    <option value="">-- Select Department --</option>
                    <option value="CCS">CCS</option>
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <select
                  value={editUser.status}
                  onChange={(e) =>
                    setEditUser({ ...editUser, status: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
              
              {/* Personal Information */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Age</label>
                <input
                  type="number"
                  value={editUser.age || ''}
                  onChange={(e) =>
                    setEditUser({ ...editUser, age: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter age"
                  min="18"
                  max="100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                <select
                  value={editUser.gender || ''}
                  onChange={(e) =>
                    setEditUser({ ...editUser, gender: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">-- Select Gender --</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Number</label>
                <input
                  type="tel"
                  value={editUser.contact_no || ''}
                  onChange={(e) =>
                    setEditUser({ ...editUser, contact_no: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter contact number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                <textarea
                  value={editUser.address || ''}
                  onChange={(e) =>
                    setEditUser({ ...editUser, address: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 resize-none"
                  placeholder="Enter full address"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">RFID Management</label>
                {!editingRfid ? (
                  <button
                    type="button"
                    onClick={() => setEditingRfid(true)}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit RFID Card
                  </button>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <input
                      autoFocus
                      type="text"
                      value={newRfid}
                      onChange={(e) => setNewRfid(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdateRfid();
                      }}
                      className="opacity-0 absolute -left-96"
                      placeholder="Scan new RFID card"
                    />
                    <div className="text-center mb-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-blue-800 font-medium">Waiting for RFID scan...</p>
                      <p className="text-blue-600 text-sm">Please tap the new RFID card</p>
                    </div>
                    {newRfid && (
                      <div className="bg-green-100 border border-green-300 rounded-xl p-3 mb-4">
                        <p className="text-green-800 font-semibold text-center">
                          Card Scanned: {newRfid}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleUpdateRfid}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200"
                      >
                        Save RFID
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRfid(false);
                          setNewRfid("");
                        }}
                        className="flex-1 px-4 py-2 bg-white/70 backdrop-blur-md border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-white/90 transition-all duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modern Modal Buttons */}
            <div className="bg-gray-50/50 backdrop-blur-md px-6 py-4 flex justify-center gap-4">
              <button
                type="submit"
                className="group relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Update Employee
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
              <button
                type="button"
                onClick={() => showEdit(false)}
                className="px-8 py-3 bg-white/70 backdrop-blur-md border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-white/90 transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modern Information Modal */}
      {showInfoModal && selectedUserInfo && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-gray-200 shadow-2xl rounded-2xl overflow-hidden transform transition-all duration-300 scale-100 sticky">
            {/* Modern Header with Red Gradient */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-red-700/20 backdrop-blur-sm"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Employee Information</h2>
                      <p className="text-red-100 text-sm">{selectedUserInfo.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowInfoModal(false);
                      setSelectedUserInfo(null);
                    }}
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center transition-all duration-200 group"
                  >
                    <svg className="w-5 h-5 text-white group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Modern Content Area */}
            <div className="p-4 bg-gradient-to-br from-gray-50 to-white">
              <div className="grid grid-cols-1 gap-3">
                {/* Age Card */}
                <div className="group bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-red-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-300 rounded-md flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300">
                        <svg className="w-4 h-4 text-red-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h8m-8 0H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-800">Age</h3>
                        <p className="text-xs text-gray-500">Years old</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-gray-800">{selectedUserInfo.age || '--'}</span>
                      {!selectedUserInfo.age && <p className="text-xs text-gray-400 mt-1">Not specified</p>}
                    </div>
                  </div>
                </div>

                {/* Gender Card */}
                <div className="group bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-red-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-300 rounded-md flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300">
                        <svg className="w-4 h-4 text-red-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-800">Gender</h3>
                        <p className="text-xs text-gray-500">Identity</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-800">{selectedUserInfo.gender || 'Not specified'}</span>
                    </div>
                  </div>
                </div>

                {/* Contact Number Card */}
                <div className="group bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-red-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-300 rounded-md flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300">
                        <svg className="w-4 h-4 text-red-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-800">Contact Number</h3>
                        <p className="text-xs text-gray-500">Phone</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-800">{selectedUserInfo.contact_no || 'Not specified'}</span>
                    </div>
                  </div>
                </div>

                {/* Address Card */}
                <div className="group bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-red-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-red-300 rounded-md flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                      <svg className="w-4 h-4 text-red-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-gray-800 mb-1">Address</h3>
                      <p className="text-xs text-gray-500 mb-1">Home location</p>
                      <div className="bg-gray-50 rounded-md p-2 border border-gray-100">
                        <p className="text-sm text-gray-800 leading-relaxed">
                          {selectedUserInfo.address || 'Not specified'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modern Footer */}
            <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-3 border-t border-gray-200">
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowInfoModal(false);
                    setSelectedUserInfo(null);
                  }}
                  className="group relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Close Information
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
