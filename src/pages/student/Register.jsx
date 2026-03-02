import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [sessionCode, setSessionCode] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    indexNumber: '',
    profileImage: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [studentLocation, setStudentLocation] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [sessionInfo, setSessionInfo] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);

  // Background image URL
  const backgroundImage = "https://atu.edu.gh/wp-content/uploads/2024/07/2L4A8614-1-1536x1024.jpg";
  
  // School logo URL
  const schoolLogo = "https://atu.edu.gh/wp-content/uploads/2024/07/ATU-LOGO-AUTHENTIC-edit-1536x1470.png";

  // Get device fingerprint info
  const getDeviceInfo = async () => {
    // Get IP address from a free API
    let ipAddress = 'unknown';
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      ipAddress = data.ip;
    } catch (error) {
      console.log('Could not get IP:', error);
    }

    // Get device info
    const deviceInfo = {
      ipAddress: ipAddress,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: new Date().toISOString()
    };
    
    setDeviceInfo(deviceInfo);
    return deviceInfo;
  };

  // Check if this device has already registered
  const checkDeviceRegistration = (deviceInfo) => {
    const registeredDevices = JSON.parse(localStorage.getItem('registeredDevices') || '[]');
    
    // Check by IP address
    const existingByIP = registeredDevices.find(d => d.ipAddress === deviceInfo.ipAddress);
    if (existingByIP) {
      return { allowed: false, reason: 'ip', existing: existingByIP };
    }
    
    return { allowed: true };
  };

  // Load saved student data on mount
  useEffect(() => {
    const savedData = localStorage.getItem('studentData');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setFormData(parsed);
      if (parsed.profileImage) {
        setImagePreview(parsed.profileImage);
      }
    }
    
    // Get device info on mount
    getDeviceInfo();
  }, []);

  // FIXED: Validate session code when entered - MORE ROBUST VERSION
  useEffect(() => {
    if (sessionCode.length === 6) {
      console.log('🔍 Checking session code:', sessionCode);
      
      const adminData = localStorage.getItem('adminLive');
      console.log('📦 adminLive from localStorage:', adminData);
      
      if (adminData) {
        try {
          const admin = JSON.parse(adminData);
          
          // IMPORTANT: Convert BOTH to uppercase and trim any spaces
          const storedCode = admin.sessionCode?.toString().toUpperCase().trim() || '';
          const enteredCode = sessionCode.toUpperCase().trim();
          
          console.log('🔑 Stored session code:', storedCode);
          console.log('📝 Entered code:', enteredCode);
          console.log('✅ Match?', storedCode === enteredCode);
          
          if (storedCode === enteredCode) {
            setSessionInfo(admin);
            setMessage({ type: 'success', text: `Session found: ${admin.courseTitle}` });
          } else {
            setSessionInfo(null);
            setMessage({ type: 'error', text: 'Invalid session code' });
          }
        } catch (error) {
          console.error('Error parsing admin data:', error);
          setSessionInfo(null);
          setMessage({ type: 'error', text: 'Error reading session data' });
        }
      } else {
        console.log('❌ No active session found');
        setSessionInfo(null);
        setMessage({ type: 'error', text: 'No active session. Please wait for the instructor.' });
      }
    } else {
      // Clear message when code is less than 6 characters
      if (sessionCode.length > 0) {
        setMessage({ type: '', text: '' });
      }
    }
  }, [sessionCode]);

  // Get student location
  const getStudentLocation = () => {
    setLocationStatus('loading');
    
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setMessage({ type: 'error', text: 'Geolocation is not supported by your browser' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setStudentLocation(location);
        setLocationStatus('success');
        setMessage({ type: 'success', text: 'Location captured successfully!' });
      },
      (error) => {
        setLocationStatus('error');
        let errorMessage = 'Unable to get location';
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = 'Location permission denied. Please enable location access.';
        }
        setMessage({ type: 'error', text: errorMessage });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    // First, get fresh device info
    const currentDeviceInfo = await getDeviceInfo();
    
    // Check if this device has already registered
    const deviceCheck = checkDeviceRegistration(currentDeviceInfo);
    
    if (!deviceCheck.allowed) {
      if (deviceCheck.reason === 'ip') {
        setMessage({ 
          type: 'error', 
          text: `This device has already been used to register: ${deviceCheck.existing.name} (${deviceCheck.existing.indexNumber}). Each student can only register once!` 
        });
        setIsSubmitting(false);
        return;
      }
    }

    // Validate all fields
    if (!sessionInfo) {
      setMessage({ type: 'error', text: 'Please enter a valid 6-character session code' });
      setIsSubmitting(false);
      return;
    }

    if (!formData.name || !formData.indexNumber) {
      setMessage({ type: 'error', text: 'Please fill in all your details' });
      setIsSubmitting(false);
      return;
    }

    if (!studentLocation) {
      setMessage({ type: 'error', text: 'Please capture your location first' });
      setIsSubmitting(false);
      return;
    }

    // Calculate distance
    const distance = calculateDistance(
      studentLocation.lat,
      studentLocation.lng,
      sessionInfo.lat,
      sessionInfo.lng
    );

    // Check if within radius
    if (distance <= sessionInfo.radius) {
      // Mark attendance
      const attendance = {
        ...formData,
        courseTitle: sessionInfo.courseTitle,
        courseCode: sessionInfo.courseCode,
        program: sessionInfo.program,
        sessionCode: sessionInfo.sessionCode,
        timestamp: new Date().toISOString(),
        location: studentLocation,
        distance: Math.round(distance),
        status: 'Present',
        deviceInfo: currentDeviceInfo
      };

      // Save attendance
      const existingAttendance = JSON.parse(localStorage.getItem('attendanceRecords') || '[]');
      existingAttendance.push(attendance);
      localStorage.setItem('attendanceRecords', JSON.stringify(existingAttendance));

      // Save device as registered
      const registeredDevices = JSON.parse(localStorage.getItem('registeredDevices') || '[]');
      registeredDevices.push({
        ...currentDeviceInfo,
        name: formData.name,
        indexNumber: formData.indexNumber,
        registeredAt: new Date().toISOString()
      });
      localStorage.setItem('registeredDevices', JSON.stringify(registeredDevices));

      // Save student data for auto-fill
      localStorage.setItem('studentData', JSON.stringify(formData));

      setMessage({ type: 'success', text: `Attendance marked successfully! You are ${Math.round(distance)}m from the instructor.` });
      
      // Navigate to confirm page after a short delay
      setTimeout(() => {
        navigate('/student/confirm');
      }, 1500);
    } else {
      setMessage({ type: 'error', text: `You are ${Math.round(distance)}m away. Must be within ${sessionInfo.radius}m radius to mark attendance.` });
    }

    setIsSubmitting(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      ></div>
      
      {/* Dark Overlay for better contrast */}
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm"></div>

      <div className="relative z-10 min-h-screen p-4 flex items-center justify-center">
        <div className="w-full max-w-md">
          {/* Header with Bigger School Logo */}
          <div className="text-center mb-6 animate-fade-in">
            <div className="inline-flex items-center justify-center w-28 h-28 mb-3">
              <img 
                src={schoolLogo} 
                alt="ATU Logo" 
                className="w-full h-full object-contain drop-shadow-xl"
              />
            </div>
            <h1 className="text-3xl font-display font-bold text-white mb-1">
              Student Registration
            </h1>
            <p className="text-slate-300 text-sm">Enter your details to mark attendance</p>
          </div>

          {/* Dark Theme Form Card */}
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-6 border border-gold-500/30 shadow-2xl">
            {/* Security Notice */}
            <div className="mb-4 p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-amber-400">security</span>
                <p className="text-amber-200 text-xs">
                  Each device can only register once. Device information is captured for security purposes.
                </p>
              </div>
            </div>

            {/* Profile Picture Section */}
            <div className="flex flex-col items-center mb-5">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gold-400/50 shadow-[0_0_20px_rgba(201,162,39,0.3)]">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                      <span className="material-symbols-outlined text-slate-400 text-3xl">person</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={triggerFileInput}
                  className="absolute bottom-0 right-0 w-7 h-7 bg-gradient-to-r from-gold-500 to-amber-500 rounded-full flex items-center justify-center text-slate-900 shadow-lg hover:scale-110 transition-transform"
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

            {/* Session Code */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-gold-400 text-lg">pin</span>
                Session Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  required
                  className="w-full px-6 py-3 bg-slate-800 border border-slate-600 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500/50 transition-all font-mono tracking-[0.4em] text-center text-xl"
                  placeholder="XXXXXX"
                />
              </div>
            </div>

            {/* Session Info Display */}
            {sessionInfo && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-500/40 rounded-xl animate-fade-in">
                <div className="flex items-center gap-2 text-green-400 mb-1">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span className="font-medium text-sm">Session Active</span>
                </div>
                <p className="text-white font-semibold">{sessionInfo.courseTitle}</p>
                <p className="text-slate-400 text-xs">{sessionInfo.courseCode} • {sessionInfo.program}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500/50 transition-all"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Index Number */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Index Number</label>
                <input
                  type="text"
                  name="indexNumber"
                  value={formData.indexNumber}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500/50 transition-all"
                  placeholder="Enter your index number"
                />
              </div>

              {/* Location Capture */}
              <div className="bg-slate-800 rounded-xl p-3 border border-slate-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      locationStatus === 'success' ? 'bg-green-500/30' : 
                      locationStatus === 'error' ? 'bg-red-500/30' : 
                      locationStatus === 'loading' ? 'bg-gold-500/30' : 'bg-slate-700'
                    }`}>
                      <span className={`material-symbols-outlined ${
                        locationStatus === 'success' ? 'text-green-400' : 
                        locationStatus === 'error' ? 'text-red-400' : 
                        locationStatus === 'loading' ? 'text-gold-400' : 'text-slate-400'
                      }`}>location_on</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {studentLocation ? 'Location captured' : 'Capture your location'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {studentLocation 
                          ? `${studentLocation.lat.toFixed(4)}, ${studentLocation.lng.toFixed(4)}` 
                          : 'Required for attendance'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={getStudentLocation}
                    disabled={locationStatus === 'loading'}
                    className="px-4 py-2 bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 disabled:from-slate-600 disabled:to-slate-700 text-slate-900 font-medium rounded-lg transition-all flex items-center gap-1 text-sm"
                  >
                    {locationStatus === 'loading' ? (
                      <span className="animate-spin"><span className="material-symbols-outlined text-base">sync</span></span>
                    ) : (
                      <span className="material-symbols-outlined text-base">my_location</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Message */}
              {message.text && (
                <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                  message.type === 'success' ? 'bg-green-500/20 border border-green-500/40 text-green-400' : 
                  'bg-red-500/20 border border-red-500/40 text-red-400'
                }`}>
                  <span className="material-symbols-outlined text-lg">
                    {message.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  {message.text}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full gold-button disabled:from-slate-600 disabled:to-slate-700 disabled:shadow-none py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 font-semibold text-slate-900"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin">
                      <span className="material-symbols-outlined">sync</span>
                    </span>
                    Processing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">how_to_reg</span>
                    Register & Mark Attendance
                  </>
                )}
              </button>
            </form>

            {/* Admin Link */}
            <div className="text-center mt-4 pt-4 border-t border-slate-700">
              <a href="/admin/login" className="text-sm text-slate-400 hover:text-gold-400 transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                Admin Login
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;