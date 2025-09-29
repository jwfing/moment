// Edge Function: 提交投票，包含计数、过期检查、防重复投票和通知发送
// 处理小组申请投票的完整流程，包括计票、检查通过条件、加入小组和发送通知

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
        const { application_id, vote } = body;

        if (!application_id || typeof vote !== 'boolean') {
            return new Response(JSON.stringify({ error: '缺少必要参数' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 检查申请是否存在且未过期
        const { data: application, error: appError } = await client.database
            .from('group_applications')
            .select('*')
            .eq('id', application_id)
            .eq('status', 'pending')
            .gte('expires_at', new Date().toISOString()) // 检查未过期
            .single();

        if (appError || !application) {
            return new Response(JSON.stringify({ error: '申请不存在、已处理或已过期' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 检查用户是否是小组成员（只有小组成员才能投票）
        const { data: membership } = await client.database
            .from('group_members')
            .select('id')
            .eq('group_id', application.group_id)
            .eq('user_id', userData.user.id)
            .single();

        if (!membership) {
            return new Response(JSON.stringify({ error: '只有小组成员才能投票' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 检查用户是否已经投票（使用新的application_votes表）
        const { data: existingVote } = await client.database
            .from('application_votes')
            .select('id, vote_type')
            .eq('application_id', application_id)
            .eq('voter_id', userData.user.id)
            .single();

        if (existingVote) {
            return new Response(JSON.stringify({
                error: `你已经投过${existingVote.vote_type === 'approve' ? '赞成' : '反对'}票了，不能重复投票或修改投票`
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 提交投票到application_votes表
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
            return new Response(JSON.stringify({ error: '投票失败' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 更新申请的投票计数（只计算赞成票）
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

        // 检查是否达到投票要求（通过条件）
        let applicationApproved = false;
        if (updatedApplication.votes_received >= updatedApplication.votes_needed) {
            try {
                // 申请通过，自动加入小组
                await approveGroupApplication(client, updatedApplication);
                applicationApproved = true;
            } catch (approvalError) {
                console.error('Error approving application:', approvalError);
                // 即使审批失败，投票仍然成功
            }
        }

        // 计算剩余天数
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
            message: vote ? '已投赞成票' : '已投反对票'
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

// 处理申请通过的逻辑
async function approveGroupApplication(client, application) {
    // 将用户添加到小组
    const { error: memberError } = await client.database
        .from('group_members')
        .insert([{
            group_id: application.group_id,
            user_id: application.applicant_id,
            role: 'member'
        }]);

    if (memberError) {
        console.error('Error adding group member:', memberError);
        throw new Error('添加小组成员失败');
    }

    // 获取当前小组信息并更新成员数
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

    // 更新申请状态
    const { error: statusError } = await client.database
        .from('group_applications')
        .update({ status: 'approved' })
        .eq('id', application.id);

    if (statusError) {
        console.error('Error updating application status:', statusError);
    }

    // 发送通过通知给申请者
    try {
        const groupName = currentGroup?.name || '未知小组';

        await client.database
            .from('notifications')
            .insert([{
                recipient_id: application.applicant_id,
                sender_id: null, // 系统通知
                type: 'group_approval',
                title: '申请通过',
                message: `恭喜！您的小组申请已通过，现在您是 "${groupName}" 的成员了`,
                related_inspiration_id: null,
                related_comment_id: application.id
            }]);

        console.log('Approval notification sent to applicant');
    } catch (notificationError) {
        console.error('Error sending approval notification:', notificationError);
        // 通知发送失败不影响主要流程
    }

    console.log('Application approved, user added to group');
}