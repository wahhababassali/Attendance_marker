// netlify/functions/verify-admin-code.js
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
    const { code } = JSON.parse(event.body);
    console.log('Code received:', code);

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
    const isValid = adminCodes.includes(code);
    console.log('Code valid?', isValid);

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