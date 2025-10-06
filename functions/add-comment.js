// Edge Function: Add comment with notification
// Handles complete comment operation flow including sending in-app notifications and handling @ mentions

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
        const { inspiration_id, content, parent_comment_id = null } = body;

        if (!inspiration_id || !content?.trim()) {
            return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Extract @mentions from content
        const mentionRegex = /@(\w+)/g;
        const mentions = [];
        let match;
        while ((match = mentionRegex.exec(content)) !== null) {
            mentions.push(match[1]);
        }

        // Add comment to database
        const { data: comment, error: commentError } = await client.database
            .from('comments')
            .insert([{
                inspiration_id: inspiration_id,
                user_id: userData.user.id,
                content: content.trim(),
                parent_comment_id: parent_comment_id,
                mentioned_users: mentions.length > 0 ? mentions : null
            }])
            .select('*')
            .single();

        if (commentError) {
            console.error('Error adding comment:', commentError);
            return new Response(JSON.stringify({ error: 'Failed to comment' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Get current user information for notification
        const { data: userProfile } = await client.database
            .from('profiles')
            .select('nickname')
            .eq('id', userData.user.id)
            .single();

        const userNickname = userProfile?.nickname || 'Someone';

        // 1. Send comment notification to inspiration author
        try {
            const { data: inspiration } = await client.database
                .from('inspirations')
                .select('user_id, title')
                .eq('id', inspiration_id)
                .single();

            if (inspiration && inspiration.user_id !== userData.user.id) {
                await client.database
                    .from('notifications')
                    .insert([{
                        user_id: inspiration.user_id,
                        sender_id: userData.user.id,
                        type: 'comment',
                        title: 'Someone commented on your inspiration',
                        message: `${userNickname} commented on your inspiration "${inspiration.title}": ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                        related_id: inspiration_id,
                        is_read: false
                    }]);

                console.log('Notification sent to inspiration owner');
            }
        } catch (notificationError) {
            console.error('Error sending comment notification:', notificationError);
        }

        // 2. If replying to a comment, send notification to the replied user
        if (parent_comment_id) {
            try {
                const { data: parentComment } = await client.database
                    .from('comments')
                    .select('user_id')
                    .eq('id', parent_comment_id)
                    .single();

                if (parentComment && parentComment.user_id !== userData.user.id) {
                    await client.database
                        .from('notifications')
                        .insert([{
                            user_id: parentComment.user_id,
                            sender_id: userData.user.id,
                            type: 'reply',
                            title: 'Someone replied to your comment',
                            message: `${userNickname} replied to your comment: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                            related_id: inspiration_id,
                            is_read: false
                        }]);

                    console.log('Notification sent to parent comment owner');
                }
            } catch (notificationError) {
                console.error('Error sending reply notification:', notificationError);
            }
        }

        // 3. Send @mention notifications
        if (mentions.length > 0) {
            try {
                // Find mentioned users
                const { data: mentionedUsers } = await client.database
                    .from('profiles')
                    .select('id, nickname')
                    .in('nickname', mentions);

                if (mentionedUsers && mentionedUsers.length > 0) {
                    const mentionNotifications = mentionedUsers
                        .filter(user => user.id !== userData.user.id) // Exclude self
                        .map(user => ({
                            user_id: user.id,
                            sender_id: userData.user.id,
                            type: 'mention',
                            title: 'Someone mentioned you in a comment',
                            message: `${userNickname} mentioned you in a comment: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                            related_id: inspiration_id,
                            is_read: false
                        }));

                    if (mentionNotifications.length > 0) {
                        await client.database
                            .from('notifications')
                            .insert(mentionNotifications);

                        console.log(`Sent mention notifications to ${mentionNotifications.length} users`);
                    }
                }
            } catch (notificationError) {
                console.error('Error sending mention notifications:', notificationError);
            }
        }

        // Return success result with newly created comment
        return new Response(JSON.stringify({
            success: true,
            comment: comment
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
