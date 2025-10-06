// Edge Function: Submit vote with counting, expiration check, duplicate prevention and notifications
// Handles complete group application voting flow including vote counting, approval checking, adding members and sending notifications

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

        // Get authenticated user
        const { data: userData } = await client.auth.getCurrentUser();
        if (!userData?.user?.id) {
            return new Response(JSON.stringify({ error: 'User authentication failed' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Parse request body
        const body = await request.json();
        const { application_id, vote } = body;

        if (!application_id || typeof vote !== 'boolean') {
            return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Check if application exists and not expired
        const { data: application, error: appError } = await client.database
            .from('group_applications')
            .select('*')
            .eq('id', application_id)
            .eq('status', 'pending')
            .gte('expires_at', new Date().toISOString()) // Check not expired
            .single();

        if (appError || !application) {
            return new Response(JSON.stringify({ error: 'Application does not exist, has been processed, or has expired' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Check if user is a group member (only members can vote)
        const { data: membership } = await client.database
            .from('group_members')
            .select('id')
            .eq('group_id', application.group_id)
            .eq('user_id', userData.user.id)
            .single();

        if (!membership) {
            return new Response(JSON.stringify({ error: 'Only group members can vote' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Check if user has already voted (using new application_votes table)
        const { data: existingVote } = await client.database
            .from('application_votes')
            .select('id, vote_type')
            .eq('application_id', application_id)
            .eq('voter_id', userData.user.id)
            .single();

        if (existingVote) {
            return new Response(JSON.stringify({
                error: `You have already voted ${existingVote.vote_type === 'approve' ? 'to approve' : 'to reject'}. You cannot vote again or change your vote`
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Submit vote to application_votes table
        const voteType = vote ? 'approve' : 'reject';
        const { error: voteError } = await client.database
            .from('application_votes')
            .insert([{
                application_id: application_id,
                voter_id: userData.user.id,
                vote_type: voteType
            }]);

        if (voteError) {
            console.error('Error submitting vote:', voteError);
            return new Response(JSON.stringify({ error: 'Vote submission failed' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Update application vote count (only count approve votes)
        let updatedApplication = application;
        if (vote) {
            const { data: updatedApp, error: updateError } = await client.database
                .from('group_applications')
                .update({
                    votes_received: application.votes_received + 1,
                    updated_at: new Date().toISOString()
                })
                .eq('id', application_id)
                .select('*')
                .single();

            if (updateError) {
                console.error('Error updating vote count:', updateError);
            } else {
                updatedApplication = updatedApp;
            }
        }

        // Check if voting requirement is met (approval condition)
        let applicationApproved = false;
        if (updatedApplication.votes_received >= updatedApplication.votes_needed) {
            try {
                // Application approved, automatically add to group
                await approveGroupApplication(client, updatedApplication);
                applicationApproved = true;
            } catch (approvalError) {
                console.error('Error approving application:', approvalError);
                // Even if approval fails, vote is still successful
            }
        }

        // Calculate remaining days
        const expiresAt = new Date(application.expires_at);
        const daysRemaining = Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24));

        return new Response(JSON.stringify({
            success: true,
            vote_submitted: vote,
            vote_type: voteType,
            application_approved: applicationApproved,
            current_votes: updatedApplication.votes_received,
            votes_needed: updatedApplication.votes_needed,
            days_remaining: daysRemaining,
            expires_at: application.expires_at,
            message: vote ? 'Approved' : 'Rejected'
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

// Handle application approval logic
async function approveGroupApplication(client, application) {
    // Add user to group
    const { error: memberError } = await client.database
        .from('group_members')
        .insert([{
            group_id: application.group_id,
            user_id: application.applicant_id,
            role: 'member'
        }]);

    if (memberError) {
        console.error('Error adding group member:', memberError);
        throw new Error('Failed to add group member');
    }

    // Get current group info and update member count
    const { data: currentGroup, error: getGroupError } = await client.database
        .from('groups')
        .select('member_count, name')
        .eq('id', application.group_id)
        .single();

    if (!getGroupError && currentGroup) {
        const { error: groupError } = await client.database
            .from('groups')
            .update({ member_count: (currentGroup.member_count || 0) + 1 })
            .eq('id', application.group_id);

        if (groupError) {
            console.error('Error updating group member count:', groupError);
        }
    }

    // Update application status
    const { error: statusError } = await client.database
        .from('group_applications')
        .update({ status: 'approved' })
        .eq('id', application.id);

    if (statusError) {
        console.error('Error updating application status:', statusError);
    }

    // Send approval notification to applicant
    try {
        const groupName = currentGroup?.name || 'Unknown Group';

        await client.database
            .from('notifications')
            .insert([{
                recipient_id: application.applicant_id,
                sender_id: null, // System notification
                type: 'group_approval',
                title: 'Application Approved',
                message: `Congratulations! Your application to join "${groupName}" has been approved`,
                related_inspiration_id: null,
                related_comment_id: application.id
            }]);

        console.log('Approval notification sent to applicant');
    } catch (notificationError) {
        console.error('Error sending approval notification:', notificationError);
        // Notification failure does not affect main flow
    }

    console.log('Application approved, user added to group');
}
