// src/components/Settings/Settings.tsx
import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../../utils/supabase';
import toast from 'react-hot-toast';
import Cropper from 'react-easy-crop';

type Point = { x: number; y: number };
type Area = { width: number; height: number; x: number; y: number };

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedData: { name: string; profile_picture: string }) => void;
}

interface UserData {
  name: string;
  email: string;
  age: number | null;
  gender: string;
  address: string;
  contact_no: string;
  positions: string;
  profile_picture: string;
}

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, onUpdate }) => {
  const [userData, setUserData] = useState<UserData>({
    name: '',
    email: '',
    age: null,
    gender: '',
    address: '',
    contact_no: '',
    positions: '',
    profile_picture: ''
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUserData();
    }
  }, [isOpen]);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', user.id)
          .single();

        if (data && !error) {
          setUserData({
            name: data.name || '',
            email: user.email || '',
            age: data.age,
            gender: data.gender || '',
            address: data.address || '',
            contact_no: data.contact_no || '',
            positions: data.positions || '',
            profile_picture: data.profile_picture || ''
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user data');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: name === 'age' ? (value ? parseInt(value) : null) : value
    }));
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        }
      }, 'image/jpeg', 0.95);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Read the file and show cropper
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImageSrc(reader.result as string);
      setShowCropper(true);
    });
    reader.readAsDataURL(file);
  };

  const handleCropSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setUploading(true);
    setShowCropper(false);

    try {
      // Get cropped image blob
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      console.log('[Settings] Starting file upload:', {
        fileSize: croppedImageBlob.size,
        fileType: croppedImageBlob.type,
        userId: user.id
      });

      // Check if bucket exists first
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      console.log('[Settings] Available buckets:', buckets);
      
      if (bucketError) {
        console.error('[Settings] Error listing buckets:', bucketError);
        throw new Error('Cannot access storage buckets');
      }

      const profileBucket = buckets?.find(bucket => bucket.id === 'profile-pictures');
      if (!profileBucket) {
        console.error('[Settings] Profile pictures bucket not found');
        throw new Error('Profile pictures storage not configured');
      }

      const fileName = `${user.id}-${Date.now()}.jpg`;
      const filePath = `${fileName}`; // Simplified path without subfolder

      console.log('[Settings] Uploading to path:', filePath);

      // Try uploading with upsert to overwrite existing files
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, croppedImageBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg'
        });

      console.log('[Settings] Upload result:', { uploadData, uploadError });

      if (uploadError) {
        console.error('[Settings] Storage upload error:', uploadError);
        // Try alternative upload method
        console.log('[Settings] Trying alternative upload method...');
        
        const { data: retryData, error: retryError } = await supabase.storage
          .from('profile-pictures')
          .upload(filePath, croppedImageBlob, { 
            upsert: true,
            contentType: 'image/jpeg'
          });
          
        if (retryError) {
          throw retryError;
        }
        console.log('[Settings] Retry upload successful:', retryData);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      console.log('[Settings] Generated public URL:', publicUrl);

      setUserData(prev => ({
        ...prev,
        profile_picture: publicUrl
      }));

      toast.success('Profile picture uploaded successfully! Click "Update Profile" to save changes.');
      setImageSrc(null);
    } catch (error: any) {
      console.error('[Settings] Error uploading file:', error);
      setShowCropper(false);
      setImageSrc(null);
      
      // Provide more specific error messages
      if (error.message?.includes('storage') || error.message?.includes('bucket')) {
        toast.error('Storage not configured properly. Please run the SQL fix script.');
      } else if (error.message?.includes('permission') || error.message?.includes('policy')) {
        toast.error('Storage permission denied. Please run the SQL fix script.');
      } else if (error.message?.includes('not found')) {
        toast.error('Storage bucket not found. Please run the SQL fix script.');
      } else {
        toast.error(`Failed to upload profile picture: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      console.log('[Settings] Attempting to update user profile:', {
        auth_id: user.id,
        email: user.email,
        updateData: {
          name: userData.name,
          age: userData.age,
          gender: userData.gender,
          address: userData.address,
          contact_no: userData.contact_no,
          positions: userData.positions,
          profile_picture: userData.profile_picture
        }
      });

      // First, check if user exists in users table
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, auth_id, email')
        .eq('auth_id', user.id)
        .single();

      console.log('[Settings] Existing user check:', { existingUser, checkError });

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('[Settings] Error checking existing user:', checkError);
        throw checkError;
      }

      if (!existingUser) {
        // Try to find user by email as fallback
        const { data: userByEmail, error: emailError } = await supabase
          .from('users')
          .select('id, auth_id, email')
          .eq('email', user.email)
          .single();

        console.log('[Settings] User by email check:', { userByEmail, emailError });

        if (userByEmail) {
          // Update the auth_id for this user
          const { error: authUpdateError } = await supabase
            .from('users')
            .update({ auth_id: user.id })
            .eq('email', user.email);

          if (authUpdateError) {
            console.error('[Settings] Error updating auth_id:', authUpdateError);
            throw authUpdateError;
          }
          console.log('[Settings] Updated auth_id for user found by email');
        } else {
          throw new Error('User record not found in database. Please contact administrator.');
        }
      }

      // Now perform the update
      const updateData = {
        name: userData.name || null,
        age: userData.age || null,
        gender: userData.gender || null,
        address: userData.address || null,
        contact_no: userData.contact_no || null,
        positions: userData.positions || null,
        profile_picture: userData.profile_picture || null
      };

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('auth_id', user.id)
        .select();

      console.log('[Settings] Update result:', { data, error });

      if (error) {
        console.error('[Settings] Database update error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('[Settings] No rows updated - trying alternative update method');
        
        // Try updating by email as fallback
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('users')
          .update(updateData)
          .eq('email', user.email)
          .select();

        if (fallbackError || !fallbackData || fallbackData.length === 0) {
          throw new Error('Failed to update user profile. Please contact administrator.');
        }
        
        console.log('[Settings] Fallback update successful:', fallbackData[0]);
      }

      console.log('[Settings] Profile updated successfully:', data?.[0] || 'via fallback');

      // Call the onUpdate callback to refresh the navbar
      onUpdate({
        name: userData.name,
        profile_picture: userData.profile_picture
      });

      toast.success('Profile updated successfully!');
      onClose();
    } catch (error: any) {
      console.error('[Settings] Error updating profile:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('RLS') || error.message?.includes('policy')) {
        toast.error('Permission denied. Please run the SQL fix script and try again.');
      } else if (error.message?.includes('auth_id')) {
        toast.error('Authentication issue. Please try logging out and back in.');
      } else if (error.message?.includes('not found') || error.message?.includes('contact administrator')) {
        toast.error('User profile not found. Please contact administrator.');
      } else if (error.message?.includes('column') || error.message?.includes('does not exist')) {
        toast.error('Database schema issue. Please run the SQL fix script.');
      } else {
        toast.error(`Failed to update profile: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200/50">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-red-900 via-red-800 to-red-900 p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Profile Settings</h2>
                <p className="text-white/70 text-sm">Manage your personal information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-all duration-300 group"
            >
              <svg className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center space-y-6 bg-gradient-to-br from-red-50 to-red-100/50 rounded-2xl p-6 border border-red-200/50">
            <div className="relative">
              {userData.profile_picture ? (
                <img
                  src={userData.profile_picture}
                  alt="Profile"
                  className="w-28 h-28 rounded-full object-cover ring-4 ring-red-200 shadow-xl"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center ring-4 ring-red-200 shadow-xl">
                  <span className="text-white text-3xl font-bold">
                    {userData.name ? userData.name.charAt(0).toUpperCase() : userData.email.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-red-900/60 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-red-600 rounded-full border-3 border-white shadow-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <div className="w-full max-w-sm">
              <label className="block text-sm font-semibold text-red-800 mb-3 text-center">
                Update Profile Picture
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="block w-full text-sm text-red-700 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700 file:shadow-lg file:transition-all file:duration-300 disabled:opacity-50 cursor-pointer"
                />
              </div>
              <p className="text-xs text-red-600 mt-2 text-center">Maximum file size: 5MB • Supported: JPG, PNG, GIF</p>
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white rounded-2xl p-6 border border-red-100 shadow-sm">
            <h3 className="text-lg font-semibold text-red-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-red-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={userData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border-2 border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-red-50/50"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-red-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={userData.email}
                  disabled
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-100 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-red-700 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  name="age"
                  value={userData.age || ''}
                  onChange={handleInputChange}
                  min="18"
                  max="100"
                  className="w-full px-4 py-3 border-2 border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-red-50/50"
                  placeholder="Enter your age"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-red-700 mb-2">
                  Gender
                </label>
                <select
                  name="gender"
                  value={userData.gender}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-red-50/50"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-red-700 mb-2">
                  Contact Number
                </label>
                <input
                  type="tel"
                  name="contact_no"
                  value={userData.contact_no}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-red-50/50"
                  placeholder="Enter your contact number"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-red-700 mb-2">
                  Position
                </label>
                <input
                  type="text"
                  name="positions"
                  value={userData.positions}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-red-50/50"
                  placeholder="Enter your position"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-semibold text-red-700 mb-2">
                Address
              </label>
              <textarea
                name="address"
                value={userData.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 border-2 border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-red-50/50 resize-none"
                placeholder="Enter your complete address"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center items-center space-x-4 pt-8">
            <button
              type="button"
              onClick={onClose}
              className="group relative overflow-hidden px-8 py-4 border-2 border-red-300 text-red-700 rounded-2xl hover:bg-red-50 transition-all duration-300 font-semibold min-w-[140px] shadow-lg hover:shadow-xl"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </span>
            </button>
            <button
              type="submit"
              disabled={loading}
              className="group relative overflow-hidden px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl hover:from-red-700 hover:to-red-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold min-w-[140px] shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Update Profile
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        </form>
      </div>

      {/* Image Cropper Modal */}
      {showCropper && imageSrc && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col">
          <div className="flex-1 relative">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          
          {/* Cropper Controls */}
          <div className="bg-gradient-to-r from-red-900 via-red-800 to-red-900 p-6 space-y-4">
            <div className="max-w-md mx-auto">
              <label className="block text-white text-sm font-semibold mb-2">Zoom</label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
            
            <div className="flex justify-center items-center space-x-4">
              <button
                onClick={() => {
                  setShowCropper(false);
                  setImageSrc(null);
                }}
                className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300 font-semibold border border-white/30"
              >
                Cancel
              </button>
              <button
                onClick={handleCropSave}
                disabled={uploading}
                className="px-8 py-3 bg-white text-red-900 rounded-xl hover:bg-red-50 transition-all duration-300 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-900"></div>
                    Uploading...
                  </span>
                ) : (
                  'Save & Upload'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
