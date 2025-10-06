// Edge Function: Periodically clean up expired applications
// Handles expired application cleanup, updates status to 'expired' and sends notifications

module.exports = async function(request) {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Handle OPTIONS request
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Only POST method is supported' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    try {
        // Extract token from request headers
        const authHeader = request.headers.get('Authorization');
        const userToken = authHeader ? authHeader.replace('Bearer ', '') : null;

        if (!userToken) {
            return new Response(JSON.stringify({ error: 'Unauthorized access' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Create client with the user token
        const client = createClient({
            baseUrl: Deno.env.get('BACKEND_INTERNAL_URL') || 'http://insforge:7130',
            edgeFunctionToken: userToken
        });

        const currentTime = new Date().toISOString();

        // Find all expired pending applications
        const { data: expiredApplications, error: findError } = await client.database
            .from('group_applications')
            .select(`
                id, applicant_id, group_id, message, expires_at,
                groups!inner(name)
            `)
            .eq('status', 'pending')
            .lt('expires_at', currentTime);

        if (findError) {
            console.error('Error finding expired applications:', findError);
            return new Response(JSON.stringify({ error: 'Failed to find expired applications' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (!expiredApplications || expiredApplications.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                message: 'No expired applications found',
                expired_count: 0
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Update expired application status
        const applicationIds = expiredApplications.map(app => app.id);
        const { error: updateError } = await client.database
            .from('group_applications')
            .update({
                status: 'expired',
                updated_at: currentTime
            })
            .in('id', applicationIds);

        if (updateError) {
            console.error('Error updating expired applications:', updateError);
            return new Response(JSON.stringify({ error: 'Failed to update expired application status' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Send notification for each expired application
        const notifications = [];
        for (const application of expiredApplications) {
            const groupName = application.groups?.name || 'Unknown Group';

            notifications.push({
                recipient_id: application.applicant_id,
                sender_id: null, // System notification
                type: 'group_application_expired',
                title: 'Application Expired',
                message: `Unfortunately, your application to join group "${groupName}" has expired. You can submit a new application.`,
                related_inspiration_id: null,
                related_comment_id: application.id
            });
        }

        // Send notifications in batch
        if (notifications.length > 0) {
            const { error: notificationError } = await client.database
                .from('notifications')
                .insert(notifications);

            if (notificationError) {
                console.error('Error sending expiration notifications:', notificationError);
                // Notification failure does not affect main flow
            } else {
                console.log(`Sent expiration notifications to ${notifications.length} applicants`);
            }
        }

        // Clean up related vote records (optional, keep history records based on business requirements)
        const { error: voteCleanupError } = await client.database
            .from('application_votes')
            .delete()
            .in('application_id', applicationIds);

        if (voteCleanupError) {
            console.error('Error cleaning up votes:', voteCleanupError);
            // Vote cleanup failure does not affect main flow
        }

        return new Response(JSON.stringify({
            success: true,
            message: `Successfully processed ${expiredApplications.length} expired applications`,
            expired_count: expiredApplications.length,
            expired_applications: expiredApplications.map(app => ({
                id: app.id,
                group_name: app.groups?.name,
                expires_at: app.expires_at
            }))
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Function error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            details: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
};
