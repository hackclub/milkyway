import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { escapeAirtableFormula, checkRateLimit, getClientIdentifier } from '$lib/server/security.js';
import { verifyProjectOwnership } from '$lib/server/projects.js';

export async function POST({ request, cookies }) {
  try {
    const sessionId = cookies.get('sessionid');
    
    if (!sessionId) {
      return json({
        success: false,
        error: 'No session found'
      }, { status: 401 });
    }

    const { getUserInfoBySessionId } = await import('$lib/server/auth.js');
    const userInfo = await getUserInfoBySessionId(sessionId);
    
    if (!userInfo || !userInfo.email) {
      return json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Rate limiting: 60 artlog fetches per minute
    const clientId = getClientIdentifier(request, cookies);
    if (!checkRateLimit(`artlog-fetch:${clientId}`, 60, 60000)) {
      return json({ error: 'Too many requests' }, { status: 429 });
    }

    const { projectId } = await request.json();
    
    if (!projectId) {
      return json({
        success: false,
        error: 'Project ID is required'
      }, { status: 400 });
    }

    // Validate projectId format
    if (typeof projectId !== 'string' || !projectId.startsWith('rec')) {
      return json({
        success: false,
        error: 'Invalid project ID format'
      }, { status: 400 });
    }

    // Verify project ownership
    const isOwner = await verifyProjectOwnership(projectId, String(userInfo.email));
    if (!isOwner) {
      return json({
        success: false,
        error: 'Forbidden'
      }, { status: 403 });
    }

    // Get the project's primary identifier (projectid field)
    // Note: When querying linked fields in Airtable formulas, we must use the primary field value,
    // not the record ID. The Projects linked field in Artlog shows projectid values, not record IDs.
    const projectRecord = await base('Projects').find(projectId);
    const projectPrimaryId = projectRecord.fields.projectid;
    const escapedPrimaryId = escapeAirtableFormula(String(projectPrimaryId || projectId));

    // Fetch artlogs for this project
    // Use proper array membership check with delimiters to ensure exact matches
    // This prevents false matches where one ID is a substring of another
    const records = await base('Artlog')
      .select({
        filterByFormula: `FIND("|${escapedPrimaryId}|", "|" & ARRAYJOIN({Projects}, "|") & "|") > 0`
      })
      .all();

    const artlogs = records.map((record) => {
      const f = record.fields;

      // Get image URL from attachments
      let imageUrl = '';
      const imageField = f.image;
      if (imageField && Array.isArray(imageField) && imageField.length > 0) {
        // @ts-ignore Airtable attachment typing
        imageUrl = String(imageField[0].url || '');
      }

      const hours = typeof f.hours === 'number' ? f.hours : 0;
      const approvedHours =
        typeof f.approvedHours === 'number' ? f.approvedHours : null;

      /** @type {"pending" | "approved" | "rejected" | "decreased"} */
      const status = (() => {
        if (typeof approvedHours === 'number') {
          if (approvedHours === 0) return 'rejected';
          if (approvedHours < hours) return 'decreased';
          if (approvedHours === hours) return 'approved';
        }
        return 'pending';
      })();

      const rereviewRequest = typeof f.rereviewRequest === 'string' ? f.rereviewRequest : '';

      return {
        id: record.id,
        hours,
        description: String(f.description || ''),
        proof: String(f.proof || ''),
        image: imageUrl,
        created: String(f.Created || ''),
        approvedHours,
        reviewNote: String(f.reviewNote || ''),
        reviewedAt: String(f.reviewedAt || ''),
        status,
        rereviewRequest,
        isRereviewRequested: rereviewRequest.trim().length > 0
      };
    });

    return json({
      success: true,
      artlogs
    });

  } catch (error) {
    console.error('Error fetching artlogs:', error);
    return json({
      success: false,
      error: 'Failed to fetch artlogs'
    }, { status: 500 });
  }
}
