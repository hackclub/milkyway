import { base } from '$lib/server/db.js';

/**
 * Get all projects for a specific user
 * @param {string} userEmail - The user's email address
 * @returns {Promise<Array<Object>>} Array of project objects
 */
export async function getUserProjectsByEmail(userEmail) {
  try {
    console.log('getUserProjects called with userId:', userEmail);


    const records = await base('Projects')
      .select({ filterByFormula: `FIND("${userEmail}", ARRAYJOIN({user}, ","))`}).all();


    console.log('Raw records from Airtable for user:', records);

    const projects = records.map(record => {
      // Parse position data
      const positionStr = typeof record.fields.position === 'string' ? record.fields.position : '0,0';
      const positionParts = positionStr.split(',');
      const x = parseFloat(positionParts[0]) || 0;
      const y = parseFloat(positionParts[1]) || 0;
      
      return {
        id: record.id,
        name: record.fields.projectname || 'Untitled Project',
        promptinfo: record.fields.promptinfo || '',
        description: record.fields.description || '',
        event: 'new', // Default since you don't have this field
        egg: record.fields.egg || 'projects/egg1.png',
        position: record.fields.position || '0,0',
        x: x,
        y: y,
        status: 'active', // Default since you don't have this field
        hours: record.fields.hours || 0,
        totalHours: record.fields.totalHours || 0,
        hackatimeProjects: record.fields.hackatimeProjects || [],
        created: record.fields.Created
      };
    });

    console.log('Fetched projects from Airtable:', projects);
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
    console.log('createProject called with userId:', userId, 'projectData:', projectData);
    
    // Generate random position for the egg
    const randomX = Math.random() * (120 - (-120)) + (-120); // Range: -120 to 120
    const randomY = Math.random() * (220 - 80) + 80; // Range: 80 to 220
    const position = `${randomX},${randomY}`;
    
    const record = await base('Projects').create({
      'user': [userId],
      'projectname': projectData.name,
      'promptinfo': projectData.description, // This stores the event type (ROULETTE, SPARKLE, etc.)
      'description': '', // Empty description field for new projects
      'egg': projectData.egg,
      'position': position
    });
    console.log('Created project record:', record);

    // Parse position for return object
    const positionStr = typeof record.fields.position === 'string' ? record.fields.position : '0,0';
    const positionParts = positionStr.split(',');
    const x = parseFloat(positionParts[0]) || 0;
    const y = parseFloat(positionParts[1]) || 0;

    return {
      id: record.id,
      name: record.fields.projectname,
      description: record.fields.description || '', // Empty description for new projects
      promptinfo: record.fields.promptinfo,
      event: 'new', // Default since you don't have this field
      egg: record.fields.egg,
      position: record.fields.position,
      x: x,
      y: y,
      status: 'active', // Default since you don't have this field
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
    const positionStr = typeof record.fields.position === 'string' ? record.fields.position : '0,0';
    const positionParts = positionStr.split(',');
    const x = parseFloat(positionParts[0]) || 0;
    const y = parseFloat(positionParts[1]) || 0;

    return {
      id: record.id,
      name: record.fields.projectname,
      description: record.fields.description || '',
      promptinfo: record.fields.promptinfo,
      event: 'new', // Default since you don't have this field
      egg: record.fields.egg,
      position: record.fields.position || '0,0',
      x: x,
      y: y,
      status: 'active', // Default since you don't have this field
      created: record.fields.Created,
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
