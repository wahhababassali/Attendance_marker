import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getTodayAttendance } from "../../firebase/service";

export default function Confirm() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    indexNumber: '',
    profileImage: null
  });
  const [lastAttendance, setLastAttendance] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Background image URL
  const backgroundImage = "https://atu.edu.gh/wp-content/uploads/2024/07/2L4A8614-1-1536x1024.jpg";

  useEffect(() => {
    const loadAttendance = async () => {
      // Try to get from Firebase first
      const attendance = await getTodayAttendance();
      
      if (attendance.length > 0) {
        // Get the most recent attendance
        const latest = attendance[0];
        setLastAttendance(latest);
        setFormData({
          name: latest.name || '',
          indexNumber: latest.indexNumber || '',
          profileImage: latest.profileImage || null
        });
        if (latest.profileImage) {
          setImagePreview(latest.profileImage);
        }
      } else {
        // Fallback to localStorage
        const savedAttendance = localStorage.getItem('attendanceRecords');
        if (savedAttendance) {
          const records = JSON.parse(savedAttendance);
          if (records.length > 0) {
            const latest = records[records.length - 1];
            setLastAttendance(latest);
            setFormData({
              name: latest.name || '',
              indexNumber: latest.indexNumber || '',
              profileImage: latest.profileImage || null
            });
            if (latest.profileImage) {
              setImagePreview(latest.profileImage);
            }
          }
        }
        
        // Load student data
        const savedData = localStorage.getItem('studentData');
        if (savedData && !lastAttendance) {
          const parsed = JSON.parse(savedData);
          setFormData(parsed);
          if (parsed.profileImage) {
            setImagePreview(parsed.profileImage);
          }
        }
      }
    };
    
    loadAttendance();
  }, []);

  const handleSave = () => {
    // Update saved student data
    localStorage.setItem('studentData', JSON.stringify(formData));
    setIsEditing(false);
  };

  // Handle profile image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setImagePreview(base64String);
        setFormData(prev => ({ ...prev, profileImage: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Helper function to convert Firebase timestamp
  const getTimestamp = (timestamp) => {
    if (!timestamp) return new Date();
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    }
    return new Date(timestamp);
  };

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      ></div>
      
      {/* Dark Overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm"></div>
      
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 min-h-screen p-4 flex items-center justify-center">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500/30 to-green-600/20 rounded-2xl mb-4 border border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.3)] backdrop-blur-sm">
              <span className="material-symbols-outlined text-green-300 text-4xl">check_circle</span>
            </div>
            <h1 className="text-4xl font-display font-bold text-white mb-2">
              <span className="gold-gradient-text">Attendance</span> Confirmed
            </h1>
            <p className="text-slate-300 text-sm">Your attendance has been recorded successfully</p>
          </div>

          {/* Success Card */}
          <div className="premium-card backdrop-blur-xl bg-black/40 rounded-3xl p-6 md:p-8 border border-gold-500/30 shadow-2xl">
            {/* Success Message */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/10 rounded-full mb-4 border border-green-500/30">
                <span className="material-symbols-outlined text-green-300 text-5xl">done_all</span>
              </div>
              <p className="text-green-400 font-semibold text-lg">You're marked as Present!</p>
              <p className="text-slate-300 text-sm mt-1">Great job! You've successfully marked your attendance</p>
            </div>

            {/* Attendance Details */}
            {lastAttendance && (
              <div className="mb-6 p-5 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-sm">
                <h3 className="text-sm font-medium text-gold-400 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">event</span>
                  Session Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-slate-300">Course</span>
                    <span className="text-white font-medium">{lastAttendance.courseTitle}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-slate-300">Course Code</span>
                    <span className="text-white font-medium">{lastAttendance.courseCode}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-slate-300">Program</span>
                    <span className="text-white">{lastAttendance.program}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-slate-300">Time</span>
                    <span className="text-white">{getTimestamp(lastAttendance.timestamp).toLocaleTimeString()}</span>
                  </div>
                  
                  {/* DISTANCE STATUS - ADDED */}
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-slate-300">Your Distance</span>
                    <span className="text-white font-mono">{lastAttendance.distance}m</span>
                  </div>
                  
                  {/* SIMPLE RADIUS STATUS */}
                  <div className="mt-3 pt-2">
                    <div className={`flex items-center gap-2 p-3 rounded-lg ${
                      lastAttendance.distance <= 50 
                        ? 'bg-green-500/20 border border-green-500/40' 
                        : lastAttendance.distance <= 80
                          ? 'bg-yellow-500/20 border border-yellow-500/40'
                          : 'bg-green-500/20 border border-green-500/40'
                    }`}>
                      <span className={`material-symbols-outlined ${
                        lastAttendance.distance <= 50 
                          ? 'text-green-400' 
                          : lastAttendance.distance <= 80
                            ? 'text-yellow-400'
                            : 'text-green-400'
                      }`}>
                        {lastAttendance.distance <= 50 ? 'check_circle' : 'info'}
                      </span>
                      <span className={`text-sm ${
                        lastAttendance.distance <= 50 
                          ? 'text-green-400' 
                          : lastAttendance.distance <= 80
                            ? 'text-yellow-400'
                            : 'text-green-400'
                      }`}>
                        {lastAttendance.distance <= 50 
                          ? '✅ Within standard range' 
                          : lastAttendance.distance <= 80
                            ? '📍 Getting close to limit'
                            : '✅ Within large class range'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Student Profile Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gold-400 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">person</span>
                  Your Profile
                </h3>
                <button
                  onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                  className="text-sm text-gold-400 hover:text-gold-300 flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">
                    {isEditing ? 'save' : 'edit'}
                  </span>
                  {isEditing ? 'Save' : 'Edit'}
                </button>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  {/* Profile Picture in Edit Mode */}
                  <div className="flex flex-col items-center mb-4">
                    <div className="relative group">
                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gold-500/50 shadow-[0_0_20px_rgba(201,162,39,0.3)]">
                        {imagePreview ? (
                          <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-slate-700/80 to-slate-800/80 flex items-center justify-center">
                            <span className="material-symbols-outlined text-slate-400 text-3xl">person</span>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={triggerFileInput}
                        className="absolute bottom-0 right-0 w-7 h-7 bg-gradient-to-r from-gold-500 to-amber-500 rounded-full flex items-center justify-center text-premium-dark shadow-lg hover:scale-110 transition-transform"
                      >
                        <span className="material-symbols-outlined text-base">camera_alt</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500/30 transition-all backdrop-blur-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Index Number</label>
                    <input
                      type="text"
                      name="indexNumber"
                      value={formData.indexNumber}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500/30 transition-all backdrop-blur-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-sm">
                  <div className="flex items-start gap-4">
                    {/* Profile Picture Display */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gold-500/50 shadow-[0_0_15px_rgba(201,162,39,0.2)]">
                        {imagePreview ? (
                          <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-slate-700/80 to-slate-800/80 flex items-center justify-center">
                            <span className="material-symbols-outlined text-slate-400 text-2xl">person</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gold-400">person</span>
                        <span className="text-white font-medium">{formData.name || 'Not set'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gold-400">badge</span>
                        <span className="text-white font-mono">{formData.indexNumber || 'Not set'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => navigate('/')}
                className="w-full gold-button py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">add</span>
                Mark Another Attendance
              </button>
              
              <button
                onClick={() => {
                  localStorage.removeItem('studentData');
                  navigate('/');
                }}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-slate-200 font-medium py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
              >
                <span className="material-symbols-outlined">logout</span>
                Clear My Info
              </button>
            </div>

            {/* Note */}
            <p className="text-xs text-slate-400 text-center mt-4">
              Your information is saved for quick auto-fill in future sessions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
