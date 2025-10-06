// Edge Function: Apply to join group with notification and expiration control
// Handles complete group application flow including sending notifications to all members and setting expiration

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
        const { group_id, message } = body;

        if (!group_id || !message?.trim()) {
            return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Get group information and member count
        const { data: groupData, error: groupError } = await client.database
            .from('groups')
            .select(`
                id, name, description,
                group_members!inner(count)
            `)
            .eq('id', group_id)
            .single();

        if (groupError || !groupData) {
            console.error('Error fetching group:', groupError);
            return new Response(JSON.stringify({ error: 'Group does not exist or failed to fetch' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Check if already a member
        const { data: existingMember } = await client.database
            .from('group_members')
            .select('id')
            .eq('group_id', group_id)
            .eq('user_id', userData.user.id)
            .single();

        if (existingMember) {
            return new Response(JSON.stringify({ error: 'You are already a member of this group' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Check for existing pending application (including expiration check)
        const { data: existingApplication } = await client.database
            .from('group_applications')
            .select('id, expires_at')
            .eq('group_id', group_id)
            .eq('applicant_id', userData.user.id)
            .eq('status', 'pending')
            .gte('expires_at', new Date().toISOString()) // Only check non-expired applications
            .single();

        if (existingApplication) {
            return new Response(JSON.stringify({ error: 'You already have a pending application' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Get group member count
        const { data: memberCountData } = await client.database
            .from('group_members')
            .select('id', { count: 'exact' })
            .eq('group_id', group_id);

        const memberCount = memberCountData?.length || 1;

        // Calculate required votes
        let votesNeeded;
        if (memberCount < 40) {
            votesNeeded = Math.ceil(memberCount / 2);
        } else {
            votesNeeded = Math.ceil(memberCount / 3);
        }

        // Set expiration time (one month later)
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        // Create application
        const { data: application, error: appError } = await client.database
            .from('group_applications')
            .insert([{
                group_id: group_id,
                applicant_id: userData.user.id,
                message: message.trim(),
                votes_needed: votesNeeded,
                votes_received: 0,
                status: 'pending',
                expires_at: expiresAt.toISOString()
            }])
            .select('*')
            .single();

        if (appError) {
            console.error('Error creating application:', appError);
            return new Response(JSON.stringify({ error: 'Failed to create application' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Send notifications to all group members
        try {
            // Get all group members
            const { data: members, error: membersError } = await client.database
                .from('group_members')
                .select('user_id')
                .eq('group_id', group_id);

            if (membersError) {
                console.error('Error fetching group members:', membersError);
            } else if (members && members.length > 0) {
                // Get current user's nickname
                const { data: userProfile } = await client.database
                    .from('users')
                    .select('nickname')
                    .eq('id', userData.user.id)
                    .single();

                const applicantName = userProfile?.nickname || userData.user.email;
                const groupName = groupData.name;

                // Calculate remaining days
                const daysRemaining = Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24));

                // Create notifications for each member
                const notifications = members
                    .filter(member => member.user_id !== userData.user.id) // Exclude applicant
                    .map(member => ({
                        recipient_id: member.user_id,
                        sender_id: userData.user.id,
                        type: 'group_application',
                        title: 'New Group Application',
                        message: `${applicantName} has applied to join group "${groupName}". Please vote within ${daysRemaining} days`,
                        related_inspiration_id: null,
                        related_comment_id: application.id
                    }));

                if (notifications.length > 0) {
                    await client.database
                        .from('notifications')
                        .insert(notifications);

                    console.log(`Sent application notifications to ${notifications.length} members`);
                }
            }
        } catch (notificationError) {
            console.error('Error sending application notifications:', notificationError);
            // Notification failure does not affect application creation, continue execution
        }

        return new Response(JSON.stringify({
            success: true,
            application: application,
            message: `Application submitted, awaiting member votes. Application will expire in one month (${new Date(expiresAt).toLocaleDateString()})`
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