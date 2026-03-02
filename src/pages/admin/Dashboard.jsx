import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [sessionActive, setSessionActive] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [adminLocation, setAdminLocation] = useState(null);
  const [sessionCode, setSessionCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [program, setProgram] = useState('');
  const [radius, setRadius] = useState(50); // Changed default to 50m
  const [attendanceList, setAttendanceList] = useState([]);
  
  // Course rep info
  const [courseRep, setCourseRep] = useState({
    name: '',
    indexNumber: ''
  });
  
  // Edit profile modal
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', indexNumber: '' });

  // Background image URL
  const backgroundImage = "https://atu.edu.gh/wp-content/uploads/2024/07/2L4A8614-1-1536x1024.jpg";
  
  // School logo URL
  const schoolLogo = "https://atu.edu.gh/wp-content/uploads/2024/07/ATU-LOGO-AUTHENTIC-edit-1536x1470.png";

  // Load course rep data
  useEffect(() => {
    const savedCourseRep = localStorage.getItem('courseRepData');
    if (savedCourseRep) {
      const data = JSON.parse(savedCourseRep);
      setCourseRep(data);
      setEditForm(data);
    }
  }, []);

  // Load existing attendance on mount
  useEffect(() => {
    const savedAttendance = localStorage.getItem('attendanceRecords');
    if (savedAttendance) {
      const records = JSON.parse(savedAttendance);
      const today = new Date().toDateString();
      const todayRecords = records.filter(r => new Date(r.timestamp).toDateString() === today);
      setAttendanceList(todayRecords);
    }
    
    // Check for active session
    const adminData = localStorage.getItem('adminLive');
    if (adminData) {
      const session = JSON.parse(adminData);
      setSessionActive(true);
      setSessionCode(session.sessionCode);
      setCourseTitle(session.courseTitle);
      setCourseCode(session.courseCode);
      setProgram(session.program);
      setRadius(session.radius);
      setAdminLocation({ lat: session.lat, lng: session.lng });
      setLocationStatus('success');
    }
  }, []);

  // Generate random session code automatically
  const generateSessionCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Get admin live location
  const getAdminLocation = () => {
    setLocationStatus('loading');
    
    if (!navigator.geolocation) {
      setLocationStatus('error');
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setAdminLocation(location);
        setLocationStatus('success');
      },
      (error) => {
        setLocationStatus('error');
        alert('Unable to get location. Please enable location access.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Start session
  const startSession = () => {
    if (!courseTitle || !courseCode || !program) {
      alert('Please fill in all course details');
      return;
    }
    if (!adminLocation) {
      alert('Please capture your location first');
      return;
    }
    
    // Auto-generate session code
    const newSessionCode = generateSessionCode();
    setSessionCode(newSessionCode);

    const sessionData = {
      courseTitle,
      courseCode,
      program,
      radius: parseInt(radius),
      lat: adminLocation.lat,
      lng: adminLocation.lng,
      sessionCode: newSessionCode,
      startTime: new Date().toISOString()
    };

    localStorage.setItem('adminLive', JSON.stringify(sessionData));
    setSessionActive(true);
  };

  // End session
  const endSession = () => {
    localStorage.removeItem('adminLive');
    setSessionActive(false);
    setSessionCode('');
    setCourseTitle('');
    setCourseCode('');
    setProgram('');
  };

  // Refresh attendance list
  const refreshAttendance = () => {
    const savedAttendance = localStorage.getItem('attendanceRecords');
    if (savedAttendance) {
      const records = JSON.parse(savedAttendance);
      const today = new Date().toDateString();
      const todayRecords = records.filter(r => new Date(r.timestamp).toDateString() === today);
      // Filter by current session if active
      const filteredRecords = sessionCode 
        ? todayRecords.filter(r => r.sessionCode === sessionCode)
        : todayRecords;
      setAttendanceList(filteredRecords);
    }
  };

  // Update attendance list periodically
  useEffect(() => {
    if (sessionActive) {
      const interval = setInterval(refreshAttendance, 3000);
      return () => clearInterval(interval);
    }
  }, [sessionActive, sessionCode]);

  // Save edited profile
  const saveProfile = () => {
    if (!editForm.name || !editForm.indexNumber) {
      alert('Please fill in all fields');
      return;
    }
    localStorage.setItem('courseRepData', JSON.stringify(editForm));
    setCourseRep(editForm);
    setShowEditProfile(false);
  };

  // Download PDF directly from dashboard
  const downloadPDF = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Course Info Header
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text('Attendance Report', 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(`Course: ${courseTitle}`, 14, 30);
    doc.text(`Course Code: ${courseCode}`, 14, 36);
    doc.text(`Program: ${program}`, 14, 42);
    doc.text(`Session Code: ${sessionCode}`, 14, 48);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 54);
    
    // Summary
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const presentCount = attendanceList.filter(r => r.status === 'Present').length;
    doc.text(`Total Students: ${attendanceList.length}`, 14, 65);
    doc.text(`Present: ${presentCount}`, 14, 71);
    doc.text(`Absent: ${attendanceList.length - presentCount}`, 14, 77);

    // Table data
    const tableData = attendanceList.map(record => [
      record.name,
      record.indexNumber,
      record.className || '-',
      record.status === 'Present' ? 'Present' : 'Absent'
    ]);

    // Generate table
    doc.autoTable({
      head: [['Name', 'Index Number', 'Class', 'Status']],
      body: tableData,
      startY: 85,
      styles: {
        fontSize: 10,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [201, 162, 39],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
    });

    // Save
    doc.save(`attendance_${sessionCode}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Get radius color based on value
  const getRadiusColor = () => {
    if (radius <= 30) return 'text-green-400';
    if (radius <= 60) return 'text-yellow-400';
    return 'text-orange-400';
  };

  // Get radius recommendation
  const getRadiusRecommendation = () => {
    if (radius <= 30) return 'Small classroom';
    if (radius <= 60) return 'Lecture hall';
    return 'Outdoor area';
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

      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-gold-500/30">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Logo */}
              <div className="w-14 h-14 flex items-center justify-center">
                <img 
                  src={schoolLogo} 
                  alt="ATU Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold text-white">
                  <span className="gold-gradient-text">Attendance</span> System
                </h1>
                <p className="text-xs text-slate-300">Admin Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Course Rep Info */}
              {courseRep.name && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 rounded-lg border border-gold-500/30">
                  <div className="w-8 h-8 bg-gradient-to-r from-gold-500 to-amber-500 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-900 text-sm font-bold">
                      {courseRep.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm font-medium">{courseRep.name}</p>
                    <p className="text-gold-400 text-xs font-mono">{courseRep.indexNumber}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setEditForm(courseRep);
                      setShowEditProfile(true);
                    }}
                    className="ml-1 p-1 hover:bg-slate-700 rounded transition-colors"
                    title="Edit profile"
                  >
                    <span className="material-symbols-outlined text-slate-400 text-lg">edit</span>
                  </button>
                </div>
              )}
              {sessionActive && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-full border border-green-500/40">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-sm text-green-400 font-medium">Live</span>
                </div>
              )}
              <button 
                onClick={() => navigate('/admin/print')}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700"
              >
                <span className="material-symbols-outlined text-gold-400">print</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Session Controls */}
            <div className="lg:col-span-1 space-y-6">
              {/* Session Status Card - Darker background for better contrast */}
              <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl p-5 border border-gold-500/30 shadow-2xl">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-gold-400">settings</span>
                  Session Controls
                </h2>

                {!sessionActive ? (
                  <div className="space-y-4">
                    {/* Course Title */}
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">Course Title</label>
                      <input
                        type="text"
                        value={courseTitle}
                        onChange={(e) => setCourseTitle(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500/50 text-sm"
                        placeholder="e.g., Web Development"
                      />
                    </div>

                    {/* Course Code */}
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">Course Code</label>
                      <input
                        type="text"
                        value={courseCode}
                        onChange={(e) => setCourseCode(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500/50 text-sm"
                        placeholder="e.g., CS401"
                      />
                    </div>

                    {/* Program */}
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">Program Name</label>
                      <input
                        type="text"
                        value={program}
                        onChange={(e) => setProgram(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500/50 text-sm"
                        placeholder="e.g., Computer Science"
                      />
                    </div>

                    {/* Enhanced Radius Slider */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-gold-500/20">
                      <label className="block text-sm text-slate-300 mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-gold-400 text-lg">distance</span>
                        <span>Attendance Radius</span>
                      </label>
                      
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs text-slate-500 w-8">10m</span>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          step="5"
                          value={radius}
                          onChange={(e) => setRadius(parseInt(e.target.value))}
                          className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-gold-500"
                        />
                        <span className="text-xs text-slate-500 w-8">100m</span>
                      </div>

                      <div className="flex justify-between items-center mt-2">
                        <div>
                          <span className="text-xs text-slate-400 block">Selected</span>
                          <span className={`text-2xl font-bold ${getRadiusColor()}`}>{radius}m</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block">Recommended for</span>
                          <span className="text-sm text-gold-400">{getRadiusRecommendation()}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-700">
                        <div className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-gold-400 text-sm">info</span>
                          <p className="text-xs text-slate-400">
                            Students must be within <span className="text-gold-400 font-bold">{radius}m</span> of your location to mark attendance
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Location Capture */}
                    <div className="bg-slate-800 rounded-xl p-3 border border-slate-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
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
                            <p className="text-sm font-medium text-white">Your Location</p>
                            <p className="text-xs text-slate-400">
                              {adminLocation 
                                ? `${adminLocation.lat.toFixed(4)}, ${adminLocation.lng.toFixed(4)}` 
                                : 'Not captured'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={getAdminLocation}
                          disabled={locationStatus === 'loading'}
                          className="px-3 py-1.5 bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 disabled:from-slate-600 disabled:to-slate-700 text-slate-900 text-xs font-semibold rounded-lg transition-all"
                        >
                          {locationStatus === 'loading' ? 'Getting...' : 'Capture'}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={startSession}
                      className="w-full gold-button py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-semibold text-slate-900"
                    >
                      <span className="material-symbols-outlined">play_circle</span>
                      Start Session
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Active Session Info */}
                    <div className="p-4 bg-green-500/20 border border-green-500/40 rounded-xl">
                      <div className="flex items-center gap-2 text-green-400 mb-2">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        <span className="font-semibold text-sm">Session Active</span>
                      </div>
                      <p className="text-white font-bold text-lg">{courseTitle}</p>
                      <p className="text-slate-300 text-sm">{courseCode} • {program}</p>
                      
                      {/* Show active radius */}
                      <div className="mt-3 flex items-center gap-2 text-sm">
                        <span className="material-symbols-outlined text-gold-400 text-base">distance</span>
                        <span className="text-slate-300">Radius:</span>
                        <span className="text-gold-400 font-bold">{radius}m</span>
                        <span className="text-xs text-slate-500 ml-auto">{getRadiusRecommendation()}</span>
                      </div>
                    </div>

                    {/* Session Code Display */}
                    <div className="p-4 bg-slate-800 rounded-xl border border-gold-500/30 text-center">
                      <p className="text-xs text-slate-400 mb-2">Share this code with students</p>
                      <p className="text-4xl font-black tracking-[0.3em] gold-gradient-text font-mono bg-gold-500/10 px-4 py-3 rounded-xl border border-gold-500/20">
                        {sessionCode}
                      </p>
                      <p className="text-xs text-slate-500 mt-3 flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-xs">info</span>
                        Students need this code to join
                      </p>
                    </div>

                    <button
                      onClick={endSession}
                      className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      <span className="material-symbols-outlined">stop</span>
                      End Session
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Attendance List */}
            <div className="lg:col-span-2">
              <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl p-5 border border-gold-500/30 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-gold-400">groups</span>
                    Attendance List
                    <span className="ml-2 px-2 py-0.5 bg-gold-500/20 text-gold-400 text-sm rounded-full">
                      {attendanceList.length}
                    </span>
                  </h2>
                  <button
                    onClick={refreshAttendance}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700"
                  >
                    <span className="material-symbols-outlined text-gold-400">refresh</span>
                  </button>
                </div>

                {attendanceList.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-700">
                      <span className="material-symbols-outlined text-slate-500 text-2xl">group_add</span>
                    </div>
                    <p className="text-slate-300">No students have marked attendance yet</p>
                    <p className="text-slate-500 text-xs mt-1">Students will appear here when they join</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left text-xs font-medium text-gold-400 uppercase tracking-wider pb-2">Profile</th>
                          <th className="text-left text-xs font-medium text-gold-400 uppercase tracking-wider pb-2">Name</th>
                          <th className="text-left text-xs font-medium text-gold-400 uppercase tracking-wider pb-2">Index No.</th>
                          <th className="text-left text-xs font-medium text-gold-400 uppercase tracking-wider pb-2">Time</th>
                          <th className="text-left text-xs font-medium text-gold-400 uppercase tracking-wider pb-2">Distance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {attendanceList.map((record, index) => (
                          <tr key={index} className="hover:bg-slate-800/50 transition-colors">
                            <td className="py-2">
                              <div className="w-8 h-8 rounded-full overflow-hidden border border-gold-500/30">
                                {record.profileImage ? (
                                  <img src={record.profileImage} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-slate-400 text-sm">person</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-2 text-white font-medium text-sm">{record.name}</td>
                            <td className="py-2 text-slate-300 font-mono text-sm">{record.indexNumber}</td>
                            <td className="py-2 text-slate-400 text-xs">
                              {new Date(record.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="py-2">
                              <span className={`text-xs font-mono px-2 py-1 rounded ${
                                record.distance <= radius 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {record.distance}m
                                {record.distance <= radius && ' ✅'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => {
                    if (!window.jspdf) {
                      alert('PDF library not loaded. Please refresh the page.');
                      return;
                    }
                    if (attendanceList.length === 0) {
                      alert('No attendance records to download.');
                      return;
                    }
                    downloadPDF();
                  }}
                  className={`flex-1 font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm ${
                    attendanceList.length > 0 
                      ? 'gold-button text-slate-900' 
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <span className="material-symbols-outlined">download</span>
                  Download PDF
                </button>
                <button
                  onClick={() => navigate('/admin/print')}
                  className="flex-1 gold-button text-slate-900 py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  <span className="material-symbols-outlined">preview</span>
                  View All Records
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowEditProfile(false)}></div>
          <div className="relative bg-slate-900 rounded-2xl p-6 border border-gold-500/30 shadow-2xl w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-gold-400">edit</span>
              Edit Profile
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">Your Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500/50"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Index Number</label>
                <input
                  type="text"
                  value={editForm.indexNumber}
                  onChange={(e) => setEditForm({...editForm, indexNumber: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500/50"
                  placeholder="Enter your index number"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditProfile(false)}
                className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveProfile}
                className="flex-1 py-3 px-4 gold-button text-slate-900 font-semibold rounded-xl transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;