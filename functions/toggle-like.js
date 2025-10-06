// Edge Function: Like/unlike inspiration with notification
// Handles complete like operation flow including sending in-app notifications

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
        const { inspiration_id } = body;

        if (!inspiration_id) {
            return new Response(JSON.stringify({ error: 'Missing inspiration ID' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Check if already liked
        const { data: existingLike } = await client.database
            .from('likes')
            .select('id')
            .eq('inspiration_id', inspiration_id)
            .eq('user_id', userData.user.id)
            .single();

        let action = '';
        let shouldNotify = false;

        if (existingLike) {
            // Unlike
            const { error } = await client.database
                .from('likes')
                .delete()
                .eq('inspiration_id', inspiration_id)
                .eq('user_id', userData.user.id);

            if (error) {
                console.error('Error removing like:', error);
                return new Response(JSON.stringify({ error: 'Failed to unlike' }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            action = 'unliked';
        } else {
            // Like
            const { error } = await client.database
                .from('likes')
                .insert([{
                    inspiration_id: inspiration_id,
                    user_id: userData.user.id
                }]);

            if (error) {
                console.error('Error adding like:', error);
                return new Response(JSON.stringify({ error: 'Failed to like' }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            action = 'liked';
            shouldNotify = true;
        }

        // If liked, send notification to author
        if (shouldNotify) {
            try {
                // Get inspiration author information
                const { data: inspiration } = await client.database
                    .from('inspirations')
                    .select('user_id, title')
                    .eq('id', inspiration_id)
                    .single();

                if (inspiration && inspiration.user_id !== userData.user.id) {
                    // Get current user's nickname
                    const { data: userProfile } = await client.database
                        .from('profiles')
                        .select('nickname')
                        .eq('id', userData.user.id)
                        .single();

                    const userNickname = userProfile?.nickname || 'Someone';

                    // Create notification
                    await client.database
                        .from('notifications')
                        .insert([{
                            user_id: inspiration.user_id,
                            sender_id: userData.user.id,
                            type: 'like',
                            title: 'Someone liked your inspiration',
                            message: `${userNickname} liked your inspiration "${inspiration.title}"`,
                            related_id: inspiration_id,
                            is_read: false
                        }]);

                    console.log('Notification sent for like');
                }
            } catch (notificationError) {
                console.error('Error sending notification:', notificationError);
                // Notification failure does not affect like operation, continue execution
            }
        }

        // Get updated like count
        const { data: likesCount } = await client.database
            .from('likes')
            .select('id', { count: 'exact' })
            .eq('inspiration_id', inspiration_id);

        return new Response(JSON.stringify({
            success: true,
            action: action,
            likes_count: likesCount?.length || 0
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
