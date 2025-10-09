import { json } from '@sveltejs/kit';
import { isSelectedCountOk, areSelectedOptionsValid } from '$lib/data/wheel-options.js';
import { updateProject, verifyProjectOwnership } from '$lib/server/projects.js';
import { sanitizeErrorMessage } from '$lib/server/security.js';

export async function POST({ request, locals }) {
  try {
    // Check authentication
    if (!locals.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    let requestData;
    try {
      requestData = await request.json();
    } catch {
      return json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { selectedOptions, wheelOption, projectId } = requestData;

    // Input validation
    if (!selectedOptions || !wheelOption || !projectId) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify project ownership
    const isOwner = await verifyProjectOwnership(projectId, locals.user.email);
    if (!isOwner) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate wheel option
    const validWheelOptions = ['camera', 'gameplay', 'setting'];
    if (!validWheelOptions.includes(wheelOption)) {
      return json({ error: 'Invalid wheel option' }, { status: 400 });
    }

    // Validate selectedOptions is an array
    if (!Array.isArray(selectedOptions)) {
      return json({ error: 'Selected options must be an array' }, { status: 400 });
    }

    // Validate selected options against canonical list and count limit
    if (!areSelectedOptionsValid(selectedOptions, wheelOption)) {
      return json({ error: 'Invalid selection' }, { status: 400 });
    }
    
    const selectedOk = isSelectedCountOk(selectedOptions, wheelOption);
    if (!selectedOk) {
      return json({ error: 'Invalid selection' }, { status: 400 });
    }

    // SERVER-SIDE: Randomly select from available options
    const randomIndex = Math.floor(Math.random() * selectedOptions.length);
    const spinResult = selectedOptions[randomIndex];

    // IMMEDIATELY SAVE TO AIRTABLE before sending response
    // This ensures the result is persisted even if client disconnects during animation
    try {
      // Get current addn data or create new
      const existingAddn = requestData.currentAddn || '{"rouletteStatus":"spinning","spins":{}}';
      const addnData = JSON.parse(existingAddn);
      
      // Update with the new spin result
      addnData.spins[wheelOption] = spinResult;
      
      // Check if all wheels are complete
      const allComplete = addnData.spins.camera && addnData.spins.gameplay && addnData.spins.setting;
      if (allComplete) {
        addnData.rouletteStatus = 'complete';
      }
      
      // Save to Airtable IMMEDIATELY
      await updateProject(projectId, {
        addn: JSON.stringify(addnData)
      });
      
      console.log('Spin result saved to Airtable:', { wheelOption, result: spinResult, projectId });
    } catch (error) {
      console.error('Error saving spin to Airtable:', error);
      return json({ error: 'Failed to save spin result' }, { status: 500 });
    }

    return json({ success: true, result: spinResult });
  } catch (error) {
    console.error('Error spinning wheel:', error);
    return json({
      error: sanitizeErrorMessage(error, 'Failed to spin wheel')
    }, { status: 500 });
  }
}
