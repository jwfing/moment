// Edge Function: 点赞/取消点赞灵感，包含通知发送
// 处理点赞操作的完整流程，包括发送站内通知

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
        return new Response(JSON.stringify({ error: '仅支持 POST 请求' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    try {
        // Extract token from request headers
        const authHeader = request.headers.get('Authorization');
        const userToken = authHeader ? authHeader.replace('Bearer ', '') : null;

        if (!userToken) {
            return new Response(JSON.stringify({ error: '未授权访问' }), {
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
            return new Response(JSON.stringify({ error: '用户认证失败' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Parse request body
        const body = await request.json();
        const { inspiration_id } = body;

        if (!inspiration_id) {
            return new Response(JSON.stringify({ error: '缺少灵感ID' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 检查是否已经点赞
        const { data: existingLike } = await client.database
            .from('likes')
            .select('id')
            .eq('inspiration_id', inspiration_id)
            .eq('user_id', userData.user.id)
            .single();

        let action = '';
        let shouldNotify = false;

        if (existingLike) {
            // 取消点赞
            const { error } = await client.database
                .from('likes')
                .delete()
                .eq('inspiration_id', inspiration_id)
                .eq('user_id', userData.user.id);

            if (error) {
                console.error('Error removing like:', error);
                return new Response(JSON.stringify({ error: '取消点赞失败' }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            action = 'unliked';
        } else {
            // 添加点赞
            const { error } = await client.database
                .from('likes')
                .insert([{
                    inspiration_id: inspiration_id,
                    user_id: userData.user.id
                }]);

            if (error) {
                console.error('Error adding like:', error);
                return new Response(JSON.stringify({ error: '点赞失败' }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            action = 'liked';
            shouldNotify = true;
        }

        // 如果是点赞，发送通知给作者
        if (shouldNotify) {
            try {
                // 获取灵感作者信息
                const { data: inspiration } = await client.database
                    .from('inspirations')
                    .select('user_id, title')
                    .eq('id', inspiration_id)
                    .single();

                if (inspiration && inspiration.user_id !== userData.user.id) {
                    // 获取当前用户的昵称
                    const { data: userProfile } = await client.database
                        .from('profiles')
                        .select('nickname')
                        .eq('id', userData.user.id)
                        .single();

                    const userNickname = userProfile?.nickname || '某位用户';

                    // 创建通知
                    await client.database
                        .from('notifications')
                        .insert([{
                            user_id: inspiration.user_id,
                            sender_id: userData.user.id,
                            type: 'like',
                            title: '有人点赞了你的灵感',
                            message: `${userNickname} 点赞了你的灵感 "${inspiration.title}"`,
                            related_id: inspiration_id,
                            is_read: false
                        }]);

                    console.log('Notification sent for like');
                }
            } catch (notificationError) {
                console.error('Error sending notification:', notificationError);
                // 通知发送失败不影响点赞操作，继续执行
            }
        }

        // 获取更新后的点赞统计
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
            error: '内部服务器错误',
            details: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
};