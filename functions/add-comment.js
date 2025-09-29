// Edge Function: 添加评论，包含通知发送
// 处理评论操作的完整流程，包括发送站内通知和处理@提及

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
        const { inspiration_id, content, parent_comment_id = null } = body;

        if (!inspiration_id || !content?.trim()) {
            return new Response(JSON.stringify({ error: '缺少必要参数' }), {
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

        // 添加评论到数据库
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
            return new Response(JSON.stringify({ error: '评论失败' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 获取当前用户信息用于通知
        const { data: userProfile } = await client.database
            .from('profiles')
            .select('nickname')
            .eq('id', userData.user.id)
            .single();

        const userNickname = userProfile?.nickname || '某位用户';

        // 1. 发送评论通知给灵感作者
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
                        title: '有人评论了你的灵感',
                        message: `${userNickname} 评论了你的灵感 "${inspiration.title}": ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                        related_id: inspiration_id,
                        is_read: false
                    }]);

                console.log('Notification sent to inspiration owner');
            }
        } catch (notificationError) {
            console.error('Error sending comment notification:', notificationError);
        }

        // 2. 如果是回复评论，发送通知给被回复的用户
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
                            title: '有人回复了你的评论',
                            message: `${userNickname} 回复了你的评论: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                            related_id: inspiration_id,
                            is_read: false
                        }]);

                    console.log('Notification sent to parent comment owner');
                }
            } catch (notificationError) {
                console.error('Error sending reply notification:', notificationError);
            }
        }

        // 3. 发送@提及通知
        if (mentions.length > 0) {
            try {
                // 查找被提及的用户
                const { data: mentionedUsers } = await client.database
                    .from('profiles')
                    .select('id, nickname')
                    .in('nickname', mentions);

                if (mentionedUsers && mentionedUsers.length > 0) {
                    const mentionNotifications = mentionedUsers
                        .filter(user => user.id !== userData.user.id) // 排除自己
                        .map(user => ({
                            user_id: user.id,
                            sender_id: userData.user.id,
                            type: 'mention',
                            title: '有人在评论中提到了你',
                            message: `${userNickname} 在评论中提到了你: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
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

        // 返回成功结果，包含新创建的评论
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
            error: '内部服务器错误',
            details: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
};