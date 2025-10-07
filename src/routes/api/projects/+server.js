import { json } from '@sveltejs/kit';
import { createProject, updateProject, deleteProject } from '$lib/server/projects.js';

// GET - Not needed since projects are loaded server-side
export async function GET() {
  return json({ error: 'Use server-side loading instead' }, { status: 405 });
}

// POST - Create a new project
export async function POST({ request, locals }) {
  try {
    if (!locals.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectData = await request.json();

    // Validate required fields
    if (!projectData.name) {
      return json({ error: 'Project name is required' }, { status: 400 });
    }

    const project = await createProject(
      locals.user.recId, {
        name: projectData.name,
        description: projectData.description || '',
        egg: projectData.egg || 'projects/sparkle_egg1.png'
      });
    return json({ success: true, project });

  } catch (error) {
    console.error('Error creating project:', error);
    return json({
      error: error instanceof Error ? error.message : 'Failed to create project'
    }, { status: 500 });
  }
}




// PUT - Update an existing project
export async function PUT({ request, locals }) {
  try {
    if (!locals.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, updates } = await request.json();

    if (!projectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }

    const project = await updateProject(projectId, updates);
    return json({ success: true, project });
  } catch (error) {
    console.error('Error updating project:', error);
    return json({
      error: error instanceof Error ? error.message : 'Failed to update project'
    }, { status: 500 });
  }
}

// DELETE - Delete a project
export async function DELETE({ request, locals }) {
  try {
    if (!locals.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await request.json();

    if (!projectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }

    await deleteProject(projectId);
    return json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return json({
      error: error instanceof Error ? error.message : 'Failed to delete project'
    }, { status: 500 });
  }
}
