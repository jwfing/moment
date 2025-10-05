// 多语言配置
const translations = {
    zh: {
        // 通用
        common: {
            appName: 'Moment',
            slogan: '记录你的灵感瞬间',
            login: '登录',
            register: '注册',
            logout: '登出',
            cancel: '取消',
            confirm: '确认',
            save: '保存',
            delete: '删除',
            edit: '编辑',
            search: '搜索',
            loading: '加载中...',
            noData: '暂无数据',
            all: '全部',
            success: '成功',
            error: '错误',
            info: '信息',
            warning: '警告'
        },

        // 首页
        homepage: {
            heroTitle: '记录你的灵感瞬间',
            heroSubtitle: '在灵感闪现的时刻，捕捉每一个珍贵的想法，与志同道合的朋友分享，让思想在小圈子中自由流淌',
            startNow: '立即开始',
            learnMore: '了解更多',
            whyChoose: '为什么选择 Moment？',
            feature1Title: '随时记录你的所思所想',
            feature1Desc: '无论是突然的创意闪现，还是深刻的人生感悟，都能在 Moment 中快速记录，永不错过任何一个珍贵的想法。',
            feature1Item1: '支持文字、图片多媒体记录',
            feature1Item2: '智能分类和标签管理',
            feature1Item3: '心情状态追踪记录',
            feature2Title: '与小圈子私密分享',
            feature2Desc: '创建专属的私密小组，与真正懂你的朋友分享内心的想法。在安全的环境中，让思想碰撞出更多火花。',
            feature2Item1: '私密小组，安全分享',
            feature2Item2: '精准的兴趣匹配',
            feature2Item3: '深度互动，真实连接',
            feature3Title: '民主投票决定成员加入',
            feature3Desc: '每个新成员的加入都由全体组员投票决定，确保小组的品质和氛围。真正的民主，真正的归属感。',
            feature3Item1: '全员参与投票决策',
            feature3Item2: '智能投票门槛调节',
            feature3Item3: '保障小组质量和氛围',
            ctaTitle: '开始你的灵感记录之旅',
            ctaSubtitle: '加入 Moment，让每一个想法都有价值，让每一份灵感都被珍藏',
            ctaRegister: '立即注册',
            ctaLogin: '已有账户？立即登录',
            footerText: '© 2024 Moment. 让灵感永存，让思想发光。',
            inspirationCard1: '突然想到一个创意想法...',
            inspirationCard2: '今天遇到让我感动的事情',
            inspirationCard3: '值得记录的美好瞬间'
        },

        // 认证
        auth: {
            loginTitle: '登录',
            registerTitle: '注册',
            email: '邮箱',
            password: '密码',
            nickname: '昵称',
            loginButton: '登录',
            registerButton: '注册',
            orLoginWith: '或使用以下方式登录',
            loginSuccess: '登录成功！',
            registerSuccess: '注册成功！',
            loginFailed: '登录失败',
            registerFailed: '注册失败',
            invalidEmail: '请输入有效的邮箱地址',
            passwordTooShort: '密码至少需要6个字符',
            nicknameRequired: '请输入昵称'
        },

        // 主应用
        main: {
            recordInspiration: '记录灵感',
            myInspirations: '我的灵感',
            following: '关注',
            discover: '发现',
            groups: '小组',
            notifications: '通知',
            profile: '个人资料',
            settings: '设置'
        },

        // 灵感相关
        inspiration: {
            title: '标题',
            content: '内容',
            category: '分类',
            mood: '心情',
            tags: '标签',
            isPrivate: '设为私密',
            uploadImage: '上传图片',
            categories: {
                idea: '想法',
                quote: '引言',
                reflection: '思考',
                solution: '解决方案'
            },
            moods: {
                excited: '兴奋',
                calm: '平静',
                frustrated: '沮丧',
                hopeful: '充满希望'
            },
            saveSuccess: '灵感保存成功！',
            deleteConfirm: '确定要删除这条灵感吗？',
            deleteSuccess: '灵感已删除',
            editTitle: '编辑灵感',
            createTitle: '记录新灵感',
            placeholder: {
                title: '给你的灵感起个标题...',
                content: '记录你的想法...',
                tags: '输入标签，按回车添加'
            },
            searchPlaceholder: '搜索灵感...',
            allCategories: '所有分类',
            allMoods: '所有心情',
            favoritesOnly: '只看收藏',
            noInspirationsTitle: '还没有记录任何灵感',
            noInspirationsText: '点击"记录灵感"按钮开始记录你的第一个想法吧！',
            recordFirstInspiration: '记录第一个灵感',
            chooseFile: '选择文件',
            noFileChosen: '未选择任何文件'
        },

        // 小组相关
        group: {
            createGroup: '创建小组',
            myGroups: '我的小组',
            joinedGroups: '已加入的小组',
            discoverGroups: '发现小组',
            groupName: '小组名称',
            groupDescription: '小组描述',
            isPrivate: '私密小组',
            maxMembers: '最大成员数',
            members: '成员',
            memberCount: '{count} 位成员',
            apply: '申请加入',
            leave: '退出小组',
            applyMessage: '申请消息',
            applySuccess: '申请已提交',
            createSuccess: '小组创建成功',
            votingThreshold: '投票门槛',
            votingInfo: '小于40人的小组需要超过1/2成员同意，40人及以上需要超过1/3成员同意',
            applicationPending: '申请审核中',
            voteToApprove: '投票通过',
            voteToReject: '投票拒绝',
            noGroups: '你还没有加入任何小组',
            noDiscoverGroups: '暂无可发现的小组',
            noDescription: '暂无描述',
            privateGroupContent: '这是私有小组，只有成员可以查看内容',
            noGroupPosts: '小组内还没有分享的灵感',
            membersCount: '{count} 位成员',
            applyToJoin: '申请加入'
        },

        // 通知相关
        notification: {
            markAsRead: '标记已读',
            markAllAsRead: '全部已读',
            clearAll: '清空通知',
            types: {
                like: '点赞',
                comment: '评论',
                follow: '关注',
                group_application: '入组申请',
                group_approval: '申请通过',
                group_rejection: '申请拒绝'
            },
            noNotifications: '暂无新通知',
            newApplication: '有用户申请加入"{groupName}"小组，请投票决定是否同意。',
            applicationApproved: '恭喜！您加入"{groupName}"小组的申请已通过。',
            applicationRejected: '很遗憾，您加入"{groupName}"小组的申请未通过。',
            unread: '未读',
            reply: '回复'
        },

        // 社交功能
        social: {
            follow: '关注',
            unfollow: '取消关注',
            following: '正在关注',
            followers: '粉丝',
            likes: '点赞',
            comments: '评论',
            reply: '回复',
            share: '分享',
            writeComment: '写下你的评论...',
            viewProfile: '查看主页',
            followingUsers: '我关注的人',
            myFollowers: '关注我的人',
            groupActivity: '小组动态',
            discoverUsers: '发现用户',
            searchUsers: '搜索用户...',
            noFollowing: '你还没有关注任何人',
            noFollowers: '还没有人关注你',
            noGroupInspirations: '还没有小组分享的灵感',
            noDiscoverUsers: '没有更多用户可以发现',
            addComment: '添加评论...',
            loadingComments: '加载评论中...',
            noComments: '还没有评论，来发表第一个评论吧！',
            replyTo: '回复 @{user}...',
            deleteComment: '删除',
            deleteCommentConfirm: '确定要删除这条评论吗？',
            commentDeleted: '评论已删除',
            deleteCommentFailed: '删除评论失败',
            replySuccess: '回复成功',
            replyFailed: '回复失败',
            pleaseEnterReply: '请输入回复内容',
            deleteInspiration: '删除',
            deleteInspirationConfirm: '确定要删除这个灵感吗？此操作无法撤销。',
            deleteInspirationSuccess: '删除成功',
            deleteInspirationFailed: '删除失败',
            likeSuccess: '点赞成功',
            unlikeSuccess: '已取消点赞',
            commentRequired: '请输入评论内容',
            commentSuccess: '评论成功',
            commentFailed: '评论失败',
            pleaseLogin: '请先登录',
            operationFailed: '操作失败',
            operationFailedRetry: '操作失败，请稍后重试',
            unfollowFailed: '取消关注失败',
            unfollowSuccess: '已取消关注',
            shareSuccess: '成功分享到 {count} 个小组',
            shareFailed: '分享失败',
            selectGroupToShare: '请选择要分享到的小组',
            sharedAt: '分享于',
            deleteNotificationConfirm: '确定要删除这条通知吗？',
            deleteNotificationFailed: '删除通知失败',
            notificationDeleted: '通知已删除',
            markAsReadFailed: '标记已读失败',
            markAsReadText: '标记已读',
            allNotificationsMarkedRead: '所有通知已标记为已读',
            clearAllConfirm: '确定要清空所有通知吗？此操作不可撤销。',
            allNotificationsCleared: '所有通知已清空',
            noNotificationsToClear: '没有通知可清除',
            clearNotificationsFailed: '清空通知失败',
            detailCategory: '分类：',
            detailMood: '心情：',
            detailCreatedAt: '创建时间：',
            detailPrivate: '私有',
            detailLocation: '位置：',
            detailWeather: '天气：',
            detailHumidity: '湿度'
        },

        // 错误信息
        errors: {
            networkError: '网络连接失败',
            serverError: '服务器错误',
            unauthorized: '未授权访问',
            notFound: '未找到相关内容',
            invalidInput: '输入无效',
            operationFailed: '操作失败',
            tryAgain: '请稍后重试'
        }
    },

    en: {
        // Common
        common: {
            appName: 'Moment',
            slogan: 'Capture Your Moments of Inspiration',
            login: 'Login',
            register: 'Sign Up',
            logout: 'Logout',
            cancel: 'Cancel',
            confirm: 'Confirm',
            save: 'Save',
            delete: 'Delete',
            edit: 'Edit',
            search: 'Search',
            loading: 'Loading...',
            noData: 'No data',
            all: 'All',
            success: 'Success',
            error: 'Error',
            info: 'Info',
            warning: 'Warning'
        },

        // Homepage
        homepage: {
            heroTitle: 'Capture Your Moments of Inspiration',
            heroSubtitle: 'In moments of inspiration, capture every precious idea, share with like-minded friends, let thoughts flow freely in small circles',
            startNow: 'Start Now',
            learnMore: 'Learn More',
            whyChoose: 'Why Choose Moment?',
            feature1Title: 'Record Your Thoughts Anytime',
            feature1Desc: 'Whether it\'s a sudden creative flash or profound life insights, quickly record them in Moment and never miss any precious idea.',
            feature1Item1: 'Support multimedia recording',
            feature1Item2: 'Smart categorization and tagging',
            feature1Item3: 'Mood tracking and recording',
            feature2Title: 'Private Sharing in Small Circles',
            feature2Desc: 'Create exclusive private groups, share your inner thoughts with friends who truly understand you. Let ideas spark in a safe environment.',
            feature2Item1: 'Private groups, secure sharing',
            feature2Item2: 'Precise interest matching',
            feature2Item3: 'Deep interaction, real connection',
            feature3Title: 'Democratic Voting for New Members',
            feature3Desc: 'Every new member\'s joining is decided by all group members\' votes, ensuring group quality and atmosphere. True democracy, true belonging.',
            feature3Item1: 'All members participate in voting',
            feature3Item2: 'Smart voting threshold adjustment',
            feature3Item3: 'Ensure group quality and atmosphere',
            ctaTitle: 'Start Your Inspiration Journey',
            ctaSubtitle: 'Join Moment, make every thought valuable, let every inspiration be treasured',
            ctaRegister: 'Sign Up Now',
            ctaLogin: 'Already have an account? Login now',
            footerText: '© 2024 Moment. Let inspiration live forever, let thoughts shine.',
            inspirationCard1: 'Suddenly had a creative idea...',
            inspirationCard2: 'Something touching happened today',
            inspirationCard3: 'A beautiful moment worth recording'
        },

        // Authentication
        auth: {
            loginTitle: 'Login',
            registerTitle: 'Sign Up',
            email: 'Email',
            password: 'Password',
            nickname: 'Nickname',
            loginButton: 'Login',
            registerButton: 'Sign Up',
            orLoginWith: 'Or login with',
            loginSuccess: 'Login successful!',
            registerSuccess: 'Registration successful!',
            loginFailed: 'Login failed',
            registerFailed: 'Registration failed',
            invalidEmail: 'Please enter a valid email address',
            passwordTooShort: 'Password must be at least 6 characters',
            nicknameRequired: 'Please enter a nickname'
        },

        // Main App
        main: {
            recordInspiration: 'Record',
            myInspirations: 'My Ideas',
            following: 'Following',
            discover: 'Discover',
            groups: 'Groups',
            notifications: 'Notifications',
            profile: 'Profile',
            settings: 'Settings'
        },

        // Inspiration
        inspiration: {
            title: 'Title',
            content: 'Content',
            category: 'Category',
            mood: 'Mood',
            tags: 'Tags',
            isPrivate: 'Set as Private',
            uploadImage: 'Upload Image',
            categories: {
                idea: 'Idea',
                quote: 'Quote',
                reflection: 'Reflection',
                solution: 'Solution'
            },
            moods: {
                excited: 'Excited',
                calm: 'Calm',
                frustrated: 'Frustrated',
                hopeful: 'Hopeful'
            },
            saveSuccess: 'Inspiration saved successfully!',
            deleteConfirm: 'Are you sure you want to delete this inspiration?',
            deleteSuccess: 'Inspiration deleted',
            editTitle: 'Edit Inspiration',
            createTitle: 'Record New Inspiration',
            placeholder: {
                title: 'Give your inspiration a title...',
                content: 'Record your thoughts...',
                tags: 'Enter tags, press Enter to add'
            },
            searchPlaceholder: 'Search inspirations...',
            allCategories: 'All Categories',
            allMoods: 'All Moods',
            favoritesOnly: 'Favorites Only',
            noInspirationsTitle: 'No inspirations yet',
            noInspirationsText: 'Click "Record Inspiration" to start recording your first thought!',
            recordFirstInspiration: 'Record First Inspiration',
            chooseFile: 'Choose File',
            noFileChosen: 'No file chosen'
        },

        // Groups
        group: {
            createGroup: 'Create Group',
            myGroups: 'My Groups',
            joinedGroups: 'Joined Groups',
            discoverGroups: 'Discover Groups',
            groupName: 'Group Name',
            groupDescription: 'Group Description',
            isPrivate: 'Private Group',
            maxMembers: 'Max Members',
            members: 'Members',
            memberCount: '{count} members',
            apply: 'Apply to Join',
            leave: 'Leave Group',
            applyMessage: 'Application Message',
            applySuccess: 'Application submitted',
            createSuccess: 'Group created successfully',
            votingThreshold: 'Voting Threshold',
            votingInfo: 'Groups with less than 40 members need over 1/2 approval, 40+ members need over 1/3 approval',
            applicationPending: 'Application under review',
            voteToApprove: 'Vote to Approve',
            voteToReject: 'Vote to Reject',
            noGroups: 'You have not joined any groups yet',
            noDiscoverGroups: 'No groups to discover',
            noDescription: 'No description',
            privateGroupContent: 'This is a private group, only members can view the content',
            noGroupPosts: 'No shared inspirations in this group yet',
            membersCount: '{count} members',
            applyToJoin: 'Apply to Join'
        },

        // Notifications
        notification: {
            markAsRead: 'Mark as Read',
            markAllAsRead: 'Mark All as Read',
            clearAll: 'Clear All',
            types: {
                like: 'Like',
                comment: 'Comment',
                follow: 'Follow',
                group_application: 'Group Application',
                group_approval: 'Application Approved',
                group_rejection: 'Application Rejected'
            },
            noNotifications: 'No new notifications',
            newApplication: 'A user has applied to join "{groupName}" group, please vote to decide.',
            applicationApproved: 'Congratulations! Your application to join "{groupName}" has been approved.',
            applicationRejected: 'Sorry, your application to join "{groupName}" has been rejected.',
            unread: 'Unread',
            reply: 'Reply'
        },

        // Social
        social: {
            follow: 'Follow',
            unfollow: 'Unfollow',
            following: 'Following',
            followers: 'Followers',
            likes: 'Likes',
            comments: 'Comments',
            reply: 'Reply',
            share: 'Share',
            writeComment: 'Write your comment...',
            viewProfile: 'View Profile',
            followingUsers: 'People I Follow',
            myFollowers: 'My Followers',
            groupActivity: 'Group Activity',
            discoverUsers: 'Discover Users',
            searchUsers: 'Search users...',
            noFollowing: 'You are not following anyone yet',
            noFollowers: 'No one is following you yet',
            noGroupInspirations: 'No group shared inspirations yet',
            noDiscoverUsers: 'No more users to discover',
            addComment: 'Add a comment...',
            loadingComments: 'Loading comments...',
            noComments: 'No comments yet, be the first to comment!',
            replyTo: 'Reply to @{user}...',
            deleteComment: 'Delete',
            deleteCommentConfirm: 'Are you sure you want to delete this comment?',
            commentDeleted: 'Comment deleted',
            deleteCommentFailed: 'Failed to delete comment',
            replySuccess: 'Reply posted',
            replyFailed: 'Failed to post reply',
            pleaseEnterReply: 'Please enter reply content',
            deleteInspiration: 'Delete',
            deleteInspirationConfirm: 'Are you sure you want to delete this inspiration? This action cannot be undone.',
            deleteInspirationSuccess: 'Inspiration deleted',
            deleteInspirationFailed: 'Failed to delete inspiration',
            likeSuccess: 'Liked',
            unlikeSuccess: 'Unliked',
            commentRequired: 'Please enter a comment',
            commentSuccess: 'Comment added',
            commentFailed: 'Failed to add comment',
            pleaseLogin: 'Please login first',
            operationFailed: 'Operation failed',
            operationFailedRetry: 'Operation failed, please try again later',
            unfollowFailed: 'Failed to unfollow',
            unfollowSuccess: 'Unfollowed',
            shareSuccess: 'Shared to {count} groups',
            shareFailed: 'Failed to share',
            selectGroupToShare: 'Please select groups to share',
            sharedAt: 'Shared at',
            deleteNotificationConfirm: 'Are you sure you want to delete this notification?',
            deleteNotificationFailed: 'Failed to delete notification',
            notificationDeleted: 'Notification deleted',
            markAsReadFailed: 'Failed to mark as read',
            markAsReadText: 'Mark as read',
            allNotificationsMarkedRead: 'All notifications marked as read',
            clearAllConfirm: 'Are you sure you want to clear all notifications? This action cannot be undone.',
            allNotificationsCleared: 'All notifications cleared',
            noNotificationsToClear: 'No notifications to clear',
            clearNotificationsFailed: 'Failed to clear notifications',
            detailCategory: 'Category: ',
            detailMood: 'Mood: ',
            detailCreatedAt: 'Created: ',
            detailPrivate: 'Private',
            detailLocation: 'Location: ',
            detailWeather: 'Weather: ',
            detailHumidity: 'Humidity'
        },

        // Errors
        errors: {
            networkError: 'Network connection failed',
            serverError: 'Server error',
            unauthorized: 'Unauthorized access',
            notFound: 'Content not found',
            invalidInput: 'Invalid input',
            operationFailed: 'Operation failed',
            tryAgain: 'Please try again later'
        }
    }
};

// i18n 管理器
class I18nManager {
    constructor() {
        this.currentLang = localStorage.getItem('language') || 'en';
        this.translations = translations;
    }

    // 获取当前语言
    getCurrentLang() {
        return this.currentLang;
    }

    // 设置语言
    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('language', lang);
            document.documentElement.lang = lang;
            this.updatePageContent();
            return true;
        }
        return false;
    }

    // 获取翻译
    t(key, params = {}) {
        const keys = key.split('.');
        let value = this.translations[this.currentLang];

        for (const k of keys) {
            if (value && value[k]) {
                value = value[k];
            } else {
                // 如果找不到翻译，返回 key 本身
                return key;
            }
        }

        // 替换参数
        if (typeof value === 'string') {
            Object.keys(params).forEach(param => {
                value = value.replace(`{${param}}`, params[param]);
            });
        }

        return value;
    }

    // 更新页面上的静态文本
    updatePageContent() {
        // 更新所有带有 data-i18n 属性的元素
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);

            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translation;
            } else if (element.hasAttribute('placeholder')) {
                element.placeholder = translation;
            } else if (element.tagName === 'OPTION') {
                // 特殊处理 select option 元素
                element.textContent = translation;
            } else {
                // 处理包含HTML的特殊情况
                if (key === 'homepage.ctaLogin') {
                    // 特殊处理包含链接的文本
                    const parts = translation.split('<a');
                    if (parts.length > 1) {
                        element.innerHTML = translation;
                    } else {
                        // 对于英文版本，重新构造HTML
                        if (this.currentLang === 'en') {
                            element.innerHTML = 'Already have an account? <a href="#" onclick="showLogin()">Login now</a>';
                        } else {
                            element.innerHTML = '已有账户？<a href="#" onclick="showLogin()">立即登录</a>';
                        }
                    }
                } else {
                    element.textContent = translation;
                }
            }
        });

        // 更新带有 data-i18n-title 的元素标题
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });

        // 触发自定义事件，让应用更新动态内容
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: this.currentLang }
        }));
    }

    // 获取可用语言列表
    getAvailableLanguages() {
        return [
            { code: 'zh', name: '中文', nativeName: '简体中文' },
            { code: 'en', name: 'English', nativeName: 'English' }
        ];
    }
}

// 创建全局实例
const i18n = new I18nManager();

// 导出给其他模块使用
window.i18n = i18n;
window.t = (key, params) => i18n.t(key, params);