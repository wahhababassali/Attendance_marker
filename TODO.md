
# Attendance QR System - Complete

## How It Works (Direct Firebase):

```
┌─────────────────────────────────────────────┐
│              FIREBASE (Backend)              │
│  • adminCodes collection - stores admin login │
│  • sessions collection - stores active sessions│
│  • attendance collection - student records    │
│  • courseRep collection - course rep info      │
└─────────────────────────────────────────────┘
                      ↑
    All devices read/write directly to Firebase
```

## Workflow:
1. **Admin Login**: Creates admin code → saved to Firebase `adminCodes` collection
2. **Create Session**: Admin creates session → saved to Firebase `sessions` collection  
3. **Student Register**: Enters 6-digit code → Firebase verifies session → returns session data

## Features:
- ✅ Direct Firebase verification (no Netlify functions needed)
- ✅ Admin code creation in Dashboard
- ✅ Session creation saves to Firebase
- ✅ Student session verification from Firebase
- ✅ Offline fallback to localStorage
- ✅ Real-time attendance sync across all devices

