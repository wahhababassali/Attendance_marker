// netlify/functions/verify-admin-code.js
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

// Firebase config - same as client app
const firebaseConfig = {
  apiKey: "AIzaSyCE36858RyCF7YAol1JtCY1nCtq3mZhONs",
  authDomain: "attendance-marker-86d42.firebaseapp.com",
  projectId: "attendance-marker-86d42",
  storageBucket: "attendance-marker-86d42.appspot.com",
  messagingSenderId: "115455354307",
  appId: "1:115455354307:web:placeholder"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

exports.handler = async (event) => {
  console.log('🚀 Function started');
  
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ error: 'Method not allowed' }) 
    };
  }

  try {
    // Parse the request body
    console.log('Event body:', event.body);
    const { code, checkSession } = JSON.parse(event.body);
    console.log('Code received:', code);
    console.log('Check session flag:', checkSession);

    // Check if ADMIN_CODES exists
    if (!process.env.ADMIN_CODES) {
      console.error('❌ ADMIN_CODES environment variable is not set');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error - ADMIN_CODES missing' 
        })
      };
    }

    // Parse the codes
    const adminCodes = process.env.ADMIN_CODES.split(',').map(c => c.trim());
    console.log(`✅ Loaded ${adminCodes.length} admin codes`);
    console.log('First 3 codes:', adminCodes.slice(0, 3));

    // Check if code is valid
    const isValid = adminCodes.includes(code.toUpperCase());
    console.log('Code valid?', isValid);

    // If this is a session check request (from student phone)
    if (checkSession) {
      if (isValid) {
        console.log('✅ Session check for code:', code);
        
        // Get session from Firebase
        try {
          const sessionRef = doc(db, 'sessions', code.toUpperCase());
          const sessionSnap = await getDoc(sessionRef);
          
          if (sessionSnap.exists() && sessionSnap.data().active) {
            const sessionData = sessionSnap.data();
            console.log('✅ Session found in Firebase:', sessionData.courseTitle);
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                valid: true,
                sessionInfo: {
                  courseTitle: sessionData.courseTitle,
                  courseCode: sessionData.courseCode,
                  program: sessionData.program,
                  radius: sessionData.radius,
                  lat: sessionData.lat,
                  lng: sessionData.lng,
                  sessionCode: sessionData.sessionCode,
                  active: sessionData.active,
                  startTime: sessionData.startTime
                }
              })
            };
          } else {
            console.log('❌ Session not found or not active');
            return {
              statusCode: 401,
              headers,
              body: JSON.stringify({ 
                valid: false, 
                error: 'Invalid or expired session code' 
              })
            };
          }
        } catch (fbError) {
          console.error('Firebase error:', fbError.message);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              valid: false, 
              error: 'Database error. Please try again.' 
            })
          };
        }
      } else {
        console.log('❌ Invalid session check attempt:', code);
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ 
            valid: false, 
            error: 'Invalid session code' 
          })
        };
      }
    }

    // Regular admin login validation (original functionality)
    if (isValid) {
      // Get validity months
      const validityMonths = parseInt(process.env.CODE_VALIDITY_MONTHS) || 4;
      
      // Calculate expiry
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + validityMonths);
      
      console.log('✅ Login successful, expires:', expiresAt.toISOString());
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          valid: true,
          expiresAt: expiresAt.toISOString()
        })
      };
    } else {
      console.log('❌ Invalid code attempt:', code);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          valid: false, 
          error: 'Invalid access code' 
        })
      };
    }
  } catch (error) {
    console.error('💥 Function error:', error.message);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Server error', 
        details: error.message 
      })
    };
  }
};

