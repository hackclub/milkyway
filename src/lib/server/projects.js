import { base } from '$lib/server/db.js';

/**
 * Get all projects for a specific user
 * @param {string} userId - The user's record ID in Airtable
 * @returns {Promise<Array<Object>>} Array of project objects
 */
export async function getUserProjectsByEmail(userEmail) {
  try {
    console.log('getUserProjects called with userId:', userEmail);


    const records = await base('Projects')
      .select({ filterByFormula: `FIND("${userEmail}", ARRAYJOIN({user}, ","))`, maxRecords: 1 })
      .firstPage();


    console.log('Raw records from Airtable for user:', records);

    const projects = records.map(record => ({
      id: record.id,
      name: record.fields.projectname || 'Untitled Project',
      promptinfo: record.fields.promptinfo || '',
      description: record.fields.description || '',
      event: 'new', // Default since you don't have this field
      egg: record.fields.egg || 'projects/egg1.png',
      status: 'active', // Default since you don't have this field
      hours: record.fields.hours || 0,
      hackatimeProjects: record.fields.hackatimeProjects || [],
      created: record.fields.Created
    }));

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
    const record = await base('Projects').create({
      'user': [userId],
      'projectname': projectData.name,
      'promptinfo': projectData.description,
      'egg': projectData.egg
    });
    console.log('Created project record:', record);

    return {
      id: record.id,
      name: record.fields.projectname,
      description: record.fields.promptinfo,
      event: 'new', // Default since you don't have this field
      egg: record.fields.egg,
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

    return {
      id: record.id,
      name: record.fields.projectname,
      description: record.fields.promptinfo,
      event: 'new', // Default since you don't have this field
      egg: record.fields.egg,
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
