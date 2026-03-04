import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllAttendance } from '../../firebase/service';

const Print = () => {
  const navigate = useNavigate();
  const [attendanceList, setAttendanceList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [sessions, setSessions] = useState([]);

  // Load attendance on mount
  useEffect(() => {
    const loadAttendance = async () => {
      // Try Firebase first
      const records = await getAllAttendance();
      
      if (records.length > 0) {
        // Convert Firebase timestamps and sort
        const processedRecords = records.map(record => ({
          ...record,
          timestamp: record.timestamp?.seconds 
            ? new Date(record.timestamp.seconds * 1000)
            : new Date(record.timestamp || Date.now())
        }));
        
        // Sort by timestamp (newest first)
        processedRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setAttendanceList(processedRecords);
        setFilteredList(processedRecords);
        
        // Get unique sessions
        const uniqueSessions = [];
        const seen = new Set();
        processedRecords.forEach(record => {
          const sessionKey = `${record.courseCode}-${record.sessionCode}`;
          if (!seen.has(sessionKey)) {
            seen.add(sessionKey);
            uniqueSessions.push({
              courseTitle: record.courseTitle,
              courseCode: record.courseCode,
              program: record.program,
              sessionCode: record.sessionCode,
              date: new Date(record.timestamp).toLocaleDateString()
            });
          }
        });
        setSessions(uniqueSessions);
      } else {
        // Fallback to localStorage
        const savedAttendance = localStorage.getItem('attendanceRecords');
        if (savedAttendance) {
          const records = JSON.parse(savedAttendance);
          records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          setAttendanceList(records);
          setFilteredList(records);
          
          // Get unique sessions
          const uniqueSessions = [];
          const seen = new Set();
          records.forEach(record => {
            const sessionKey = `${record.courseCode}-${record.sessionCode}`;
            if (!seen.has(sessionKey)) {
              seen.add(sessionKey);
              uniqueSessions.push({
                courseTitle: record.courseTitle,
                courseCode: record.courseCode,
                program: record.program,
                sessionCode: record.sessionCode,
                date: new Date(record.timestamp).toLocaleDateString()
              });
            }
          });
          setSessions(uniqueSessions);
        }
      }
    };
    
    loadAttendance();
  }, []);

  // Filter attendance
  useEffect(() => {
    let filtered = attendanceList;
    
    if (searchTerm) {
      filtered = filtered.filter(record => 
        (record.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.indexNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (courseFilter) {
      filtered = filtered.filter(record => record.sessionCode === courseFilter);
    }
    
    setFilteredList(filtered);
  }, [searchTerm, courseFilter, attendanceList]);

  // Get selected session info
  const selectedSessionInfo = sessions.find(s => s.sessionCode === courseFilter);

  // Download PDF
  const downloadPDF = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Course Info Header
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text('Attendance Report', 14, 20);
    
    if (selectedSessionInfo) {
      doc.setFontSize(12);
      doc.setTextColor(60, 60, 60);
      doc.text(`Course: ${selectedSessionInfo.courseTitle}`, 14, 30);
      doc.text(`Course Code: ${selectedSessionInfo.courseCode}`, 14, 36);
      doc.text(`Program: ${selectedSessionInfo.program}`, 14, 42);
      doc.text(`Date: ${selectedSessionInfo.date}`, 14, 48);
      doc.text(`Session Code: ${selectedSessionInfo.sessionCode}`, 14, 54);
    }
    
    // Summary
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const summaryY = selectedSessionInfo ? 65 : 35;
    doc.text(`Total Students: ${filteredList.length}`, 14, summaryY);
    doc.text(`Present: ${filteredList.filter(r => r.status === 'Present').length}`, 14, summaryY + 6);
    doc.text(`Absent: ${filteredList.length - filteredList.filter(r => r.status === 'Present').length}`, 14, summaryY + 12);

    // Table data
    const tableData = filteredList.map(record => [
      record.name || 'N/A',
      record.indexNumber || 'N/A',
      record.courseTitle || '-',
      record.status === 'Present' ? 'Present' : 'Absent'
    ]);

    // Generate table
    doc.autoTable({
      head: [['Name', 'Index Number', 'Course Title', 'Status']],
      body: tableData,
      startY: summaryY + 20,
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
      // Color coding for status
      didParseCell: function(data) {
        if (data.column.index === 3 && data.section === 'body') {
          if (data.cell.raw === 'Present') {
            data.cell.styles.textColor = [34, 197, 94];
          } else {
            data.cell.styles.textColor = [239, 68, 68];
          }
        }
      }
    });

    // Save
    doc.save(`attendance_${courseFilter || 'report'}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Refresh from Firebase
  const refreshData = async () => {
    const records = await getAllAttendance();
    
    if (records.length > 0) {
      const processedRecords = records.map(record => ({
        ...record,
        timestamp: record.timestamp?.seconds 
          ? new Date(record.timestamp.seconds * 1000)
          : new Date(record.timestamp || Date.now())
      }));
      
      processedRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setAttendanceList(processedRecords);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-premium-dark via-slate-900 to-premium-dark premium-pattern">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-premium-dark/80 backdrop-blur-xl border-b border-gold-500/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/admin/dashboard')}
              className="p-2 hover:bg-gold-500/10 rounded-lg transition-colors border border-transparent hover:border-gold-500/30"
            >
              <span className="material-symbols-outlined text-gold-400">arrow_back</span>
            </button>
            <div className="w-12 h-12 bg-gradient-to-br from-gold-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-gold-500/30">
              <span className="material-symbols-outlined text-premium-dark text-2xl">description</span>
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-white">
                <span className="gold-gradient-text">Attendance</span> Records
              </h1>
              <p className="text-xs text-slate-400">View and download attendance</p>
            </div>
          </div>
          <button
            onClick={downloadPDF}
            disabled={filteredList.length === 0}
            className="gold-button disabled:from-slate-600 disabled:to-slate-700 disabled:shadow-none text-premium-dark font-medium py-2.5 px-5 rounded-xl transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined">download</span>
            Download PDF
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Course Info Card */}
        {selectedSessionInfo && (
          <div className="premium-card backdrop-blur-xl rounded-2xl p-6 border border-gold-500/20 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-gold-400">school</span>
              <h2 className="text-lg font-semibold text-white">Session Details</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">Course Title</p>
                <p className="text-white font-medium">{selectedSessionInfo.courseTitle}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Course Code</p>
                <p className="text-white font-medium">{selectedSessionInfo.courseCode}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Program</p>
                <p className="text-white font-medium">{selectedSessionInfo.program}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Date</p>
                <p className="text-white font-medium">{selectedSessionInfo.date}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Session Code</p>
                <p className="text-white font-medium font-mono">{selectedSessionInfo.sessionCode}</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="premium-card backdrop-blur-xl rounded-2xl p-4 border border-gold-500/20 mb-6">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <span className="material-symbols-outlined">search</span>
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or index number..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500/30 transition-all"
                />
              </div>
            </div>

            {/* Session Filter */}
            <div className="min-w-[200px]">
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500/30 transition-all"
              >
                <option value="" className="bg-slate-800">All Sessions</option>
                {sessions.map((session, idx) => (
                  <option key={idx} value={session.sessionCode} className="bg-slate-800">
                    {session.courseCode} - {session.date}
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh */}
            <button
              onClick={refreshData}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-colors flex items-center gap-2 hover:border-gold-500/30"
            >
              <span className="material-symbols-outlined">refresh</span>
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="premium-card backdrop-blur-xl rounded-2xl p-4 border border-gold-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gold-500/20 rounded-lg">
                <span className="material-symbols-outlined text-gold-400">groups</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{filteredList.length}</p>
                <p className="text-sm text-slate-400">Total Students</p>
              </div>
            </div>
          </div>
          <div className="premium-card backdrop-blur-xl rounded-2xl p-4 border border-green-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <span className="material-symbols-outlined text-green-400">check_circle</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{filteredList.filter(r => r.status === 'Present').length}</p>
                <p className="text-sm text-slate-400">Present</p>
              </div>
            </div>
          </div>
          <div className="premium-card backdrop-blur-xl rounded-2xl p-4 border border-red-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <span className="material-symbols-outlined text-red-400">cancel</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{filteredList.length - filteredList.filter(r => r.status === 'Present').length}</p>
                <p className="text-sm text-slate-400">Absent</p>
              </div>
            </div>
          </div>
          <div className="premium-card backdrop-blur-xl rounded-2xl p-4 border border-gold-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gold-500/20 rounded-lg">
                <span className="material-symbols-outlined text-gold-400">percentage</span>
              </div>
              <div>
                <p className="text-2xl font-bold gold-gradient-text">
                  {filteredList.length > 0 
                    ? Math.round((filteredList.filter(r => r.status === 'Present').length / filteredList.length) * 100)
                    : 0}%
                </p>
                <p className="text-sm text-slate-400">Attendance Rate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Table */}
        <div className="premium-card backdrop-blur-xl rounded-2xl border border-gold-500/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-gold-500/10 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-gold-400">preview</span>
              Preview Table
            </h3>
            <span className="text-sm text-slate-400">
              {filteredList.length} student(s)
            </span>
          </div>
          
          {filteredList.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
                <span className="material-symbols-outlined text-slate-500 text-4xl">assignment</span>
              </div>
              <p className="text-slate-400 text-lg">No attendance records found</p>
              <p className="text-slate-500 text-sm mt-1">Start a session to capture attendance</p>
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="mt-4 gold-button text-premium-dark font-medium py-2 px-4 rounded-lg transition-all"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/5 border-b border-gold-500/10">
                    <th className="text-left text-xs font-medium text-gold-400 uppercase tracking-wider px-6 py-4">Profile</th>
                    <th className="text-left text-xs font-medium text-gold-400 uppercase tracking-wider px-6 py-4">Name</th>
                    <th className="text-left text-xs font-medium text-gold-400 uppercase tracking-wider px-6 py-4">Index Number</th>
                    <th className="text-left text-xs font-medium text-gold-400 uppercase tracking-wider px-6 py-4">Course Title</th>
                    <th className="text-left text-xs font-medium text-gold-400 uppercase tracking-wider px-6 py-4">Course Code</th>
                    <th className="text-left text-xs font-medium text-gold-400 uppercase tracking-wider px-6 py-4">Timestamp</th>
                    <th className="text-left text-xs font-medium text-gold-400 uppercase tracking-wider px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredList.map((record, index) => (
                    <tr key={index} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-gold-500/30">
                          {record.profileImage ? (
                            <img src={record.profileImage} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                              <span className="material-symbols-outlined text-slate-500 text-sm">person</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-white font-medium">{record.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-slate-300 font-mono">{record.indexNumber || 'N/A'}</td>
                      <td className="px-6 py-4 text-slate-300">{record.courseTitle || '-'}</td>
                      <td className="px-6 py-4 text-slate-300 font-medium">{record.courseCode || '-'}</td>
                      <td className="px-6 py-4 text-slate-400 text-sm">
                        <div>{new Date(record.timestamp).toLocaleDateString()}</div>
                        <div className="text-xs">{new Date(record.timestamp).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        {record.status === 'Present' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full border border-green-500/30">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                            Present
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded-full border border-red-500/30">
                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                            Absent
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Print;
