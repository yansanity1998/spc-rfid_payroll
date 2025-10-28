import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";
import toast from "react-hot-toast";
import jsPDF from "jspdf";

// Custom CSS for animations
const customStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from { 
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to { 
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
  
  .animate-slideUp {
    animation: slideUp 0.4s ease-out;
  }
  
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(to bottom, #ef4444, #dc2626);
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(to bottom, #dc2626, #b91c1c);
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = customStyles;
  document.head.appendChild(styleSheet);
}

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
  const [selectedUserScholarship, setSelectedUserScholarship] = useState<any>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [scanningRfid, setScanningRfid] = useState(false);
  const [scannedCard, setScannedCard] = useState("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [userToModify, setUserToModify] = useState<any>(null);

  // Function to generate PDF for user information
  const generateUserPDF = async () => {
    if (!selectedUserInfo) return;
    
    setIsGeneratingPDF(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = 15;

      // Document Border
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(1.5);
      doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
      
      // Inner border
      doc.setLineWidth(0.5);
      doc.rect(12, 12, pageWidth - 24, pageHeight - 24);
      
      // Header Section - Reduced height
      yPos = 18;
      doc.setFillColor(220, 38, 38);
      doc.rect(margin, yPos, pageWidth - (margin * 2), 22, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('SPC RFID PAYROLL SYSTEM', pageWidth / 2, yPos + 9, { align: 'center' });
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('EMPLOYEE INFORMATION RECORD', pageWidth / 2, yPos + 16, { align: 'center' });
      
      yPos += 28;

      // Employee Profile Box with Border - Reduced height
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 28, 2, 2, 'FD');
      
      // Profile Picture - Try to load actual image or fall back to initials
      let profilePictureLoaded = false;
      const profilePicUrl = selectedUserInfo.profile_picture;
      
      if (profilePicUrl) {
        try {
          // Function to load image asynchronously
          const loadImage = (url: string): Promise<string> => {
            return new Promise((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              
              // Add timeout to handle cases where images take too long
              const timeout = setTimeout(() => {
                reject(new Error('Image load timeout'));
              }, 10000); // 10 second timeout
              
              img.onload = () => {
                clearTimeout(timeout);
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0);
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                  resolve(dataUrl);
                } else {
                  reject(new Error('Could not get canvas context'));
                }
              };
              
              img.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Failed to load image'));
              };
              
              img.src = url + '?t=' + Date.now(); // Add cache busting
            });
          };

          const imageDataUrl = await loadImage(profilePicUrl);
          // Draw circular clipping mask
          const centerX = margin + 12;
          const centerY = yPos + 14;
          const radius = 10;
          
          // Add image as square (jsPDF doesn't support circular clipping)
          const imageSize = radius * 2;
          doc.addImage(imageDataUrl, 'JPEG', centerX - radius, centerY - radius, imageSize, imageSize);
          
          profilePictureLoaded = true;
        } catch (error) {
          console.error('Error loading profile picture:', error);
          profilePictureLoaded = false;
        }
      }
      
      // Fall back to initials if no profile picture or if it failed to load
      if (!profilePictureLoaded) {
        doc.setFillColor(220, 38, 38);
        doc.circle(margin + 12, yPos + 14, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const initials = selectedUserInfo.name ? selectedUserInfo.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'NA';
        doc.text(initials, margin + 12, yPos + 17, { align: 'center' });
      }
      
      // Employee Name and Details - Smaller fonts
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(selectedUserInfo.name || 'N/A', margin + 26, yPos + 10);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(selectedUserInfo.email || 'N/A', margin + 26, yPos + 16);
      
      // Role and Position Badge - Smaller
      const roleColors: any = {
        'Administrator': [147, 51, 234],
        'HR Personnel': [59, 130, 246],
        'Accounting': [34, 197, 94],
        'Faculty': [220, 38, 38],
        'Staff': [249, 115, 22],
        'SA': [234, 179, 8],
        'Guard': [20, 184, 166]
      };
      const roleColor = roleColors[selectedUserInfo.role] || [107, 114, 128];
      doc.setFillColor(roleColor[0], roleColor[1], roleColor[2]);
      doc.roundedRect(margin + 26, yPos + 19, 30, 6, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(selectedUserInfo.role || 'N/A', margin + 41, yPos + 23, { align: 'center' });
      
      if (selectedUserInfo.positions) {
        doc.setFillColor(100, 100, 100);
        doc.roundedRect(margin + 58, yPos + 19, 35, 6, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(selectedUserInfo.positions, margin + 75.5, yPos + 23, { align: 'center' });
      }
      
      // Status Badge (Right side) - Smaller
      const statusX = pageWidth - margin - 25;
      if (selectedUserInfo.status === 'Active') {
        doc.setFillColor(34, 197, 94);
      } else if (selectedUserInfo.status === 'Archived') {
        doc.setFillColor(147, 51, 234);
      } else {
        doc.setFillColor(239, 68, 68);
      }
      doc.roundedRect(statusX, yPos + 11, 22, 6, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(selectedUserInfo.status || 'N/A', statusX + 11, yPos + 15, { align: 'center' });
    
    yPos += 32;

    // Personal Information Section with Table - Reduced spacing
    doc.setFillColor(220, 38, 38);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('PERSONAL INFORMATION', margin + 2, yPos + 4);
    yPos += 7;

    // Personal info table - Reduced row height
    const personalInfo = [
      { label: 'Age', value: selectedUserInfo.age || 'Not specified' },
      { label: 'Gender', value: selectedUserInfo.gender || 'Not specified' },
      { label: 'Contact Number', value: selectedUserInfo.contact_no || 'Not specified' },
    ];

    personalInfo.forEach((info, index) => {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.setFillColor(index % 2 === 0 ? 250 : 255, index % 2 === 0 ? 250 : 255, index % 2 === 0 ? 250 : 255);
      doc.rect(margin, yPos, pageWidth - (margin * 2), 7, 'FD');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text(info.label, margin + 2, yPos + 4.5);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      doc.text(String(info.value), margin + 45, yPos + 4.5);
      yPos += 7;
    });

    yPos += 3;

    // Work Information Section with Table - Reduced spacing
    doc.setFillColor(220, 38, 38);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('WORK INFORMATION', margin + 2, yPos + 4);
    yPos += 7;

    const workInfo = [
      { label: 'Department', value: selectedUserInfo.department || 'Not specified' },
      { label: 'Hired Date', value: selectedUserInfo.hiredDate ? new Date(selectedUserInfo.hiredDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not specified' },
    ];

    if ((selectedUserInfo.role === 'Faculty' || selectedUserInfo.role === 'SA') && selectedUserInfo.semester && selectedUserInfo.schoolYear) {
      workInfo.push({
        label: 'Academic Year',
        value: `Semester ${selectedUserInfo.semester}, ${selectedUserInfo.schoolYear}`
      });
    }

    workInfo.forEach((info, index) => {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.setFillColor(index % 2 === 0 ? 250 : 255, index % 2 === 0 ? 250 : 255, index % 2 === 0 ? 250 : 255);
      doc.rect(margin, yPos, pageWidth - (margin * 2), 7, 'FD');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text(info.label, margin + 2, yPos + 4.5);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      doc.text(String(info.value), margin + 45, yPos + 4.5);
      yPos += 7;
    });

    yPos += 3;

    // Address Information Section - Reduced spacing
    doc.setFillColor(220, 38, 38);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('ADDRESS INFORMATION', margin + 2, yPos + 4);
    yPos += 7;

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.setFillColor(250, 250, 250);
    const address = selectedUserInfo.address || 'Address not specified';
    const addressLines = doc.splitTextToSize(address, pageWidth - (margin * 2) - 6);
    const addressHeight = (addressLines.length * 4) + 6;
    doc.rect(margin, yPos, pageWidth - (margin * 2), addressHeight, 'FD');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(addressLines, margin + 2, yPos + 4);
    yPos += addressHeight + 3;

    // Scholarship Information (Faculty only) - Reduced spacing
    if (selectedUserInfo.role === 'Faculty' && selectedUserScholarship) {
      doc.setFillColor(220, 38, 38);
      doc.rect(margin, yPos, pageWidth - (margin * 2), 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('SCHOLARSHIP INFORMATION', margin + 2, yPos + 4);
      yPos += 7;

      if (selectedUserScholarship.has_scholarship) {
        const scholarshipInfo = [
          { label: 'Status', value: 'Active Scholarship' },
          { label: 'Period', value: selectedUserScholarship.scholarship_period || 'N/A' },
          { label: 'School Year', value: selectedUserScholarship.school_year || 'N/A' },
        ];

        if (selectedUserScholarship.amount) {
          scholarshipInfo.push({
            label: 'Amount',
            value: `₱${parseFloat(selectedUserScholarship.amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          });
        }

        scholarshipInfo.forEach((info, index) => {
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.3);
          doc.setFillColor(index % 2 === 0 ? 250 : 255, index % 2 === 0 ? 250 : 255, index % 2 === 0 ? 250 : 255);
          doc.rect(margin, yPos, pageWidth - (margin * 2), 7, 'FD');
          
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(60, 60, 60);
          doc.text(info.label, margin + 2, yPos + 4.5);
          
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(40, 40, 40);
          doc.text(String(info.value), margin + 45, yPos + 4.5);
          yPos += 7;
        });

        if (selectedUserScholarship.notes) {
          yPos += 1;
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.3);
          doc.setFillColor(250, 250, 250);
          const notesLines = doc.splitTextToSize(selectedUserScholarship.notes, pageWidth - (margin * 2) - 6);
          const notesHeight = (notesLines.length * 4) + 6;
          doc.rect(margin, yPos, pageWidth - (margin * 2), notesHeight, 'FD');
          
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(60, 60, 60);
          doc.text('Notes:', margin + 2, yPos + 4);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(40, 40, 40);
          doc.text(notesLines, margin + 2, yPos + 8);
          yPos += notesHeight;
        }
      } else {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, yPos, pageWidth - (margin * 2), 7, 'FD');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text('No active scholarship', margin + 2, yPos + 4.5);
        yPos += 7;
      }
    }

    // Footer Section
    const footerY = pageHeight - 25;
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY, pageWidth - margin, footerY);
    
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    doc.text(`Document generated on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, margin, footerY + 5);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text('SPC RFID Payroll System', pageWidth / 2, footerY + 5, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Confidential Employee Record', pageWidth - margin, footerY + 5, { align: 'right' });

    // Save PDF
    const fileName = `${selectedUserInfo.name.replace(/\s+/g, '_')}_Employee_Record.pdf`;
    doc.save(fileName);
    toast.success('PDF generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showInfoModal || create || edit || scanningRfid || showArchiveConfirm || showStatusConfirm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showInfoModal, create, edit, scanningRfid, showArchiveConfirm, showStatusConfirm]);

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

  const rows = 10;

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "Faculty",
    semester: "",
    schoolYear: "",
    hiredDate: "",
    department: "",
  });

  const [editUser, setEditUser] = useState<any | null>(null);
  const [scholarshipData, setScholarshipData] = useState<any>({
    has_scholarship: false,
    scholarship_period: '',
    school_year: '',
    amount: '',
    notes: ''
  });



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

  const handleArchiveUser = async (id: string, userName: string) => {
    const { error } = await supabase
      .from("users")
      .update({ status: "Archived" })
      .eq("id", id);

    if (error) {
      console.error(error.message);
      toast.error("Failed to archive user");
    } else {
      toast.success(`${userName} has been archived`);
      fetchUsers();
    }
  };

  const handleUnarchiveUser = async (id: string, userName: string) => {
    const { error } = await supabase
      .from("users")
      .update({ status: "Active" })
      .eq("id", id);

    if (error) {
      console.error(error.message);
      toast.error("Failed to unarchive user");
    } else {
      toast.success(`${userName} has been restored to active`);
      fetchUsers();
    }
  };

  const fetchUsers = async () => {
    // Fetch all users first
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      // Filter by archived status using existing status field
      const filteredData = (data || []).filter(user => {
        const isArchived = user.status === "Archived";
        return showArchived ? isArchived : !isArchived;
      });
      setUsers(filteredData);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [showArchived]);

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
      setScanningRfid(false);
      setScannedCard("");
      return;
    }

    console.log("=== FORM STATE DEBUG ===");
    console.log("Full newUser state:", newUser);
    console.log("Scanned card:", scannedCard);

    // Check if required fields are filled
    if (!newUser.name || !newUser.email) {
      toast.error("Please fill in all required fields (Name and Email) before scanning RFID!");
      setScanningRfid(false);
      setScannedCard("");
      return;
    }

    // Show loading state
    toast.loading('Creating user...', { duration: 10000 });

    try {
      // Prepare payload with essential fields only
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
        status: "Active",
        password: "ChangePassword",
      };

      console.log("=== PAYLOAD DEBUG ===");
      console.log("Final payload:", payload);

      // get the current session (logged-in admin)
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.dismiss();
        toast.error("You must be logged in as an admin to create users.");
        setScanningRfid(false);
        setScannedCard("");
        return;
      }

      console.log('Making request to Edge Function...');
      
      let userCreated = false;
      let createMethod = 'Edge Function';
      
      try {
        const response = await fetch(
          "https://squtybkgujjgrxeqmrfs.supabase.co/functions/v1/create-user",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(payload),
          }
        );

        console.log('Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Edge Function Response:', data);
          userCreated = true;
          createMethod = 'Edge Function';
        } else {
          const errorData = await response.json();
          console.error('Edge Function failed:', errorData);
          throw new Error(`Edge Function failed: ${errorData.error || 'Unknown error'}`);
        }
      } catch (edgeFunctionError: any) {
        console.warn('Edge Function failed, trying direct database insert:', edgeFunctionError.message);
        
        // Fallback: Direct database insert
        try {
          console.log('Attempting direct database insert...');
          
          // Check if RFID already exists
          const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('rfid_id', Number(scannedCard))
            .single();
            
          if (existingUser) {
            throw new Error('RFID card is already in use');
          }
          
          if (checkError && checkError.code !== 'PGRST116') {
            // PGRST116 is "not found" which is expected for new RFID cards
            console.error('Error checking RFID:', checkError);
            throw new Error(`Error checking RFID: ${checkError.message}`);
          }
          
          // Insert user directly into database
          const { data: insertData, error: insertError } = await supabase
            .from('users')
            .insert({
              rfid_id: Number(scannedCard),
              name: newUser.name,
              email: newUser.email,
              role: newUser.role,
              semester: newUser.semester || null,
              schoolYear: newUser.schoolYear || null,
              hiredDate: newUser.hiredDate || null,
              department: newUser.role === "Faculty" || newUser.role === "SA" ? newUser.department : null,
              status: "Active",
              password: "ChangePassword",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select();
            
          if (insertError) {
            console.error('Direct insert error:', insertError);
            throw new Error(`Database insert failed: ${insertError.message}`);
          }
          
          console.log('Direct database insert successful:', insertData);
          userCreated = true;
          createMethod = 'Direct Database Insert';
          
        } catch (directInsertError: any) {
          console.error('Direct database insert also failed:', directInsertError.message);
          throw directInsertError;
        }
      }
      
      toast.dismiss(); // Dismiss loading toast
      
      if (userCreated) {
        console.log(`User created successfully via ${createMethod}!`);
        toast.success(`User created successfully via ${createMethod}!`);
      } else {
        throw new Error('Failed to create user via any method');
      }
      
      // Reset form and close modal
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
      });
      
      // Refresh user list
      fetchUsers();
      
    } catch (err: any) {
      console.error('User Creation Error:', err);
      toast.dismiss(); // Dismiss loading toast
      
      // Show specific error message
      if (err.message.includes('RFID card is already in use')) {
        toast.error("RFID card is already in use. Please use a different card.");
      } else if (err.message.includes('Edge Function failed')) {
        toast.error("Server error: " + err.message);
      } else if (err.message.includes('Database insert failed')) {
        toast.error("Database error: " + err.message);
      } else {
        toast.error("Failed to create user: " + err.message);
      }
      
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

      // Handle scholarship data for Faculty users
      if (editUser.role === "Faculty" && scholarshipData.has_scholarship) {
        // Check if scholarship record exists
        const { data: existingScholarship } = await supabase
          .from('scholarship')
          .select('*')
          .eq('user_id', editUser.id)
          .eq('school_year', scholarshipData.school_year)
          .eq('scholarship_period', scholarshipData.scholarship_period)
          .single();

        const scholarshipPayload = {
          user_id: editUser.id,
          has_scholarship: scholarshipData.has_scholarship,
          scholarship_period: scholarshipData.scholarship_period,
          school_year: scholarshipData.school_year,
          amount: scholarshipData.amount ? parseFloat(scholarshipData.amount) : null,
          notes: scholarshipData.notes || null,
          updated_at: new Date().toISOString()
        };

        if (existingScholarship) {
          // Update existing scholarship
          const { error: scholarshipError } = await supabase
            .from('scholarship')
            .update(scholarshipPayload)
            .eq('id', existingScholarship.id);

          if (scholarshipError) {
            console.error('Scholarship update error:', scholarshipError);
            toast.error('Failed to update scholarship: ' + scholarshipError.message);
          }
        } else {
          // Insert new scholarship
          const { error: scholarshipError } = await supabase
            .from('scholarship')
            .insert(scholarshipPayload);

          if (scholarshipError) {
            console.error('Scholarship insert error:', scholarshipError);
            toast.error('Failed to create scholarship: ' + scholarshipError.message);
          }
        }
      } else if (editUser.role === "Faculty" && !scholarshipData.has_scholarship) {
        // Delete scholarship records if has_scholarship is false
        const { error: deleteError } = await supabase
          .from('scholarship')
          .delete()
          .eq('user_id', editUser.id);

        if (deleteError) {
          console.error('Scholarship delete error:', deleteError);
        }
      }

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
        
        // Update the users state immediately to reflect changes in the table
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === editUser.id 
              ? { ...user, ...updateData }
              : user
          )
        );
        
        showEdit(false);
        setEditUser(null);
        fetchUsers(); // Still fetch to ensure data consistency
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

            {/* Toggle Archived Button */}
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`group relative overflow-hidden ${showArchived ? 'bg-gradient-to-r from-gray-600 to-gray-700' : 'bg-gradient-to-r from-purple-600 to-purple-700'} text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              {showArchived ? 'Show Active Users' : 'Show Archived Users'}
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>

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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800">{showArchived ? 'Archived Employees' : 'Employee Directory'}</h2>
              </div>
              {showArchived && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  Archived View
                </span>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-gradient-to-r from-red-600 to-red-700 text-white sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-2.5 text-center border-b text-sm font-medium whitespace-nowrap">Profile</th>
                  <th className="px-2 py-2.5 text-center border-b text-sm font-medium whitespace-nowrap">Name</th>
                  <th className="px-2 py-2.5 text-center border-b text-sm font-medium whitespace-nowrap">Email</th>
                  <th className="px-2 py-2.5 text-center border-b text-sm font-medium whitespace-nowrap">Employee Type</th>
                  <th className="px-2 py-2.5 text-center border-b text-sm font-medium whitespace-nowrap">Position</th>
                  <th className="px-2 py-2.5 text-center border-b text-sm font-medium whitespace-nowrap">Department</th>
                  <th className="px-2 py-2.5 text-center border-b text-sm font-medium whitespace-nowrap">Hired Date</th>
                  <th className="px-2 py-2.5 text-center border-b text-sm font-medium whitespace-nowrap">Status</th>
                  <th className="px-2 py-2.5 text-center border-b text-sm font-medium whitespace-nowrap">Actions</th>
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
                              key={`${user.id}-${user.profile_picture}`}
                              src={`${user.profile_picture}?t=${Date.now()}`}
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
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-sm whitespace-nowrap ${getEmployeeTypeColor(user.role).split(' ').slice(2).join(' ')}`}>
                          {user.role || 'No Role Assigned'}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200 text-gray-600 text-sm">
                        {user.positions || '--'}
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
                            : user.status === "Archived"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <div className="flex items-center gap-1.5">
                            <button
                              onClick={async () => {
                                setSelectedUserInfo(user);
                                
                                // Fetch scholarship data if user is Faculty
                                if (user.role === "Faculty") {
                                  const { data: scholarship } = await supabase
                                    .from('scholarship')
                                    .select('*')
                                    .eq('user_id', user.id)
                                    .order('created_at', { ascending: false })
                                    .limit(1)
                                    .single();
                                  
                                  setSelectedUserScholarship(scholarship || null);
                                } else {
                                  setSelectedUserScholarship(null);
                                }
                                
                                setShowInfoModal(true);
                              }}
                              className="p-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-md hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-md"
                              title="View"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          {!showArchived && (
                            <>
                              <button
                                onClick={async () => {
                                  setEditUser(user);

                                  // Fetch scholarship data if user is Faculty
                                  if (user.role === "Faculty") {
                                    const { data: scholarship } = await supabase
                                      .from('scholarship')
                                      .select('*')
                                      .eq('user_id', user.id)
                                      .order('created_at', { ascending: false })
                                      .limit(1)
                                      .single();
                                    
                                    if (scholarship) {
                                      setScholarshipData({
                                        has_scholarship: scholarship.has_scholarship,
                                        scholarship_period: scholarship.scholarship_period || '',
                                        school_year: scholarship.school_year || '',
                                        amount: scholarship.amount || '',
                                        notes: scholarship.notes || ''
                                      });
                                    } else {
                                      setScholarshipData({
                                        has_scholarship: false,
                                        scholarship_period: '',
                                        school_year: '',
                                        amount: '',
                                        notes: ''
                                      });
                                    }
                                  }

                                  showEdit(true);
                                }}
                                className="p-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              {user.status === "Active" ? (
                                <button
                                  onClick={() => {
                                    setUserToModify(user);
                                    setShowStatusConfirm(true);
                                  }}
                                  className="p-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
                                  title="Deactivate"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                  </svg>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setUserToModify(user);
                                    setShowStatusConfirm(true);
                                  }}
                                  className="p-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-md hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                                  title="Activate"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setUserToModify(user);
                                  setShowArchiveConfirm(true);
                                }}
                                className="p-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-md hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-sm hover:shadow-md"
                                title="Archive"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                              </button>
                            </>
                          )}
                          {showArchived && (
                            <button
                              onClick={() => handleUnarchiveUser(user.id, user.name)}
                              className="p-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-md hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                              title="Unarchive"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
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
        <div className="fixed inset-0 backdrop-blur-sm bg-black/50 z-50 flex items-center justify-center p-4 overflow-hidden">
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
                    <select
                      value={newUser.semester}
                      onChange={(e) =>
                        setNewUser({ ...newUser, semester: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                      required
                    >
                      <option value="">-- Select Semester --</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                    </select>
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
                    <select
                      value={editUser.semester}
                      onChange={(e) =>
                        setEditUser({ ...editUser, semester: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                      required
                    >
                      <option value="">-- Select Semester --</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                    </select>
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
                  <option>Archived</option>
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
              
              {/* Scholarship Section - Only for Faculty */}
              {editUser.role === "Faculty" && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-base font-bold text-gray-800">Scholarship Information</h3>
                  </div>
                  
                  <div className="space-y-4 bg-yellow-50/50 border border-yellow-200 rounded-xl p-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Has Scholarship?</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="has_scholarship"
                            checked={scholarshipData.has_scholarship === true}
                            onChange={() => setScholarshipData({ ...scholarshipData, has_scholarship: true })}
                            className="w-4 h-4 text-red-600 focus:ring-red-500"
                          />
                          <span className="text-sm font-medium text-gray-700">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="has_scholarship"
                            checked={scholarshipData.has_scholarship === false}
                            onChange={() => setScholarshipData({ ...scholarshipData, has_scholarship: false })}
                            className="w-4 h-4 text-red-600 focus:ring-red-500"
                          />
                          <span className="text-sm font-medium text-gray-700">No</span>
                        </label>
                      </div>
                    </div>
                    
                    {scholarshipData.has_scholarship && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Scholarship Period</label>
                          <select
                            value={scholarshipData.scholarship_period}
                            onChange={(e) => setScholarshipData({ ...scholarshipData, scholarship_period: e.target.value })}
                            className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                            required={scholarshipData.has_scholarship}
                          >
                            <option value="">-- Select Period --</option>
                            <option value="1st sem">1st Semester</option>
                            <option value="2nd sem">2nd Semester</option>
                            <option value="Whole School Year">Whole School Year</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">School Year</label>
                          <input
                            type="text"
                            value={scholarshipData.school_year}
                            onChange={(e) => setScholarshipData({ ...scholarshipData, school_year: e.target.value })}
                            className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                            placeholder="e.g., 2024-2025"
                            required={scholarshipData.has_scholarship}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Scholarship Amount (₱)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={scholarshipData.amount}
                            onChange={(e) => setScholarshipData({ ...scholarshipData, amount: e.target.value })}
                            className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                            placeholder="Enter amount"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                          <textarea
                            value={scholarshipData.notes}
                            onChange={(e) => setScholarshipData({ ...scholarshipData, notes: e.target.value })}
                            className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 resize-none"
                            placeholder="Additional scholarship details"
                            rows={2}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              
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

      {/* Enhanced Information Modal */}
      {showInfoModal && selectedUserInfo && (
        <div className="fixed inset-0 backdrop-blur-lg bg-black/70 z-[60] flex items-center justify-center p-3 animate-fadeIn">
          <div className="w-full max-w-3xl max-h-[90vh] bg-white border border-gray-200 shadow-2xl rounded-2xl overflow-hidden transform transition-all duration-500 scale-100 animate-slideUp">
            {/* Enhanced Header with Red Gradient */}
            <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 px-6 py-4 relative overflow-hidden">
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full translate-x-20 translate-y-20"></div>
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg border border-white/30">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">Employee Profile</h2>
                      <p className="text-red-100 text-base font-medium">{selectedUserInfo.name}</p>
                      <p className="text-red-200 text-sm opacity-90">{selectedUserInfo.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowInfoModal(false);
                      setSelectedUserInfo(null);
                    }}
                    className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center transition-all duration-300 group hover:scale-110 border border-white/20"
                  >
                    <svg className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Enhanced Content Area */}
            <div className="p-4 bg-gradient-to-br from-gray-50 via-white to-gray-50 max-h-[55vh] overflow-y-auto custom-scrollbar">
              {/* Enhanced Profile Section */}
              <div className="flex items-center gap-3 mb-4 p-3 bg-gradient-to-r from-white to-gray-50 rounded-lg border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300">
                <div className="relative">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-2 border-white shadow-md">
                    {selectedUserInfo.profile_picture ? (
                      <img
                        src={`${selectedUserInfo.profile_picture}?t=${Date.now()}`}
                        alt={selectedUserInfo.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  {/* Status Indicator */}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white shadow-md flex items-center justify-center ${
                    selectedUserInfo.status === "Active" ? "bg-green-500" : "bg-red-500"
                  }`}>
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800 mb-0.5">{selectedUserInfo.name}</h3>
                  <p className="text-gray-600 text-sm mb-1.5">{selectedUserInfo.email}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium shadow-sm ${getEmployeeTypeColor(selectedUserInfo.role).split(' ').slice(2).join(' ')}`}>
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z" />
                      </svg>
                      {selectedUserInfo.role}
                    </span>
                    {selectedUserInfo.positions && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 shadow-sm">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        {selectedUserInfo.positions}
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium shadow-sm ${
                      selectedUserInfo.status === "Active"
                        ? "bg-green-100 text-green-800 border border-green-200"
                        : selectedUserInfo.status === "Archived"
                        ? "bg-purple-100 text-purple-800 border border-purple-200"
                        : "bg-red-100 text-red-800 border border-red-200"
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full mr-1 ${
                        selectedUserInfo.status === "Active" 
                          ? "bg-green-500" 
                          : selectedUserInfo.status === "Archived"
                          ? "bg-purple-500"
                          : "bg-red-500"
                      }`}></div>
                      {selectedUserInfo.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Enhanced Information Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Personal Information */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-red-600 rounded-md flex items-center justify-center shadow-sm">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h4 className="text-base font-bold text-gray-800">Personal Information</h4>
                  </div>
                  
                  <div className="group bg-gradient-to-r from-white to-red-50 border border-red-100 rounded-md p-3 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 bg-gradient-to-br from-red-100 to-red-200 rounded-md flex items-center justify-center">
                        <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h8m-8 0H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
                        </svg>
                      </div>
                      <div>
                        <h5 className="font-semibold text-gray-800 text-sm">Age</h5>
                        <p className="text-red-600 text-xs">Years old</p>
                      </div>
                    </div>
                    <div className="ml-8">
                      <p className="text-lg font-bold text-gray-800">{selectedUserInfo.age || '--'}</p>
                      {!selectedUserInfo.age && <p className="text-xs text-gray-500">Not specified</p>}
                    </div>
                  </div>

                  <div className="group bg-gradient-to-r from-white to-red-50 border border-red-100 rounded-md p-3 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 bg-gradient-to-br from-red-100 to-red-200 rounded-md flex items-center justify-center">
                        <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <h5 className="font-semibold text-gray-800 text-sm">Gender</h5>
                        <p className="text-red-600 text-xs">Identity</p>
                      </div>
                    </div>
                    <div className="ml-8">
                      <p className="text-lg font-bold text-gray-800">{selectedUserInfo.gender || 'Not specified'}</p>
                    </div>
                  </div>

                  <div className="group bg-gradient-to-r from-white to-red-50 border border-red-100 rounded-md p-3 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 bg-gradient-to-br from-red-100 to-red-200 rounded-md flex items-center justify-center">
                        <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div>
                        <h5 className="font-semibold text-gray-800 text-sm">Contact Number</h5>
                        <p className="text-red-600 text-xs">Phone</p>
                      </div>
                    </div>
                    <div className="ml-8">
                      <p className="text-lg font-bold text-gray-800">{selectedUserInfo.contact_no || 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                {/* Work Information */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center shadow-sm">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <h4 className="text-base font-bold text-gray-800">Work Information</h4>
                  </div>
                  
                  <div className="group bg-gradient-to-r from-white to-blue-50 border border-blue-100 rounded-md p-3 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded-md flex items-center justify-center">
                        <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        <h5 className="font-semibold text-gray-800 text-sm">Department</h5>
                        <p className="text-blue-600 text-xs">Work unit</p>
                      </div>
                    </div>
                    <div className="ml-8">
                      <p className="text-lg font-bold text-gray-800">{selectedUserInfo.department || 'Not specified'}</p>
                    </div>
                  </div>

                  <div className="group bg-gradient-to-r from-white to-blue-50 border border-blue-100 rounded-md p-3 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded-md flex items-center justify-center">
                        <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h8m-8 0H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
                        </svg>
                      </div>
                      <div>
                        <h5 className="font-semibold text-gray-800 text-sm">Hired Date</h5>
                        <p className="text-blue-600 text-xs">Start date</p>
                      </div>
                    </div>
                    <div className="ml-8">
                      <p className="text-lg font-bold text-gray-800">{selectedUserInfo.hiredDate ? new Date(selectedUserInfo.hiredDate).toLocaleDateString() : 'Not specified'}</p>
                    </div>
                  </div>

                  {(selectedUserInfo.role === "Faculty" || selectedUserInfo.role === "SA") && (
                    <div className="group bg-gradient-to-r from-white to-blue-50 border border-blue-100 rounded-md p-3 shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded-md flex items-center justify-center">
                          <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div>
                          <h5 className="font-semibold text-gray-800 text-sm">Academic Year</h5>
                          <p className="text-blue-600 text-xs">School period</p>
                        </div>
                      </div>
                      <div className="ml-8">
                        <p className="text-lg font-bold text-gray-800">
                          {selectedUserInfo.semester && selectedUserInfo.schoolYear 
                            ? `Semester ${selectedUserInfo.semester}, ${selectedUserInfo.schoolYear}` 
                            : 'Not specified'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Address - Full Width */}
                <div className="lg:col-span-2 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded-md flex items-center justify-center shadow-sm">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h4 className="text-base font-bold text-gray-800">Address Information</h4>
                  </div>
                  
                  <div className="group bg-gradient-to-r from-white to-green-50 border border-green-100 rounded-md p-4 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-gradient-to-br from-green-100 to-green-200 rounded-md flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h5 className="font-semibold text-gray-800 text-sm mb-1">Home Address</h5>
                        <p className="text-green-600 text-xs mb-2">Residential location</p>
                        <div className="bg-gradient-to-r from-gray-50 to-green-50 rounded-md p-3 border border-green-100">
                          <p className="text-gray-800 leading-relaxed text-sm">
                            {selectedUserInfo.address || 'Address not specified'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scholarship Information - Only for Faculty */}
                {selectedUserInfo.role === "Faculty" && (
                  <div className="lg:col-span-2 mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-md flex items-center justify-center shadow-sm">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h4 className="text-base font-bold text-gray-800">Scholarship Information</h4>
                    </div>
                    
                    {selectedUserScholarship && selectedUserScholarship.has_scholarship ? (
                      <div className="group bg-gradient-to-r from-white to-yellow-50 border border-yellow-200 rounded-md p-4 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Scholarship Status */}
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <h5 className="font-semibold text-gray-800 text-sm mb-1">Status</h5>
                              <p className="text-yellow-600 text-xs mb-2">Scholarship active</p>
                              <div className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-green-100 to-green-200 rounded-lg border border-green-300">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                                <span className="text-green-800 font-semibold text-sm">Active Scholarship</span>
                              </div>
                            </div>
                          </div>

                          {/* Scholarship Period */}
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h8m-8 0H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <h5 className="font-semibold text-gray-800 text-sm mb-1">Period</h5>
                              <p className="text-yellow-600 text-xs mb-2">Valid duration</p>
                              <p className="text-lg font-bold text-gray-800">{selectedUserScholarship.scholarship_period}</p>
                            </div>
                          </div>

                          {/* School Year */}
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <h5 className="font-semibold text-gray-800 text-sm mb-1">School Year</h5>
                              <p className="text-yellow-600 text-xs mb-2">Academic year</p>
                              <p className="text-lg font-bold text-gray-800">{selectedUserScholarship.school_year}</p>
                            </div>
                          </div>

                          {/* Scholarship Amount */}
                          {selectedUserScholarship.amount && (
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-800 text-sm mb-1">Amount</h5>
                                <p className="text-yellow-600 text-xs mb-2">Scholarship value</p>
                                <p className="text-lg font-bold text-gray-800">₱{parseFloat(selectedUserScholarship.amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Notes Section */}
                        {selectedUserScholarship.notes && (
                          <div className="mt-4 pt-4 border-t border-yellow-200">
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-md flex items-center justify-center flex-shrink-0">
                                <svg className="w-3 h-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-800 text-sm mb-1">Additional Notes</h5>
                                <p className="text-yellow-600 text-xs mb-2">Scholarship details</p>
                                <div className="bg-gradient-to-r from-gray-50 to-yellow-50 rounded-md p-3 border border-yellow-100">
                                  <p className="text-gray-800 leading-relaxed text-sm">{selectedUserScholarship.notes}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="group bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-md p-4 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h5 className="font-semibold text-gray-800 text-sm mb-1">No Scholarship</h5>
                            <p className="text-gray-500 text-sm">This faculty member does not currently have an active scholarship.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Footer */}
            <div className="bg-gradient-to-r from-gray-100 via-white to-gray-100 px-6 py-4 border-t border-gray-200">
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={generateUserPDF}
                  disabled={isGeneratingPDF}
                  className={`group relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300 flex items-center gap-2 border border-blue-500 ${isGeneratingPDF ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl hover:scale-105'}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  {isGeneratingPDF ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  )}
                  <span className="relative z-10">{isGeneratingPDF ? 'Generating PDF...' : 'Print PDF'}</span>
                  {!isGeneratingPDF && <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInfoModal(false);
                    setSelectedUserInfo(null);
                  }}
                  className="group relative overflow-hidden bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 border border-red-500"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="relative z-10">Close Profile</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {showArchiveConfirm && userToModify && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl overflow-hidden max-w-md w-full transform transition-all duration-300 scale-100 animate-slideUp">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white">Archive User</h2>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to archive <span className="font-bold text-orange-600">{userToModify.name}</span>? 
                This action will move them to the archived users list.
              </p>
              
              <div className="flex gap-3 justify-center mt-6">
                <button
                  onClick={() => {
                    setShowArchiveConfirm(false);
                    setUserToModify(null);
                  }}
                  className="px-6 py-2.5 bg-white/70 backdrop-blur-md border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-white/90 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleArchiveUser(userToModify.id, userToModify.name);
                    setShowArchiveConfirm(false);
                    setUserToModify(null);
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  Archive User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Confirmation Modal */}
      {showStatusConfirm && userToModify && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl overflow-hidden max-w-md w-full transform transition-all duration-300 scale-100 animate-slideUp">
            <div className={`px-6 py-4 ${userToModify.status === "Active" ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-green-600 to-green-700'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white">
                  {userToModify.status === "Active" ? "Deactivate" : "Activate"} User
                </h2>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to {userToModify.status === "Active" ? "deactivate" : "activate"} <span className="font-bold text-red-600">{userToModify.name}</span>?
              </p>
              
              <div className="flex gap-3 justify-center mt-6">
                <button
                  onClick={() => {
                    setShowStatusConfirm(false);
                    setUserToModify(null);
                  }}
                  className="px-6 py-2.5 bg-white/70 backdrop-blur-md border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-white/90 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleToggleStatus(userToModify.id, userToModify.status);
                    setShowStatusConfirm(false);
                    setUserToModify(null);
                  }}
                  className={`px-6 py-2.5 bg-gradient-to-r text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${userToModify.status === "Active" ? 'from-red-600 to-red-700' : 'from-green-600 to-green-700'}`}
                >
                  {userToModify.status === "Active" ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
