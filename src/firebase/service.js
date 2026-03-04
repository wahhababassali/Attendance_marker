import { db } from './config';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';

// Collection names
const COLLECTIONS = {
  ADMIN_CODES: 'adminCodes',
  SESSIONS: 'sessions',
  ATTENDANCE: 'attendance',
  COURSE_REP: 'courseRep'
};


// Admin Code Functions - Direct Firebase verification
export const verifyAdminCode = async (code) => {
  try {
    // First check localStorage for offline verification
    const savedAdminCode = localStorage.getItem('adminCode');
    const savedExpiry = localStorage.getItem('adminExpiresAt');
    
    if (savedAdminCode && savedAdminCode.toUpperCase() === code.toUpperCase()) {
      if (savedExpiry) {
        const expiresAt = new Date(savedExpiry);
        if (expiresAt < new Date()) {
          return { valid: false, error: 'Code has expired' };
        }
      }
      return { valid: true, expiresAt: savedExpiry };
    }

    // Check Firebase for admin code
    const codeRef = doc(db, COLLECTIONS.ADMIN_CODES, code.toUpperCase());
    const codeSnap = await getDoc(codeRef);
    
    if (codeSnap.exists()) {
      const codeData = codeSnap.data();
      // Check if code is not expired
      if (codeData.expiresAt) {
        const expiresAt = new Date(codeData.expiresAt);
        if (expiresAt < new Date()) {
          return { valid: false, error: 'Code has expired' };
        }
      }
      // Save to localStorage for offline access
      localStorage.setItem('adminCode', code.toUpperCase());
      localStorage.setItem('adminExpiresAt', codeData.expiresAt);
      return { valid: true, ...codeData };
    }
    
    return { valid: false, error: 'Invalid access code' };
  } catch (error) {
    console.error('Error verifying admin code:', error);
    // Fallback: check localStorage on error
    const savedAdminCode = localStorage.getItem('adminCode');
    const savedExpiry = localStorage.getItem('adminExpiresAt');
    
    if (savedAdminCode && savedAdminCode.toUpperCase() === code.toUpperCase()) {
      if (savedExpiry) {
        const expiresAt = new Date(savedExpiry);
        if (expiresAt < new Date()) {
          return { valid: false, error: 'Code has expired' };
        }
      }
      return { valid: true, expiresAt: savedExpiry };
    }
    return { valid: false, error: 'Server error. Please check your connection.' };
  }
};

// Create new admin code - stored in Firebase
export const createAdminCode = async (code, validityMonths = 4) => {
  try {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + validityMonths);
    
    const codeData = {
      code: code.toUpperCase(),
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      validityMonths: validityMonths
    };
    
    // Save to Firebase
    const codeRef = doc(db, COLLECTIONS.ADMIN_CODES, code.toUpperCase());
    await setDoc(codeRef, codeData);
    
    // Also save to localStorage for offline access
    localStorage.setItem('adminCode', code.toUpperCase());
    localStorage.setItem('adminExpiresAt', expiresAt.toISOString());
    
    return { success: true, ...codeData };
  } catch (error) {
    console.error('Error creating admin code:', error);
    // If Firebase fails, save locally anyway
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + validityMonths);
    localStorage.setItem('adminCode', code.toUpperCase());
    localStorage.setItem('adminExpiresAt', expiresAt.toISOString());
    return { success: true, expiresAt: expiresAt.toISOString(), offline: true };
  }
};

// Session Functions - Direct Firebase
export const createSession = async (sessionData) => {
  try {
    const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionData.sessionCode);
    await setDoc(sessionRef, {
      ...sessionData,
      active: true,
      createdAt: serverTimestamp()
    });
    return { success: true, sessionCode: sessionData.sessionCode };
  } catch (error) {
    console.error('Error creating session:', error);
    return { success: false, error: error.message };
  }
};

// Get session - Direct Firebase verification
// IMPORTANT: Check Firebase FIRST because students are on different devices!
export const getSession = async (sessionCode) => {
  try {
    // FIRST check Firebase (students are on different devices!)
    const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionCode.toUpperCase());
    const sessionSnap = await getDoc(sessionRef);
    
    if (sessionSnap.exists() && sessionSnap.data().active) {
      const sessionData = { exists: true, ...sessionSnap.data() };
      localStorage.setItem('adminLive', JSON.stringify(sessionData));
      return sessionData;
    }
    
    // Fallback: check localStorage only if Firebase fails
    const adminData = localStorage.getItem('adminLive');
    if (adminData) {
      try {
        const admin = JSON.parse(adminData);
        if (admin.sessionCode && admin.sessionCode.toUpperCase() === sessionCode.toUpperCase() && admin.active) {
          return { exists: true, ...admin, offline: true };
        }
      } catch (e) {
        console.log('Error parsing local session:', e);
      }
    }
    
    return { exists: false, error: 'Invalid or expired session code' };
  } catch (error) {
    console.error('Error getting session:', error);
    return { exists: false, error: 'Server error. Please check your connection.' };
  }
};


export const getActiveSessions = async () => {
  try {
    const sessionsRef = collection(db, COLLECTIONS.SESSIONS);
    const q = query(sessionsRef, where('active', '==', true));
    const querySnapshot = await getDocs(q);
    
    const sessions = [];
    querySnapshot.forEach((doc) => {
      sessions.push({ id: doc.id, ...doc.data() });
    });
    return sessions;
  } catch (error) {
    console.error('Error getting active sessions:', error);
    return [];
  }
};

export const endSession = async (sessionCode) => {
  try {
    const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionCode.toUpperCase());
    await updateDoc(sessionRef, {
      active: false,
      endedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error ending session:', error);
    return { success: false, error: error.message };
  }
};

// Attendance Functions
export const markAttendance = async (attendanceData) => {
  try {
    const attendanceRef = doc(collection(db, COLLECTIONS.ATTENDANCE));
    await setDoc(attendanceRef, {
      ...attendanceData,
      timestamp: serverTimestamp()
    });
    return { success: true, id: attendanceRef.id };
  } catch (error) {
    console.error('Error marking attendance:', error);
    return { success: false, error: error.message };
  }
};

export const getAttendanceBySession = async (sessionCode) => {
  try {
    const attendanceRef = collection(db, COLLECTIONS.ATTENDANCE);
    const q = query(
      attendanceRef, 
      where('sessionCode', '==', sessionCode.toUpperCase()),
      orderBy('timestamp', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const records = [];
    querySnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() });
    });
    return records;
  } catch (error) {
    console.error('Error getting attendance:', error);
    return [];
  }
};

export const getTodayAttendance = async () => {
  try {
    const attendanceRef = collection(db, COLLECTIONS.ATTENDANCE);
    const querySnapshot = await getDocs(attendanceRef);
    
    const records = [];
    const today = new Date().toDateString();
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Check if timestamp is from today
      if (data.timestamp && new Date(data.timestamp.seconds * 1000).toDateString() === today) {
        records.push({ id: doc.id, ...data });
      }
    });
    
    // Sort by timestamp descending
    records.sort((a, b) => {
      if (a.timestamp && b.timestamp) {
        return b.timestamp.seconds - a.timestamp.seconds;
      }
      return 0;
    });
    
    return records;
  } catch (error) {
    console.error('Error getting today attendance:', error);
    return [];
  }
};

export const getAllAttendance = async () => {
  try {
    const attendanceRef = collection(db, COLLECTIONS.ATTENDANCE);
    const q = query(attendanceRef, orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const records = [];
    querySnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() });
    });
    return records;
  } catch (error) {
    console.error('Error getting all attendance:', error);
    return [];
  }
};

// Course Rep Functions
export const saveCourseRep = async (courseRepData) => {
  try {
    const docRef = doc(db, COLLECTIONS.COURSE_REP, courseRepData.indexNumber);
    await setDoc(docRef, {
      ...courseRepData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error saving course rep:', error);
    return { success: false, error: error.message };
  }
};

export const getCourseRep = async (indexNumber) => {
  try {
    const docRef = doc(db, COLLECTIONS.COURSE_REP, indexNumber);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { exists: true, ...docSnap.data() };
    }
    return { exists: false };
  } catch (error) {
    console.error('Error getting course rep:', error);
    return { exists: false, error: error.message };
  }
};

// Device Registration (prevent duplicate registrations within same session)
// Now accepts sessionCode to allow re-registration for new sessions
export const checkDeviceRegistration = async (ipAddress, sessionCode) => {
  try {
    const attendanceRef = collection(db, COLLECTIONS.ATTENDANCE);
    const q = query(attendanceRef, where('deviceInfo.ipAddress', '==', ipAddress));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // Get the most recent registration
      const docs = querySnapshot.docs;
      const sorted = docs.sort((a, b) => b.data().timestamp?.seconds - a.data().timestamp?.seconds);
      const latestRegistration = sorted[0].data();
      
      // If a sessionCode is provided, check if it's the SAME session
      if (sessionCode) {
        if (latestRegistration.sessionCode === sessionCode) {
          // Same session - block registration
          return { registered: true, data: latestRegistration };
        }
        // Different session (ended) - allow re-registration for new session
        return { registered: false };
      }
      
      // No sessionCode provided - block by default (backwards compatibility)
      return { registered: true, data: latestRegistration };
    }
    return { registered: false };
  } catch (error) {
    console.error('Error checking device registration:', error);
    return { registered: false };
  }
};

// Real-time attendance listener - for live monitoring
// Returns an unsubscribe function that can be called to stop listening
export const subscribeToAttendance = (sessionCode, callback) => {
  try {
    let q;
    if (sessionCode) {
      // Listen for specific session attendance
      q = query(
        collection(db, COLLECTIONS.ATTENDANCE),
        where('sessionCode', '==', sessionCode.toUpperCase()),
        orderBy('timestamp', 'desc')
      );
    } else {
      // Listen for all attendance (for admin monitoring all sessions)
      q = query(
        collection(db, COLLECTIONS.ATTENDANCE),
        orderBy('timestamp', 'desc')
      );
    }
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = [];
      const today = new Date().toDateString();
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Filter for today's records if no specific session
        if (!sessionCode) {
          if (data.timestamp && new Date(data.timestamp.seconds * 1000).toDateString() === today) {
            records.push({ id: doc.id, ...data });
          }
        } else {
          records.push({ id: doc.id, ...data });
        }
      });
      
      callback(records);
    }, (error) => {
      console.error('Error in attendance listener:', error);
      callback([]);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up attendance listener:', error);
    return () => {};
  }
};

export default {
  verifyAdminCode,
  createAdminCode,
  createSession,
  getSession,
  getActiveSessions,
  endSession,
  markAttendance,
  getAttendanceBySession,
  getTodayAttendance,
  getAllAttendance,
  saveCourseRep,
  getCourseRep,
  checkDeviceRegistration,
  subscribeToAttendance
};
