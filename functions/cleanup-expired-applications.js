// Edge Function: 定期清理过期申请
// 处理过期申请的清理，更新状态为 'expired' 并发送通知

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

        const currentTime = new Date().toISOString();

        // 查找所有过期的待处理申请
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
            return new Response(JSON.stringify({ error: '查找过期申请失败' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (!expiredApplications || expiredApplications.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                message: '没有找到过期的申请',
                expired_count: 0
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 更新过期申请的状态
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
            return new Response(JSON.stringify({ error: '更新过期申请状态失败' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 为每个过期申请发送通知
        const notifications = [];
        for (const application of expiredApplications) {
            const groupName = application.groups?.name || '未知小组';

            notifications.push({
                recipient_id: application.applicant_id,
                sender_id: null, // 系统通知
                type: 'group_application_expired',
                title: '申请已过期',
                message: `很遗憾，您申请加入小组 "${groupName}" 的申请已过期。您可以重新提交申请。`,
                related_inspiration_id: null,
                related_comment_id: application.id
            });
        }

        // 批量发送通知
        if (notifications.length > 0) {
            const { error: notificationError } = await client.database
                .from('notifications')
                .insert(notifications);

            if (notificationError) {
                console.error('Error sending expiration notifications:', notificationError);
                // 通知发送失败不影响主要流程
            } else {
                console.log(`Sent expiration notifications to ${notifications.length} applicants`);
            }
        }

        // 清理相关的投票记录（可选，根据业务需求决定是否保留历史记录）
        const { error: voteCleanupError } = await client.database
            .from('application_votes')
            .delete()
            .in('application_id', applicationIds);

        if (voteCleanupError) {
            console.error('Error cleaning up votes:', voteCleanupError);
            // 投票清理失败不影响主要流程
        }

        return new Response(JSON.stringify({
            success: true,
            message: `成功处理了 ${expiredApplications.length} 个过期申请`,
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
            error: '内部服务器错误',
            details: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
};