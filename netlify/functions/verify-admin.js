// netlify/functions/verify-admin.js
exports.handler = async (event) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { code } = JSON.parse(event.body);
    
    // Get admin codes from environment variables (server-side only!)
    const adminCodes = process.env.ADMIN_CODES?.split(',') || [];
    const validityMonths = parseInt(process.env.CODE_VALIDITY_MONTHS) || 4;

    // Check if code is valid
    if (adminCodes.includes(code)) {
      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + validityMonths);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          valid: true,
          expiresAt: expiresAt.toISOString()
        })
      };
    } else {
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