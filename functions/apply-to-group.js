// Edge Function: 申请加入小组，包含通知发送和过期时间控制
// 处理小组申请的完整流程，包括发送通知给所有小组成员和过期时间设置

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
        const { group_id, message } = body;

        if (!group_id || !message?.trim()) {
            return new Response(JSON.stringify({ error: '缺少必要参数' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 获取小组信息和成员数量
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
            return new Response(JSON.stringify({ error: '小组不存在或获取失败' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 检查是否已经是成员
        const { data: existingMember } = await client.database
            .from('group_members')
            .select('id')
            .eq('group_id', group_id)
            .eq('user_id', userData.user.id)
            .single();

        if (existingMember) {
            return new Response(JSON.stringify({ error: '你已经是该小组成员' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 检查是否已有待处理的申请（包括过期检查）
        const { data: existingApplication } = await client.database
            .from('group_applications')
            .select('id, expires_at')
            .eq('group_id', group_id)
            .eq('applicant_id', userData.user.id)
            .eq('status', 'pending')
            .gte('expires_at', new Date().toISOString()) // 只检查未过期的申请
            .single();

        if (existingApplication) {
            return new Response(JSON.stringify({ error: '你已有一个待处理的申请' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 获取小组成员数量
        const { data: memberCountData } = await client.database
            .from('group_members')
            .select('id', { count: 'exact' })
            .eq('group_id', group_id);

        const memberCount = memberCountData?.length || 1;

        // 计算需要的票数
        let votesNeeded;
        if (memberCount < 40) {
            votesNeeded = Math.ceil(memberCount / 2);
        } else {
            votesNeeded = Math.ceil(memberCount / 3);
        }

        // 设置过期时间（一个月后）
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        // 创建申请
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
            return new Response(JSON.stringify({ error: '申请创建失败' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 发送通知给所有小组成员
        try {
            // 获取小组所有成员
            const { data: members, error: membersError } = await client.database
                .from('group_members')
                .select('user_id')
                .eq('group_id', group_id);

            if (membersError) {
                console.error('Error fetching group members:', membersError);
            } else if (members && members.length > 0) {
                // 获取当前用户的昵称
                const { data: userProfile } = await client.database
                    .from('users')
                    .select('nickname')
                    .eq('id', userData.user.id)
                    .single();

                const applicantName = userProfile?.nickname || userData.user.email;
                const groupName = groupData.name;

                // 计算剩余天数
                const daysRemaining = Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24));

                // 为每个成员创建通知
                const notifications = members
                    .filter(member => member.user_id !== userData.user.id) // 排除申请人自己
                    .map(member => ({
                        recipient_id: member.user_id,
                        sender_id: userData.user.id,
                        type: 'group_application',
                        title: '新的小组申请',
                        message: `${applicantName} 申请加入小组 "${groupName}"，请在${daysRemaining}天内投票决定是否同意`,
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
            // 通知发送失败不影响申请创建，继续执行
        }

        return new Response(JSON.stringify({
            success: true,
            application: application,
            message: `申请已提交，等待小组成员投票。申请将在一个月后（${new Date(expiresAt).toLocaleDateString()}）过期`
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