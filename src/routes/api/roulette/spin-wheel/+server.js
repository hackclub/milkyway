import jwt from 'jsonwebtoken';
import { isSpunForCurrentWheelRound, userSpinWheel, resetRoundWithRespin } from '../../../lib/airtable.js';
import { getCurrentRound, isSelectedCountOk, areSelectedOptionsValid } from '../../../../lib/data/wheel-options.js';
import { getTokenFromCookies, verifyJwt } from '../../../lib/auth.js';
import { getSecurityHeaders, validateArray } from '../../../lib/security.js';

export async function POST({ request }) {
  // Add security headers
  const headers = getSecurityHeaders();

  const token = getTokenFromCookies(request.headers);
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401,
      headers
    });
  }

  let payload;

  try {
    payload = verifyJwt(token);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { 
      status: 401,
      headers
    });
  }

  // Validate request body
  let requestData;
  try {
    requestData = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), { 
      status: 400,
      headers
    });
  }

  const { selectedOptions, wheelOption, respin } = requestData;

  // Input validation
  if (respin !== true && (!selectedOptions || !wheelOption)) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
      status: 400,
      headers
    });
  }

  if (respin === true) {
    try {
      const result = await resetRoundWithRespin(payload.userId);
      return new Response(JSON.stringify({ success: true, result }), { 
        status: 200,
        headers
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message || 'Respin failed' }), { 
        status: 400,
        headers
      });
    }
  }

  // Validate wheel option
  const validWheelOptions = ['camera', 'gameplay', 'setting'];
  if (!validWheelOptions.includes(wheelOption)) {
    return new Response(JSON.stringify({ error: 'Invalid wheel option' }), { 
      status: 400,
      headers
    });
  }

  // Validate selectedOptions is an array
  if (!Array.isArray(selectedOptions)) {
    return new Response(JSON.stringify({ error: 'Selected options must be an array' }), { 
      status: 400,
      headers
    });
  }

  // first check if user has spinned already.
  var check = await isSpunForCurrentWheelRound({
    "slackId": payload.userId,
    "wheelOption": wheelOption });

  if (check == true) {
    return new Response(JSON.stringify({ error: 'Already spun' }), { 
      status: 401,
      headers
    });
  }

  // Validate selected options against canonical list and count limit
  if (!areSelectedOptionsValid(selectedOptions, wheelOption)) {
    return new Response(JSON.stringify({ error: 'Invalid selection' }), { 
      status: 401,
      headers
    });
  }
  var selectedOk = isSelectedCountOk(selectedOptions, wheelOption);

  if (!selectedOk) {
    return new Response(JSON.stringify({ error: 'Invalid selection' }), { 
      status: 401,
      headers
    });
  }

  var spinResult = await userSpinWheel(payload.userId, selectedOptions, wheelOption);

  return new Response(JSON.stringify({ success: true, result: spinResult }), { 
    status: 200,
    headers
  });
}
