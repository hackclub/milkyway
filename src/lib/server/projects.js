import { base } from '$lib/server/db.js';
import { escapeAirtableFormula } from '$lib/server/security.js';
import { getFirstAttachment, getAttachmentUrl } from './attachments.js';

/**
 * Get all projects for a specific user
 * @param {string} userEmail - The user's email address
 * @returns {Promise<Array<Object>>} Array of project objects
 */
export async function getUserProjectsByEmail(userEmail) {
  try {
    const escapedEmail = escapeAirtableFormula(userEmail);
    const records = await base('Projects')
      .select({ filterByFormula: `FIND("${escapedEmail}", ARRAYJOIN({user}, ","))`}).all();

    const projects = records.map(record => {
      // Parse position data
      const positionStr = typeof record.fields.position === 'string' ? record.fields.position : '0,0';
      const positionParts = positionStr.split(',');
      const x = parseFloat(positionParts[0]) || 0;
      const y = parseFloat(positionParts[1]) || 0;
      const layer = parseInt(positionParts[2]) || 0;
      
      // Handle image attachment - get URL from first attachment if available
      const imageAttachment = getFirstAttachment(record.fields.image);
      const imageUrl = imageAttachment ? getAttachmentUrl(imageAttachment) : '';
      
      return {
        id: record.id,
        projectid: record.fields.projectid || record.id, // Use projectid field or fallback to record ID
        name: record.fields.projectname || 'Untitled Project',
        promptinfo: record.fields.promptinfo || '',
        description: record.fields.description || '',
        shipURL: record.fields.shipURL || '',
        githubURL: record.fields.githubURL || '',
        projectImage: record.fields.projectImage || imageUrl, // Use attachment URL as fallback
        image: imageUrl, // Store the attachment URL
      stellarShipResult: record.fields.stellarShipResult ?? 0,
        addn: record.fields.addn || '',
        event: 'new', // Default since you don't have this field
        egg: record.fields.egg || 'projects/sparkle_egg1.png',
        position: record.fields.position || '0,0,0',
        x: x,
        y: y,
        layer: layer,
        status: record.fields.status || 'active',
        hours: record.fields.hours || 0,
        hackatimeHours: record.fields.hackatimeHours || 0,
        artHours: record.fields.artHours || 0,
        hackatimeProjects: record.fields.hackatimeProjects || [],
        created: record.fields.countingFrom,
        // Form fields for shipping
        notMadeBy: record.fields.notMadeBy || '',
        howToPlay: record.fields.howToPlay || '',
        addnComments: record.fields.addnComments || '',
        hoursShipped: record.fields.hoursShipped || 0,
        // Paint chips tracking
        hoursAtFirstShip: record.fields.hoursAtFirstShip || 0,
        paintChipsClaimed: record.fields.paintChipsClaimed || 0
      };
    });

    return projects;
  } catch (error) {
    console.error('Error fetching user projects:', error);
    return [];
  }
}

/**
 * Create a new project in Airtable
 * @param {string} userId - The user's record ID
 * @param {any} projectData - Project data to create
 * @returns {Promise<Object>} Created project object
 */
export async function createProject(userId, projectData) {
  try {
    // Generate random position for the egg
    const randomX = Math.random() * (120 - (-120)) + (-120); // Range: -120 to 120
    const randomY = Math.random() * (220 - 80) + 80; // Range: 80 to 220
    const position = `${randomX},${randomY},0`;
    
    /** @type {any} */
    const fieldsToCreate = {
      'user': [userId],
      'projectname': projectData.name,
      'promptinfo': projectData.description, // This stores the event type (ROULETTE, SPARKLE, etc.)
      'description': '', // Empty description field for new projects
      'egg': projectData.egg,
      'position': position
    };
    
    // Add addn field if provided
    if (projectData.addn) {
      fieldsToCreate.addn = projectData.addn;
    }
    
    const record = /** @type {any} */ (await base('Projects').create(fieldsToCreate));

    // Parse position for return object
    const positionStr = typeof record.fields.position === 'string' ? record.fields.position : '0,0';
    const positionParts = positionStr.split(',');
    const x = parseFloat(positionParts[0]) || 0;
    const y = parseFloat(positionParts[1]) || 0;
    const layer = parseInt(positionParts[2]) || 0;

    // Handle image attachment - get URL from first attachment if available
    const imageAttachment = getFirstAttachment(record.fields.image);
    const imageUrl = imageAttachment ? getAttachmentUrl(imageAttachment) : '';
    
    return {
      id: record.id,
      projectid: record.fields.projectid || record.id, // Use projectid field or fallback to record ID
      name: record.fields.projectname,
      description: record.fields.description || '', // Empty description for new projects
      promptinfo: record.fields.promptinfo,
      projectImage: record.fields.projectImage || imageUrl, // Use attachment URL as fallback
      image: imageUrl, // Store the attachment URL
      stellarShipResult: record.fields.stellarShipResult ?? 0,
      addn: record.fields.addn || '',
      event: 'new', // Default since you don't have this field
      egg: record.fields.egg,
      position: record.fields.position,
      x: x,
      y: y,
      layer: layer,
      status: 'active', // Default since you don't have this field
      hoursShipped: record.fields.hoursShipped || 0,
      created: record.fields.Created,
      modified: record.fields.Modified
    };
  } catch (error) {
    console.error('Error creating project:', error);
    throw new Error('Failed to create project');
  }
}

/**
 * Update an existing project
 * @param {string} projectId - The project's record ID
 * @param {any} updates - Fields to update
 * @returns {Promise<Object>} Updated project object
 */
export async function updateProject(projectId, updates) {
  try {
    const record = await base('Projects').update(projectId, updates);

    // Parse position data
    const positionStr = typeof record.fields.position === 'string' ? record.fields.position : '0,0,0';
    const positionParts = positionStr.split(',');
    const x = parseFloat(positionParts[0]) || 0;
    const y = parseFloat(positionParts[1]) || 0;
    const layer = parseInt(positionParts[2]) || 0;

    // Handle image attachment - get URL from first attachment if available
    const imageAttachment = getFirstAttachment(record.fields.image);
    const imageUrl = imageAttachment ? getAttachmentUrl(imageAttachment) : '';
    
    return {
      id: record.id,
      projectid: record.fields.projectid || record.id, // Use projectid field or fallback to record ID
      name: record.fields.projectname,
      description: record.fields.description || '',
      shipURL: record.fields.shipURL || '',
      githubURL: record.fields.githubURL || '',
      projectImage: record.fields.projectImage || imageUrl, // Use attachment URL as fallback
      image: imageUrl, // Store the attachment URL
      promptinfo: record.fields.promptinfo,
      stellarShipResult: record.fields.stellarShipResult ?? 0,
      addn: record.fields.addn || '',
      event: 'new', // Default since you don't have this field
      egg: record.fields.egg,
      position: record.fields.position || '0,0,0',
      x: x,
      y: y,
      layer: layer,
      status: 'active', // Default since you don't have this field
      hoursShipped: record.fields.hoursShipped || 0,
      created: record.fields.countingFrom,
      modified: record.fields.Modified
    };
  } catch (error) {
    console.error('Error updating project:', error);
    throw new Error('Failed to update project');
  }
}

/**
 * Delete a project
 * @param {string} projectId - The project's record ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteProject(projectId) {
  try {
    await base('Projects').destroy(projectId);
    return true;
  } catch (error) {
    console.error('Error deleting project:', error);
    throw new Error('Failed to delete project');
  }
}

/**
 * Verify if a user owns a specific project
 * @param {string} projectId - The project's record ID
 * @param {string} userEmail - The user's email address
 * @returns {Promise<boolean>} True if user owns the project
 */
export async function verifyProjectOwnership(projectId, userEmail) {
  try {
    const record = await base('Projects').find(projectId);
    const projectUserField = record.fields.user;
    
    // Convert to array if it's not already
    /** @type {string[]} */
    const projectUserIds = Array.isArray(projectUserField) ? projectUserField : 
                           (projectUserField ? [String(projectUserField)] : []);
    
    // Check if the user's email is in the project's user list
    // Note: user field in Projects is a linked field to User table
    // We need to fetch the actual user records to get their emails
    if (projectUserIds.length === 0) {
      return false;
    }
    
    // Fetch user records to get emails
    const userRecords = await base('User')
      .select({
        filterByFormula: `OR(${projectUserIds.map(/** @param {string} id */ id => `RECORD_ID() = "${escapeAirtableFormula(id)}"`).join(', ')})`,
      })
      .firstPage();
    
    const emails = userRecords.map(r => r.fields.email);
    return emails.includes(userEmail);
  } catch (error) {
    console.error('Error verifying project ownership:', error);
    return false;
  }
}
