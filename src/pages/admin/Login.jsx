import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Course rep details
  const [courseRepData, setCourseRepData] = useState({
    name: '',
    indexNumber: ''
  });
  const [isNewUser, setIsNewUser] = useState(false);

  // Background image URL
  const backgroundImage = "https://atu.edu.gh/wp-content/uploads/2024/07/2L4A8614-1-1536x1024.jpg";
  
  // School logo URL
  const schoolLogo = "https://atu.edu.gh/wp-content/uploads/2024/07/ATU-LOGO-AUTHENTIC-edit-1536x1470.png";

  // Check if course rep already registered
  useEffect(() => {
    const savedCourseRep = localStorage.getItem('courseRepData');
    if (savedCourseRep) {
      setCourseRepData(JSON.parse(savedCourseRep));
    } else {
      setIsNewUser(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // If new user, save course rep data first
    if (isNewUser) {
      if (!courseRepData.name || !courseRepData.indexNumber) {
        setError('Please enter your name and index number');
        return;
      }
      localStorage.setItem('courseRepData', JSON.stringify(courseRepData));
    }
    
    setIsLoading(true);
    setError('');

    try {
      // Call Netlify Function to verify the code
      const response = await fetch('/.netlify/functions/verify-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code: accessCode.toUpperCase() 
        })
      });

      const data = await response.json();

      if (data.valid) {
        // Valid code - check local expiry (optional, for UI feedback)
        const storedData = localStorage.getItem('adminCodeData');
        const codeData = storedData ? JSON.parse(storedData) : {};
        const codeEntry = codeData[accessCode.toUpperCase()];
        
        // Store session
        localStorage.setItem('adminSession', 'true');
        localStorage.setItem('adminCode', accessCode.toUpperCase());
        
        // Store expiry from server
        if (data.expiresAt) {
          localStorage.setItem('adminExpiresAt', data.expiresAt);
        }
        
        // Initialize code data if not exists (for UI history)
        if (!codeEntry) {
          codeData[accessCode.toUpperCase()] = {
            createdAt: new Date().toISOString(),
            expiresAt: data.expiresAt || new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString() // Fallback ~4 months
          };
          localStorage.setItem('adminCodeData', JSON.stringify(codeData));
        }
        
        navigate('/admin/dashboard');
      } else {
        setError(data.error || 'Invalid access code. Please check your code and try again.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please check your connection and try again.');
      setIsLoading(false);
    }
  };

  const handleCourseRepChange = (e) => {
    setCourseRepData({
      ...courseRepData,
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
              Course Rep Login
            </h1>
            <p className="text-slate-300 text-sm">Enter your details to continue</p>
          </div>

          {/* Dark Theme Login Card */}
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-6 border border-gold-500/30 shadow-2xl">
            
            {/* Course Rep Registration Form (for new users) */}
            {isNewUser && (
              <div className="mb-6 p-4 bg-slate-800/80 rounded-xl border border-gold-500/30">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-gold-400">person</span>
                  Course Rep Profile
                </h3>
                <p className="text-slate-400 text-xs mb-4">Please enter your details. This will be displayed on the dashboard.</p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Your Name</label>
                    <input
                      type="text"
                      name="name"
                      value={courseRepData.name}
                      onChange={handleCourseRepChange}
                      className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Index Number</label>
                    <input
                      type="text"
                      name="indexNumber"
                      value={courseRepData.indexNumber}
                      onChange={handleCourseRepChange}
                      className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm"
                      placeholder="Enter your index number"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Show current user info if returning */}
            {!isNewUser && (
              <div className="mb-6 p-4 bg-slate-800/80 rounded-xl border border-green-500/30">
                <div className="flex items-center gap-2 text-green-400 mb-2">
                  <span className="material-symbols-outlined">check_circle</span>
                  <span className="font-medium">Welcome back!</span>
                </div>
                <p className="text-white font-semibold">{courseRepData.name}</p>
                <p className="text-gold-400 text-sm font-mono">{courseRepData.indexNumber}</p>
                <button 
                  onClick={() => setIsNewUser(true)}
                  className="text-xs text-gold-400 hover:text-gold-300 mt-2 underline"
                >
                  Edit profile
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Access Code Input */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-gold-400">key</span>
                  Access Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    required
                    className="w-full px-6 py-4 bg-slate-800 border border-slate-600 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500/50 transition-all font-mono tracking-[0.3em] text-center text-xl"
                    placeholder="XXXXXXXX"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-3 text-center">
                  Get your 8-character code from your instructor
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  <span className="material-symbols-outlined text-lg">error</span>
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !accessCode}
                className="w-full gold-button disabled:from-slate-600 disabled:to-slate-700 disabled:shadow-none disabled:cursor-not-allowed py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 font-semibold text-slate-900"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin">
                      <span className="material-symbols-outlined">sync</span>
                    </span>
                    Verifying...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">login</span>
                    Access Dashboard
                  </>
                )}
              </button>
            </form>

            {/* Back to Student */}
            <div className="mt-5 text-center pt-5 border-t border-slate-700">
              <a href="/" className="text-sm text-slate-400 hover:text-gold-400 transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-lg">arrow_back</span>
                Back to Student Login
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;