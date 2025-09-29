import { createClient } from '@insforge/sdk';

// Initialize InsForge client
const client = createClient({
    baseUrl: 'https://3wppa5bh.us-east.insforge.app'
});

// Global state
let currentUser = null;
let currentEditingInspiration = null;
let inspirations = [];
let filteredInspirations = [];

// Social state
let myGroups = [];
let discoverGroups = [];
let followingUsers = [];
let followerUsers = [];
let discoverUsers = [];
let groupInspirations = [];
let currentActiveTab = 'personal';
let currentSharingInspiration = null;
let selectedGroups = [];

// Notifications state
let notifications = [];
let unreadNotificationCount = 0;
let currentNotificationFilter = 'all';

// Page elements
const loginPage = document.getElementById('loginPage');
const mainPage = document.getElementById('mainPage');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const inspirationModal = document.getElementById('inspirationModal');
const inspirationDetailModal = document.getElementById('inspirationDetailModal');
const inspirationForm = document.getElementById('inspirationForm');

// 首页功能
function showHomepage() {
    document.getElementById('homePage').classList.remove('hidden');
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainApp').classList.add('hidden');
}

function showLogin() {
    document.getElementById('homePage').classList.add('hidden');
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');

    // 设置为登录标签页
    const loginTab = document.querySelector('[data-tab="login"]');
    if (loginTab) loginTab.click();
}

function showRegister() {
    document.getElementById('homePage').classList.add('hidden');
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');

    // 设置为注册标签页
    const registerTab = document.querySelector('[data-tab="register"]');
    if (registerTab) registerTab.click();
}

function scrollToFeatures() {
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
        featuresSection.scrollIntoView({
            behavior: 'smooth'
        });
    }
}

function showMainApp() {
    document.getElementById('homePage').classList.add('hidden');
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
}

// 检查用户登录状态并显示相应页面
async function checkAuthStatus() {
    try {
        const { data: session } = await client.auth.getCurrentSession();

        if (session?.session?.accessToken) {
            // 用户已登录，获取用户信息并显示主应用
            const { data: userData } = await client.auth.getCurrentUser();
            if (userData?.user) {
                currentUser = userData;
                showMainApp();
                await loadInspirations();
                return true;
            }
        }

        // 用户未登录，显示首页
        showHomepage();
        return false;
    } catch (error) {
        console.error('检查登录状态失败:', error);
        showHomepage();
        return false;
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    setupEventListeners();

    // 初始化多语言
    if (window.i18n) {
        window.i18n.updatePageContent();
        updateLanguageDisplay();
    }

    // 先检查登录状态，根据状态决定显示哪个页面
    const isLoggedIn = await checkAuthStatus();

    if (!isLoggedIn) {
        // 用户未登录，重新初始化图标（为首页）
        lucide.createIcons();
    }
});

// Setup event listeners
function setupEventListeners() {
    // Auth tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchAuthTab(btn.dataset.tab));
    });

    // Auth forms
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);

    // OAuth buttons
    document.getElementById('googleLogin').addEventListener('click', () => handleOAuthLogin('google'));
    document.getElementById('githubLogin').addEventListener('click', () => handleOAuthLogin('github'));

    // Main page actions
    document.getElementById('addInspirationBtn').addEventListener('click', () => showInspirationModal());
    document.getElementById('inboxBtn').addEventListener('click', () => switchTab('notifications'));
    document.getElementById('userMenuBtn').addEventListener('click', toggleUserMenu);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Search and filters
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('searchBtn').addEventListener('click', handleSearch);
    document.getElementById('categoryFilter').addEventListener('change', handleFilter);
    document.getElementById('moodFilter').addEventListener('change', handleFilter);
    document.getElementById('favoritesOnlyBtn').addEventListener('click', toggleFavoritesFilter);

    // Inspiration form
    inspirationForm.addEventListener('submit', handleInspirationSubmit);

    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            hideInspirationModal();
            hideDetailModal();
        }
        if (!e.target.closest('.user-menu')) {
            hideUserMenu();
        }
    });
}

// Check authentication state
async function checkAuthState() {
    try {
        const { data, error } = await client.auth.getCurrentUser();
        if (data && data.user) {
            currentUser = data;
            showMainPage();
            await loadInspirations();
        } else {
            showLoginPage();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showLoginPage();
    }
}

// Auth functions
function switchAuthTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.form-content').forEach(form => form.classList.remove('active'));

    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}Form`).classList.add('active');
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        showLoading(true);
        const { data, error } = await client.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            showToast(error.message || '登录失败', 'error');
            return;
        }

        currentUser = data;
        showToast('auth.loginSuccess', 'success');
        showMainApp();
        await loadInspirations();
    } catch (error) {
        console.error('Login error:', error);
        showToast('登录失败，请稍后重试', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const nickname = document.getElementById('registerNickname').value;

    try {
        showLoading(true);

        // Sign up
        const { data: authData, error: authError } = await client.auth.signUp({
            email,
            password
        });

        if (authError) {
            showToast(authError.message || '注册失败', 'error');
            return;
        }

        // Update profile
        await client.auth.setProfile({
            nickname,
            bio: '灵感记录者'
        });

        currentUser = authData;
        showToast('auth.registerSuccess', 'success');
        showMainApp();
        await loadInspirations();
    } catch (error) {
        console.error('Register error:', error);
        showToast('注册失败，请稍后重试', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleOAuthLogin(provider) {
    try {
        const { data, error } = await client.auth.signInWithOAuth({
            provider,
            redirectTo: window.location.origin,
            skipBrowserRedirect: true
        });

        if (error) {
            showToast(error.message || 'OAuth登录失败', 'error');
            return;
        }

        if (data?.url) {
            window.location.href = data.url;
        }
    } catch (error) {
        console.error('OAuth error:', error);
        showToast('OAuth登录失败，请稍后重试', 'error');
    }
}

async function handleLogout() {
    try {
        await client.auth.signOut();
        currentUser = null;
        inspirations = [];
        showLoginPage();
        showToast('已退出登录', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showToast('退出登录失败', 'error');
    }
}

// Page navigation
function showLoginPage() {
    loginPage.classList.remove('hidden');
    mainPage.classList.add('hidden');
}

function showMainPage() {
    console.log('showMainPage called');
    loginPage.classList.add('hidden');
    mainPage.classList.remove('hidden');
    updateUserInfo();

    // 初始化社交功能
    console.log('Initializing social features...');
    initializeSocialFeatures();

    // 初始化通知系统
    console.log('Initializing notifications...');
    initializeNotifications();
}

function updateUserInfo() {
    if (currentUser?.profile) {
        document.getElementById('userNickname').textContent = currentUser.profile.nickname || currentUser.user.email;
        const avatarImg = document.getElementById('userAvatarImg');
        avatarImg.src = currentUser.profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.profile.nickname || currentUser.user.email)}&background=667eea&color=fff`;
    }
}

// User menu
function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('hidden');
}

function hideUserMenu() {
    document.getElementById('userDropdown').classList.add('hidden');
}

// Load and display inspirations
async function loadInspirations() {
    try {
        showLoading(true);
        const { data, error } = await client.database
            .from('inspirations')
            .select('*')
            .eq('user_id', currentUser.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            showToast('加载灵感失败', 'error');
            return;
        }

        inspirations = data || [];
        filteredInspirations = [...inspirations];
        renderInspirations();
    } catch (error) {
        console.error('Load inspirations error:', error);
        showToast('加载灵感失败', 'error');
    } finally {
        showLoading(false);
    }
}

function renderInspirations() {
    const container = document.getElementById('inspirationsList');
    const emptyState = document.getElementById('emptyState');

    if (filteredInspirations.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    container.innerHTML = filteredInspirations.map(inspiration => `
        <div class="inspiration-card ${inspiration.is_favorite ? 'favorite' : ''}"
             onclick="showInspirationDetail('${inspiration.id}')">
            <div class="card-header">
                <h3 class="card-title">${escapeHtml(inspiration.title)}</h3>
            </div>
            <div class="card-meta">
                <span class="card-tag">${getCategoryName(inspiration.category)}</span>
                <span class="card-tag">${getMoodName(inspiration.mood)}</span>
                ${inspiration.is_private ? '<span class="card-tag">私有</span>' : ''}
            </div>
            ${inspiration.image_url ? `<img src="${inspiration.image_url}" alt="灵感图片" class="card-image">` : ''}
            <div class="card-content">${escapeHtml(inspiration.content)}</div>
            ${inspiration.tags && inspiration.tags.length > 0 ? `
                <div class="card-footer">
                    <div class="card-tags">
                        ${inspiration.tags.map(tag => `<span class="card-tag">#${escapeHtml(tag)}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
            ${inspiration.location_city || inspiration.weather_condition ? `
                <div class="card-context">
                    ${inspiration.location_city ? `<span class="location-info">${lucideIcon('map-pin')} ${escapeHtml(inspiration.location_city)}</span>` : ''}
                    ${inspiration.weather_condition ? `
                        <span class="weather-info">
                            ${lucideIcon('cloud')} ${escapeHtml(inspiration.weather_condition)}
                            ${inspiration.weather_temperature !== null ? ` ${inspiration.weather_temperature}°C` : ''}
                        </span>
                    ` : ''}
                </div>
            ` : ''}
            <div class="card-footer">
                <span>${formatDate(inspiration.created_at)}</span>
                <div class="card-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); toggleFavorite('${inspiration.id}')">
                        ${inspiration.is_favorite ? lucideIcon('star', 'star-filled') : lucideIcon('star')}
                    </button>
                    <button class="btn-icon" onclick="event.stopPropagation(); editInspiration('${inspiration.id}')">${lucideIcon('edit')}</button>
                    <button class="btn-icon" onclick="event.stopPropagation(); deleteInspiration('${inspiration.id}')">${lucideIcon('trash-2')}</button>
                </div>
            </div>
        </div>
    `).join('');

    // 重新初始化 Lucide 图标
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Search and filter
function handleSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    applyFilters();
}

function handleFilter() {
    applyFilters();
}

function toggleFavoritesFilter() {
    const btn = document.getElementById('favoritesOnlyBtn');
    btn.classList.toggle('active');
    applyFilters();
}

function applyFilters() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    const moodFilter = document.getElementById('moodFilter').value;
    const favoritesOnly = document.getElementById('favoritesOnlyBtn').classList.contains('active');

    filteredInspirations = inspirations.filter(inspiration => {
        // Search filter
        if (searchQuery && !inspiration.title.toLowerCase().includes(searchQuery) &&
            !inspiration.content.toLowerCase().includes(searchQuery)) {
            return false;
        }

        // Category filter
        if (categoryFilter && inspiration.category !== categoryFilter) {
            return false;
        }

        // Mood filter
        if (moodFilter && inspiration.mood !== moodFilter) {
            return false;
        }

        // Favorites filter
        if (favoritesOnly && !inspiration.is_favorite) {
            return false;
        }

        return true;
    });

    renderInspirations();
}

// Inspiration CRUD operations
function showInspirationModal(inspiration = null) {
    currentEditingInspiration = inspiration;
    const modal = document.getElementById('inspirationModal');
    const title = document.getElementById('modalTitle');

    if (inspiration) {
        title.textContent = '编辑灵感';
        fillInspirationForm(inspiration);
    } else {
        title.textContent = '记录灵感';
        inspirationForm.reset();
    }

    modal.classList.remove('hidden');
}

function hideInspirationModal() {
    document.getElementById('inspirationModal').classList.add('hidden');
    currentEditingInspiration = null;
    inspirationForm.reset();
}

function fillInspirationForm(inspiration) {
    document.getElementById('inspirationTitle').value = inspiration.title;
    document.getElementById('inspirationContent').value = inspiration.content;
    document.getElementById('inspirationCategory').value = inspiration.category;
    document.getElementById('inspirationMood').value = inspiration.mood;
    document.getElementById('inspirationTags').value = inspiration.tags ? inspiration.tags.join(', ') : '';
    document.getElementById('isPrivate').checked = inspiration.is_private;
}

async function handleInspirationSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('inspirationTitle').value;
    const content = document.getElementById('inspirationContent').value;
    const category = document.getElementById('inspirationCategory').value;
    const mood = document.getElementById('inspirationMood').value;
    const tagsInput = document.getElementById('inspirationTags').value;
    const isPrivate = document.getElementById('isPrivate').checked;
    const imageFile = document.getElementById('inspirationImage').files[0];

    try {
        showLoading(true);

        let imageUrl = currentEditingInspiration?.image_url || null;

        // Upload image if provided
        if (imageFile) {
            const { data: uploadData, error: uploadError } = await client.storage
                .from('inspiration-files')
                .uploadAuto(imageFile);

            if (uploadError) {
                showToast('图片上传失败', 'error');
                return;
            }

            imageUrl = uploadData.url;
        }

        const inspirationData = {
            title,
            content,
            category,
            mood,
            tags: tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
            is_private: isPrivate,
            image_url: imageUrl,
            user_id: currentUser.user.id
        };

        if (currentEditingInspiration) {
            // Update existing inspiration
            const { data, error } = await client.database
                .from('inspirations')
                .update(inspirationData)
                .eq('id', currentEditingInspiration.id)
                .select()
                .single();

            if (error) {
                showToast('更新灵感失败', 'error');
                return;
            }

            showToast('灵感更新成功！', 'success');
        } else {
            // Create new inspiration with location and weather info
            const { data: functionResult, error } = await client.functions.invoke('create-inspiration', {
                body: inspirationData
            });

            if (error) {
                console.error('Function invoke error:', error);
                showToast('保存灵感失败', 'error');
                return;
            }

            if (!functionResult.success) {
                console.error('Function returned error:', functionResult.error);
                showToast(functionResult.error || '保存灵感失败', 'error');
                return;
            }

            // Show success message with location and weather info
            let successMessage = '灵感记录成功！';
            if (functionResult.location && functionResult.location.city) {
                successMessage += ` 📍 ${functionResult.location.city}`;
            }
            if (functionResult.weather && functionResult.weather.condition) {
                successMessage += ` ☁️ ${functionResult.weather.condition}`;
                if (functionResult.weather.temperature !== null) {
                    successMessage += ` ${functionResult.weather.temperature}°C`;
                }
            }

            showToast(successMessage, 'success');
        }

        hideInspirationModal();
        await loadInspirations();
    } catch (error) {
        console.error('Save inspiration error:', error);
        showToast('操作失败，请稍后重试', 'error');
    } finally {
        showLoading(false);
    }
}

function editInspiration(id) {
    const inspiration = inspirations.find(i => i.id === id);
    if (inspiration) {
        showInspirationModal(inspiration);
    }
}

async function deleteInspiration(id) {
    if (!confirm('确定要删除这个灵感吗？此操作无法撤销。')) {
        return;
    }

    try {
        showLoading(true);
        const { error } = await client.database
            .from('inspirations')
            .delete()
            .eq('id', id);

        if (error) {
            showToast('删除失败', 'error');
            return;
        }

        showToast('删除成功', 'success');
        await loadInspirations();
    } catch (error) {
        console.error('Delete inspiration error:', error);
        showToast('删除失败', 'error');
    } finally {
        showLoading(false);
    }
}

async function toggleFavorite(id) {
    const inspiration = inspirations.find(i => i.id === id);
    if (!inspiration) return;

    try {
        const { error } = await client.database
            .from('inspirations')
            .update({ is_favorite: !inspiration.is_favorite })
            .eq('id', id);

        if (error) {
            showToast('操作失败', 'error');
            return;
        }

        await loadInspirations();
    } catch (error) {
        console.error('Toggle favorite error:', error);
        showToast('操作失败', 'error');
    }
}

// Inspiration detail modal
function showInspirationDetail(id) {
    const inspiration = inspirations.find(i => i.id === id);
    if (!inspiration) return;

    document.getElementById('detailTitle').textContent = inspiration.title;
    document.getElementById('detailContent').textContent = inspiration.content;

    document.getElementById('detailMeta').innerHTML = `
        <span>分类：${getCategoryName(inspiration.category)}</span>
        <span>心情：${getMoodName(inspiration.mood)}</span>
        <span>创建时间：${formatDate(inspiration.created_at)}</span>
        ${inspiration.is_private ? '<span>私有</span>' : ''}
        ${inspiration.location_city ? `<span>${lucideIcon('map-pin')} 位置：${escapeHtml(inspiration.location_city)}</span>` : ''}
        ${inspiration.weather_condition ? `
            <span>${lucideIcon('cloud')} 天气：${escapeHtml(inspiration.weather_condition)}
                ${inspiration.weather_temperature !== null ? ` (${inspiration.weather_temperature}°C)` : ''}
                ${inspiration.weather_humidity !== null ? ` 湿度${inspiration.weather_humidity}%` : ''}
            </span>
        ` : ''}
    `;

    if (inspiration.tags && inspiration.tags.length > 0) {
        document.getElementById('detailTags').innerHTML = inspiration.tags
            .map(tag => `<span class="detail-tag">#${escapeHtml(tag)}</span>`)
            .join('');
    } else {
        document.getElementById('detailTags').innerHTML = '';
    }

    if (inspiration.image_url) {
        document.getElementById('detailImage').innerHTML = `<img src="${inspiration.image_url}" alt="灵感图片">`;
    } else {
        document.getElementById('detailImage').innerHTML = '';
    }

    // Setup action buttons
    document.getElementById('favoriteBtn').onclick = () => toggleFavorite(id);
    document.getElementById('editBtn').onclick = () => {
        hideDetailModal();
        editInspiration(id);
    };
    document.getElementById('deleteBtn').onclick = () => {
        hideDetailModal();
        deleteInspiration(id);
    };

    // Load comments and likes for this inspiration
    loadCommentsAndLikes(id);

    document.getElementById('inspirationDetailModal').classList.remove('hidden');
}

// Comments and likes functionality
async function loadCommentsAndLikes(inspirationId) {
    try {
        // Load likes count and check if current user liked
        const { data: likes, error: likesError } = await client.database
            .from('likes')
            .select('*')
            .eq('inspiration_id', inspirationId);

        if (likesError) {
            console.error('Error loading likes:', likesError);
        } else {
            const likeCount = likes.length;
            const userLiked = likes.some(like => like.user_id === currentUser?.user?.id);

            document.getElementById('likeCount').textContent = likeCount;
            const likeBtn = document.getElementById('likeBtn');
            likeBtn.classList.toggle('liked', userLiked);
            likeBtn.onclick = () => toggleLike(inspirationId);
        }

        // Load comments with user info
        const { data: comments, error: commentsError } = await client.database
            .from('comments')
            .select(`
                *,
                users!inner(id, nickname, avatar_url)
            `)
            .eq('inspiration_id', inspirationId)
            .order('created_at', { ascending: true });

        if (commentsError) {
            console.error('Error loading comments:', commentsError);
        } else {
            displayComments(comments);
        }

        // Setup comment form
        const commentForm = document.getElementById('addCommentForm');
        commentForm.onsubmit = (e) => handleCommentSubmit(e, inspirationId);

    } catch (error) {
        console.error('Error loading comments and likes:', error);
    }
}

async function toggleLike(inspirationId) {
    if (!currentUser?.user?.id) {
        showToast('请先登录');
        return;
    }

    try {
        const likeBtn = document.getElementById('likeBtn');
        const isLiked = likeBtn.classList.contains('liked');

        if (isLiked) {
            // Remove like
            const { error } = await client.database
                .from('likes')
                .delete()
                .eq('inspiration_id', inspirationId)
                .eq('user_id', currentUser.user.id);

            if (error) {
                console.error('Error removing like:', error);
                showToast('取消点赞失败');
                return;
            }
        } else {
            // Add like
            const { error } = await client.database
                .from('likes')
                .insert([{
                    inspiration_id: inspirationId,
                    user_id: currentUser.user.id
                }]);

            if (error) {
                console.error('Error adding like:', error);
                showToast('点赞失败');
                return;
            }

            // 发送点赞通知
            const inspirationOwner = await getInspirationOwner(inspirationId);
            if (inspirationOwner) {
                await createNotification(
                    inspirationOwner.user_id,
                    currentUser.user.id,
                    'like',
                    '有人点赞了你的灵感',
                    `${currentUser.profile?.nickname || '某位用户'} 点赞了你的灵感 "${inspirationOwner.title}"`,
                    inspirationId
                );
            }
        }

        // Refresh likes display
        loadCommentsAndLikes(inspirationId);

    } catch (error) {
        console.error('Error toggling like:', error);
        showToast('操作失败');
    }
}

async function handleCommentSubmit(e, inspirationId) {
    e.preventDefault();

    if (!currentUser?.user?.id) {
        showToast('请先登录');
        return;
    }

    const commentInput = document.getElementById('commentInput');
    const content = commentInput.value.trim();

    if (!content) {
        showToast('请输入评论内容');
        return;
    }

    try {
        // Extract @mentions from content
        const mentionRegex = /@(\w+)/g;
        const mentions = [];
        let match;
        while ((match = mentionRegex.exec(content)) !== null) {
            mentions.push(match[1]);
        }

        const { error } = await client.database
            .from('comments')
            .insert([{
                inspiration_id: inspirationId,
                user_id: currentUser.user.id,
                content: content,
                mentioned_users: mentions.length > 0 ? mentions : null
            }]);

        if (error) {
            console.error('Error adding comment:', error);
            showToast('评论失败');
            return;
        }

        // 发送评论通知
        const inspirationOwner = await getInspirationOwner(inspirationId);
        if (inspirationOwner) {
            await createNotification(
                inspirationOwner.user_id,
                currentUser.user.id,
                'comment',
                '有人评论了你的灵感',
                `${currentUser.profile?.nickname || '某位用户'} 评论了你的灵感 "${inspirationOwner.title}": ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                inspirationId
            );
        }

        commentInput.value = '';
        showToast('评论成功');

        // Refresh comments
        loadCommentsAndLikes(inspirationId);

    } catch (error) {
        console.error('Error submitting comment:', error);
        showToast('评论失败');
    }
}

async function handleReplySubmit(e, inspirationId, parentCommentId, replyToUser = null) {
    e.preventDefault();

    if (!currentUser?.user?.id) {
        showToast('请先登录');
        return;
    }

    const form = e.target;
    const textarea = form.querySelector('textarea');
    let content = textarea.value.trim();

    if (!content) {
        showToast('请输入回复内容');
        return;
    }

    // Add @mention if replying to a specific user
    if (replyToUser && !content.startsWith(`@${replyToUser}`)) {
        content = `@${replyToUser} ${content}`;
    }

    try {
        // Extract @mentions from content
        const mentionRegex = /@(\w+)/g;
        const mentions = [];
        let match;
        while ((match = mentionRegex.exec(content)) !== null) {
            mentions.push(match[1]);
        }

        const { error } = await client.database
            .from('comments')
            .insert([{
                inspiration_id: inspirationId,
                user_id: currentUser.user.id,
                content: content,
                parent_comment_id: parentCommentId,
                mentioned_users: mentions.length > 0 ? mentions : null
            }]);

        if (error) {
            console.error('Error adding reply:', error);
            showToast('回复失败');
            return;
        }

        // 发送回复通知给灵感作者
        const inspirationOwner = await getInspirationOwner(inspirationId);
        if (inspirationOwner) {
            await createNotification(
                inspirationOwner.user_id,
                currentUser.user.id,
                'reply',
                '有人回复了你的灵感',
                `${currentUser.profile?.nickname || '某位用户'} 回复了你的灵感 "${inspirationOwner.title}": ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                inspirationId
            );
        }

        // 如果是回复特定用户，也发送通知给被回复的用户
        if (replyToUser && currentUser.profile?.nickname !== replyToUser) {
            try {
                // 根据nickname查找用户
                const { data: replyToUserData, error: userError } = await client.database
                    .from('users')
                    .select('id, nickname')
                    .eq('nickname', replyToUser)
                    .single();

                if (!userError && replyToUserData) {
                    await createNotification(
                        replyToUserData.id,
                        currentUser.user.id,
                        'reply',
                        '有人回复了你',
                        `${currentUser.profile?.nickname || '某位用户'} 回复了你的评论: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                        inspirationId
                    );
                }
            } catch (userLookupError) {
                console.error('Error looking up reply target user:', userLookupError);
            }
        }

        textarea.value = '';
        showToast('回复成功');

        // Hide reply form
        form.remove();

        // Refresh comments
        loadCommentsAndLikes(inspirationId);

    } catch (error) {
        console.error('Error submitting reply:', error);
        showToast('回复失败');
    }
}

function displayComments(comments) {
    const commentsList = document.getElementById('commentsList');
    const commentsEmpty = document.getElementById('commentsEmpty');
    const commentCount = document.getElementById('commentCount');

    commentCount.textContent = comments.length;

    if (comments.length === 0) {
        commentsList.innerHTML = '';
        commentsEmpty.classList.remove('hidden');
        return;
    }

    commentsEmpty.classList.add('hidden');

    // Group comments by parent (flat display with @mentions for replies)
    const commentsHtml = comments.map(comment => {
        const isReply = comment.parent_comment_id !== null;
        const avatarUrl = comment.users?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.users?.nickname || 'user'}`;

        // Parse content to highlight @mentions
        let content = escapeHtml(comment.content);
        if (comment.mentioned_users && comment.mentioned_users.length > 0) {
            comment.mentioned_users.forEach(mention => {
                const mentionRegex = new RegExp(`@${mention}`, 'g');
                content = content.replace(mentionRegex, `<span class="comment-mention">@${mention}</span>`);
            });
        }

        return `
            <div class="comment-item ${isReply ? 'comment-reply' : ''}" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <div class="comment-author">
                        <img src="${avatarUrl}" alt="${escapeHtml(comment.users?.nickname || 'User')}" class="comment-avatar">
                        <span class="comment-author-name">${escapeHtml(comment.users?.nickname || 'Unknown User')}</span>
                    </div>
                    <span class="comment-time">${formatDate(comment.created_at)}</span>
                </div>
                <div class="comment-content">${content}</div>
                <div class="comment-actions">
                    <button class="comment-action-btn" onclick="showReplyForm('${comment.id}', '${comment.users?.nickname || ''}')">
                        <i data-lucide="reply"></i> 回复
                    </button>
                    ${comment.user_id === currentUser?.user?.id ? `
                        <button class="comment-action-btn" onclick="deleteComment('${comment.id}')">
                            <i data-lucide="trash-2"></i> 删除
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    commentsList.innerHTML = commentsHtml;

    // Re-initialize Lucide icons
    lucide.createIcons();
}

function showReplyForm(commentId, replyToUser) {
    // Remove any existing reply forms
    document.querySelectorAll('.reply-form').forEach(form => form.remove());

    const commentItem = document.querySelector(`[data-comment-id="${commentId}"]`);
    const inspiration = inspirations.find(i => i.id === getCurrentInspirationId());

    const replyForm = document.createElement('form');
    replyForm.className = 'reply-form';
    replyForm.innerHTML = `
        <div class="comment-input-group">
            <textarea placeholder="回复 @${replyToUser}..." rows="2"></textarea>
            <button type="submit" class="btn-primary btn-sm">
                <i data-lucide="send"></i>
            </button>
        </div>
    `;

    replyForm.onsubmit = (e) => handleReplySubmit(e, inspiration.id, commentId, replyToUser);

    commentItem.appendChild(replyForm);

    // Focus on textarea
    const textarea = replyForm.querySelector('textarea');
    textarea.focus();

    // Re-initialize Lucide icons
    lucide.createIcons();
}

async function deleteComment(commentId) {
    if (!confirm('确定要删除这条评论吗？')) {
        return;
    }

    try {
        const { error } = await client.database
            .from('comments')
            .delete()
            .eq('id', commentId)
            .eq('user_id', currentUser.user.id); // Ensure user can only delete their own comments

        if (error) {
            console.error('Error deleting comment:', error);
            showToast('删除评论失败');
            return;
        }

        showToast('评论已删除');

        // Refresh comments
        const inspirationId = getCurrentInspirationId();
        if (inspirationId) {
            loadCommentsAndLikes(inspirationId);
        }

    } catch (error) {
        console.error('Error deleting comment:', error);
        showToast('删除评论失败');
    }
}

function getCurrentInspirationId() {
    // Get the current inspiration ID from the detail modal
    const detailModal = document.getElementById('inspirationDetailModal');
    if (detailModal.classList.contains('hidden')) {
        return null;
    }

    // Find the inspiration by title (not ideal, but works for now)
    const title = document.getElementById('detailTitle').textContent;
    const inspiration = inspirations.find(i => i.title === title);
    return inspiration?.id || null;
}

// 通知系统功能
async function createNotification(recipientId, senderId, type, title, message, inspirationId = null, commentId = null) {
    try {
        // 防止自己给自己发通知
        if (recipientId === senderId) {
            return;
        }

        const { error } = await client.database
            .from('notifications')
            .insert([{
                recipient_id: recipientId,
                sender_id: senderId,
                type: type,
                title: title,
                message: message,
                related_inspiration_id: inspirationId,
                related_comment_id: commentId
            }]);

        if (error) {
            console.error('Error creating notification:', error);
        }
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

async function getInspirationOwner(inspirationId) {
    try {
        const { data, error } = await client.database
            .from('inspirations')
            .select('user_id, title, users!inner(nickname)')
            .eq('id', inspirationId)
            .single();

        if (error) {
            console.error('Error getting inspiration owner:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error getting inspiration owner:', error);
        return null;
    }
}

function hideDetailModal() {
    document.getElementById('inspirationDetailModal').classList.add('hidden');
}

// Utility functions
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        spinner.classList.remove('hidden');
    } else {
        spinner.classList.add('hidden');
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const messageEl = document.getElementById('toastMessage');

    // 如果消息是翻译键，则翻译它
    const translatedMessage = window.t ? window.t(message) : message;
    messageEl.textContent = translatedMessage === message ? message : translatedMessage;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');

    setTimeout(() => {
        hideToast();
    }, 3000);
}

function hideToast() {
    document.getElementById('toast').classList.add('hidden');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getCategoryName(category) {
    const categories = {
        'idea': '想法',
        'quote': '引言',
        'thought': '思考',
        'solution': '解决方案'
    };
    return categories[category] || category;
}

function getMoodName(mood) {
    const moods = {
        'excited': '兴奋',
        'calm': '平静',
        'frustrated': '沮丧',
        'hopeful': '充满希望'
    };
    return moods[mood] || mood;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Lucide 图标辅助函数
function lucideIcon(name, className = '') {
    return `<i data-lucide="${name}" class="${className}"></i>`;
}

// ================================
// 社交功能实现
// ================================

// 标签页切换功能
function setupSocialNavigation() {
    console.log('Setting up social navigation...');
    const navTabs = document.querySelectorAll('.nav-tab');
    console.log('Found nav tabs:', navTabs.length);
    navTabs.forEach(tab => {
        console.log('Adding event listener to tab:', tab.dataset.tab);
        tab.addEventListener('click', () => {
            console.log('Tab clicked:', tab.dataset.tab);
            switchTab(tab.dataset.tab);
        });
    });

    // 添加社交功能相关的事件监听器
    document.getElementById('createGroupBtn')?.addEventListener('click', showCreateGroupModal);
    document.getElementById('createGroupForm')?.addEventListener('submit', handleCreateGroup);
    document.getElementById('applyGroupForm')?.addEventListener('submit', handleGroupApplication);
    document.getElementById('shareToGroupBtn')?.addEventListener('click', () => showShareToGroupModal(currentEditingInspiration));
    document.getElementById('confirmShareBtn')?.addEventListener('click', handleConfirmShare);
    document.getElementById('userSearchBtn')?.addEventListener('click', handleUserSearch);
    document.getElementById('followUserBtn')?.addEventListener('click', handleFollowUser);
    document.getElementById('joinGroupBtn')?.addEventListener('click', handleJoinGroup);
    document.getElementById('leaveGroupBtn')?.addEventListener('click', handleLeaveGroup);
}

function switchTab(tabName) {
    console.log('switchTab called with:', tabName);

    // 更新导航标签状态
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
        console.log('Active tab set for:', tabName);
    } else {
        console.error('Could not find tab with data-tab:', tabName);
    }

    // 切换内容区域
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.classList.add('hidden');
    });

    const targetTab = document.getElementById(`${tabName}Tab`);
    if (targetTab) {
        targetTab.classList.add('active');
        targetTab.classList.remove('hidden');
        console.log('Target tab content shown for:', tabName);
    } else {
        console.error('Could not find tab content with id:', `${tabName}Tab`);
    }

    currentActiveTab = tabName;

    // 加载对应标签页的数据
    loadTabData(tabName);
}

async function loadTabData(tabName) {
    try {
        showLoading(true);

        switch (tabName) {
            case 'personal':
                await loadInspirations();
                break;
            case 'groups':
                await loadGroups();
                break;
            case 'following':
                await loadFollowingData();
                break;
            case 'discover':
                await loadDiscoverUsers();
                break;
        }
    } catch (error) {
        console.error(`Error loading ${tabName} data:`, error);
        showToast(`加载${tabName}数据失败`, 'error');
    } finally {
        showLoading(false);
    }
}

// 小组管理功能
async function loadGroups() {
    try {
        // 加载我的小组
        const { data: myGroupsData, error: myGroupsError } = await client.database
            .from('group_members')
            .select(`
                groups (
                    id, name, description, avatar_url, is_private,
                    member_count, created_at, creator_id
                )
            `)
            .eq('user_id', currentUser.user.id);

        if (myGroupsError) {
            console.error('加载我的小组失败:', myGroupsError);
        } else {
            myGroups = myGroupsData?.map(item => item.groups) || [];
            renderMyGroups();
        }

        // 加载发现小组（公开的、我未加入的小组）
        const { data: allGroupsData, error: allGroupsError } = await client.database
            .from('groups')
            .select('*')
            .eq('is_private', false)
            .limit(10);

        if (allGroupsError) {
            console.error('加载发现小组失败:', allGroupsError);
        } else {
            const myGroupIds = myGroups.map(g => g.id);
            discoverGroups = allGroupsData?.filter(group => !myGroupIds.includes(group.id)) || [];
            renderDiscoverGroups();
        }
    } catch (error) {
        console.error('Error loading groups:', error);
        showToast('加载小组失败', 'error');
    }
}

function renderMyGroups() {
    const container = document.getElementById('myGroupsList');
    if (!container) return;

    if (myGroups.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>你还没有加入任何小组</p></div>';
        return;
    }

    container.innerHTML = myGroups.map(group => `
        <div class="group-card" onclick="showGroupDetail('${group.id}')">
            <div class="group-avatar">${group.avatar_url ? `<img src="${group.avatar_url}" alt="${group.name}">` : group.name.charAt(0)}</div>
            <div class="group-name">${escapeHtml(group.name)}</div>
            <div class="group-description">${escapeHtml(group.description || '')}</div>
            <div class="group-meta">
                <span>${group.member_count} 成员</span>
                ${group.is_private ? '<span class="group-private">私有</span>' : ''}
            </div>
        </div>
    `).join('');
}

function renderDiscoverGroups() {
    const container = document.getElementById('discoverGroupsList');
    if (!container) return;

    if (discoverGroups.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>暂无可发现的小组</p></div>';
        return;
    }

    container.innerHTML = discoverGroups.map(group => `
        <div class="group-card" onclick="showGroupDetail('${group.id}')">
            <div class="group-avatar">${group.avatar_url ? `<img src="${group.avatar_url}" alt="${group.name}">` : group.name.charAt(0)}</div>
            <div class="group-name">${escapeHtml(group.name)}</div>
            <div class="group-description">${escapeHtml(group.description || '')}</div>
            <div class="group-meta">
                <span>${group.member_count} 成员</span>
                <button class="btn-primary" onclick="event.stopPropagation(); joinGroup('${group.id}')">加入</button>
            </div>
        </div>
    `).join('');
}

// 关注功能
async function loadFollowingData() {
    try {
        // 加载我关注的人
        const { data: followingData, error: followingError } = await client.database
            .from('follows')
            .select(`
                following_id,
                users!follows_following_id_fkey (
                    id, nickname, bio, avatar_url
                )
            `)
            .eq('follower_id', currentUser.user.id);

        if (followingError) {
            console.error('加载关注列表失败:', followingError);
        } else {
            followingUsers = followingData?.map(item => item.users) || [];
            renderFollowingUsers();
        }

        // 加载关注我的人
        const { data: followersData, error: followersError } = await client.database
            .from('follows')
            .select(`
                follower_id,
                users!follows_follower_id_fkey (
                    id, nickname, bio, avatar_url
                )
            `)
            .eq('following_id', currentUser.user.id);

        if (followersError) {
            console.error('加载粉丝列表失败:', followersError);
        } else {
            followerUsers = followersData?.map(item => item.users) || [];
            renderFollowers();
        }

        // 加载小组分享的灵感
        await loadGroupInspirations();
    } catch (error) {
        console.error('Error loading following data:', error);
        showToast('加载关注数据失败', 'error');
    }
}

function renderFollowingUsers() {
    const container = document.getElementById('followingList');
    if (!container) return;

    if (followingUsers.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>你还没有关注任何人</p></div>';
        return;
    }

    container.innerHTML = followingUsers.map(user => `
        <div class="user-card" onclick="showUserDetail('${user.id}')">
            <img class="user-avatar" src="${user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nickname || user.id)}&background=667eea&color=fff`}" alt="${user.nickname}">
            <div class="user-nickname">${escapeHtml(user.nickname || 'Unknown')}</div>
            <div class="user-bio">${escapeHtml(user.bio || '')}</div>
            <button class="follow-btn following" onclick="event.stopPropagation(); unfollowUser('${user.id}')">已关注</button>
        </div>
    `).join('');
}

function renderFollowers() {
    const container = document.getElementById('followersList');
    if (!container) return;

    if (followerUsers.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>还没有人关注你</p></div>';
        return;
    }

    container.innerHTML = followerUsers.map(user => `
        <div class="user-card" onclick="showUserDetail('${user.id}')">
            <img class="user-avatar" src="${user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nickname || user.id)}&background=667eea&color=fff`}" alt="${user.nickname}">
            <div class="user-nickname">${escapeHtml(user.nickname || 'Unknown')}</div>
            <div class="user-bio">${escapeHtml(user.bio || '')}</div>
        </div>
    `).join('');
}

async function loadGroupInspirations() {
    try {
        const { data, error } = await client.database
            .from('inspiration_shares')
            .select(`
                inspirations (
                    id, title, content, tags, category, mood, image_url,
                    created_at, user_id,
                    users (nickname, avatar_url)
                ),
                groups (name),
                shared_at
            `)
            .order('shared_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error('加载小组灵感失败:', error);
            return;
        }

        groupInspirations = data || [];
        renderGroupInspirations();
    } catch (error) {
        console.error('Error loading group inspirations:', error);
    }
}

function renderGroupInspirations() {
    const container = document.getElementById('groupInspirationsList');
    if (!container) return;

    if (groupInspirations.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>还没有小组分享的灵感</p></div>';
        return;
    }

    container.innerHTML = groupInspirations.map(share => {
        const inspiration = share.inspirations;
        return `
            <div class="inspiration-card" onclick="showInspirationDetail('${inspiration.id}')">
                <div class="card-header">
                    <h3 class="card-title">${escapeHtml(inspiration.title)}</h3>
                    <div class="share-info">
                        <small>来自小组: ${escapeHtml(share.groups.name)}</small>
                    </div>
                </div>
                <div class="card-meta">
                    <span class="card-tag">${getCategoryName(inspiration.category)}</span>
                    <span class="card-tag">${getMoodName(inspiration.mood)}</span>
                </div>
                ${inspiration.image_url ? `<img src="${inspiration.image_url}" alt="灵感图片" class="card-image">` : ''}
                <div class="card-content">${escapeHtml(inspiration.content)}</div>
                <div class="card-footer">
                    <div class="author-info">
                        <img src="${inspiration.users.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(inspiration.users.nickname || 'Unknown')}&background=667eea&color=fff`}" class="author-avatar">
                        <span>${escapeHtml(inspiration.users.nickname || 'Unknown')}</span>
                    </div>
                    <span>${formatDate(share.shared_at)}</span>
                </div>
            </div>
        `;
    }).join('');
}

// 用户发现功能
async function loadDiscoverUsers() {
    try {
        const { data, error } = await client.database
            .from('users')
            .select('*')
            .neq('id', currentUser.user.id)
            .limit(20);

        if (error) {
            console.error('加载用户列表失败:', error);
            return;
        }

        // 筛选掉已关注的用户
        const followingIds = followingUsers.map(u => u.id);
        discoverUsers = data?.filter(user => !followingIds.includes(user.id)) || [];
        renderDiscoverUsers();
    } catch (error) {
        console.error('Error loading discover users:', error);
        showToast('加载用户失败', 'error');
    }
}

function renderDiscoverUsers() {
    const container = document.getElementById('discoverUsersList');
    if (!container) return;

    if (discoverUsers.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>没有更多用户可以发现</p></div>';
        return;
    }

    container.innerHTML = discoverUsers.map(user => `
        <div class="user-card" onclick="showUserDetail('${user.id}')">
            <img class="user-avatar" src="${user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nickname || user.id)}&background=667eea&color=fff`}" alt="${user.nickname}">
            <div class="user-nickname">${escapeHtml(user.nickname || 'Unknown')}</div>
            <div class="user-bio">${escapeHtml(user.bio || '')}</div>
            <button class="follow-btn" onclick="event.stopPropagation(); followUser('${user.id}')">关注</button>
        </div>
    `).join('');
}

// 社交操作功能
async function followUser(userId) {
    try {
        const { error } = await client.database
            .from('follows')
            .insert([{
                follower_id: currentUser.user.id,
                following_id: userId
            }]);

        if (error) {
            showToast('关注失败', 'error');
            return;
        }

        showToast('关注成功', 'success');

        // 刷新相关数据
        if (currentActiveTab === 'following') {
            await loadFollowingData();
        } else if (currentActiveTab === 'discover') {
            await loadDiscoverUsers();
        }
    } catch (error) {
        console.error('Follow user error:', error);
        showToast('关注失败', 'error');
    }
}

async function unfollowUser(userId) {
    try {
        const { error } = await client.database
            .from('follows')
            .delete()
            .eq('follower_id', currentUser.user.id)
            .eq('following_id', userId);

        if (error) {
            showToast('取消关注失败', 'error');
            return;
        }

        showToast('已取消关注', 'success');

        // 刷新相关数据
        if (currentActiveTab === 'following') {
            await loadFollowingData();
        }
    } catch (error) {
        console.error('Unfollow user error:', error);
        showToast('取消关注失败', 'error');
    }
}

async function joinGroup(groupId) {
    try {
        const { error } = await client.database
            .from('group_members')
            .insert([{
                group_id: groupId,
                user_id: currentUser.user.id,
                role: 'member'
            }]);

        if (error) {
            showToast('加入小组失败', 'error');
            return;
        }

        // 更新小组成员数
        const { error: updateError } = await client.database
            .from('groups')
            .update({ member_count: client.database.raw('member_count + 1') })
            .eq('id', groupId);

        showToast('成功加入小组', 'success');
        await loadGroups();
    } catch (error) {
        console.error('Join group error:', error);
        showToast('加入小组失败', 'error');
    }
}

// 小组详情功能
async function showGroupDetail(groupId) {
    try {
        showLoading(true);

        // 获取小组基本信息
        const { data: groupData, error: groupError } = await client.database
            .from('groups')
            .select('*')
            .eq('id', groupId)
            .single();

        if (groupError) {
            console.error('获取小组信息失败:', groupError);
            showToast('获取小组信息失败', 'error');
            return;
        }

        // 检查用户是否是小组成员
        const { data: memberData, error: memberError } = await client.database
            .from('group_members')
            .select('*')
            .eq('group_id', groupId)
            .eq('user_id', currentUser.user.id)
            .single();

        const isMember = memberData && !memberError;
        const canViewPosts = !groupData.is_private || isMember;

        // 显示小组基本信息
        document.getElementById('groupDetailName').textContent = groupData.name;
        document.getElementById('groupDetailDescription').textContent = groupData.description || '暂无描述';

        const avatarImg = document.getElementById('groupDetailAvatar');
        if (groupData.avatar_url) {
            avatarImg.src = groupData.avatar_url;
        } else {
            avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(groupData.name)}&background=667eea&color=fff`;
        }

        // 设置按钮状态
        const joinBtn = document.querySelector('#groupDetailModal .btn-primary');
        const leaveBtn = document.querySelector('#groupDetailModal .btn-secondary');

        if (isMember) {
            joinBtn.style.display = 'none';
            leaveBtn.style.display = 'inline-block';
            leaveBtn.onclick = () => leaveGroup(groupId);
        } else if (!groupData.is_private) {
            joinBtn.style.display = 'inline-block';
            leaveBtn.style.display = 'none';
            joinBtn.textContent = '申请加入';
            joinBtn.onclick = () => showApplyGroupModal(groupId, groupData);
        } else {
            joinBtn.style.display = 'none';
            leaveBtn.style.display = 'none';
        }

        // 加载小组内的灵感（根据权限）
        if (canViewPosts) {
            await loadGroupPosts(groupId);
        } else {
            const postsContainer = document.getElementById('groupRecentInspirations');
            postsContainer.innerHTML = '<div class="empty-state"><p>这是私有小组，只有成员可以查看内容</p></div>';
        }

        // 显示模态框
        document.getElementById('groupDetailModal').classList.remove('hidden');
    } catch (error) {
        console.error('显示小组详情失败:', error);
        showToast('显示小组详情失败', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadGroupPosts(groupId) {
    try {
        // 获取小组内分享的灵感
        const { data, error } = await client.database
            .from('inspiration_shares')
            .select(`
                inspirations (
                    id, title, content, tags, category, mood, image_url,
                    created_at, user_id,
                    users (nickname, avatar_url)
                ),
                shared_at
            `)
            .eq('group_id', groupId)
            .order('shared_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error('加载小组灵感失败:', error);
            return;
        }

        const postsContainer = document.getElementById('groupRecentInspirations');
        if (!data || data.length === 0) {
            postsContainer.innerHTML = '<div class="empty-state"><p>小组内还没有分享的灵感</p></div>';
            return;
        }

        postsContainer.innerHTML = data.map(item => {
            const inspiration = item.inspirations;
            const user = inspiration.users;
            const sharedDate = new Date(item.shared_at).toLocaleDateString();

            return `
                <div class="inspiration-card group-post" onclick="showInspirationDetail('${inspiration.id}')">
                    <div class="post-header">
                        <div class="user-info">
                            <img class="user-avatar" src="${user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nickname || 'User')}&background=667eea&color=fff`}" alt="${user.nickname}">
                            <div>
                                <div class="user-name">${escapeHtml(user.nickname || 'Unknown')}</div>
                                <div class="post-date">分享于 ${sharedDate}</div>
                            </div>
                        </div>
                    </div>
                    <div class="inspiration-content">
                        <h4>${escapeHtml(inspiration.title)}</h4>
                        <p>${escapeHtml(inspiration.content)}</p>
                        ${inspiration.image_url ? `<img src="${inspiration.image_url}" alt="灵感图片" class="inspiration-image">` : ''}
                        <div class="inspiration-meta">
                            <span class="category">${inspiration.category}</span>
                            <span class="mood">${inspiration.mood}</span>
                            <span class="date">${new Date(inspiration.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('加载小组帖子失败:', error);
    }
}

async function joinGroupFromDetail(groupId) {
    await joinGroup(groupId);
    // 重新加载小组详情以更新按钮状态
    await showGroupDetail(groupId);
}

async function leaveGroup(groupId) {
    try {
        const { error } = await client.database
            .from('group_members')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', currentUser.user.id);

        if (error) {
            showToast('退出小组失败', 'error');
            return;
        }

        // 更新小组成员数
        const { error: updateError } = await client.database
            .from('groups')
            .update({ member_count: client.database.raw('member_count - 1') })
            .eq('id', groupId);

        showToast('已退出小组', 'success');
        await loadGroups();

        // 关闭详情模态框
        document.getElementById('groupDetailModal').classList.add('hidden');
    } catch (error) {
        console.error('退出小组失败:', error);
        showToast('退出小组失败', 'error');
    }
}

function hideGroupDetailModal() {
    document.getElementById('groupDetailModal').classList.add('hidden');
}

// 申请加入小组功能
let currentApplyingGroup = null;

function showApplyGroupModal(groupId, groupData) {
    currentApplyingGroup = { id: groupId, data: groupData };

    // 设置小组信息
    document.getElementById('applyGroupName').textContent = groupData.name;
    document.getElementById('applyGroupDescription').textContent = groupData.description || '暂无描述';

    const avatarImg = document.getElementById('applyGroupAvatar');
    if (groupData.avatar_url) {
        avatarImg.src = groupData.avatar_url;
    } else {
        avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(groupData.name)}&background=667eea&color=fff`;
    }

    // 设置投票要求说明
    const memberCount = groupData.member_count || 1;
    let requirement;
    if (memberCount < 40) {
        requirement = `小组现有 ${memberCount} 名成员，需要超过一半成员（${Math.ceil(memberCount / 2)} 票）同意您的申请。`;
    } else {
        requirement = `小组现有 ${memberCount} 名成员，需要超过三分之一成员（${Math.ceil(memberCount / 3)} 票）同意您的申请。`;
    }
    document.getElementById('votingRequirement').textContent = requirement;

    // 清空申请消息
    document.getElementById('applicationMessage').value = '';

    // 显示模态框
    document.getElementById('applyGroupModal').classList.remove('hidden');
}

function hideApplyGroupModal() {
    document.getElementById('applyGroupModal').classList.add('hidden');
    currentApplyingGroup = null;
}

async function handleGroupApplication(e) {
    e.preventDefault();

    if (!currentApplyingGroup || !currentUser?.user?.id) {
        showToast('申请失败', 'error');
        return;
    }

    const message = document.getElementById('applicationMessage').value.trim();
    if (!message) {
        showToast('请填写申请理由', 'error');
        return;
    }

    try {
        showLoading(true);

        const groupData = currentApplyingGroup.data;
        const memberCount = groupData.member_count || 1;

        // 计算需要的票数
        let votesNeeded;
        if (memberCount < 40) {
            votesNeeded = Math.ceil(memberCount / 2);
        } else {
            votesNeeded = Math.ceil(memberCount / 3);
        }

        // 创建申请
        const { data: application, error: appError } = await client.database
            .from('group_applications')
            .insert([{
                group_id: currentApplyingGroup.id,
                applicant_id: currentUser.user.id,
                message: message,
                votes_needed: votesNeeded,
                votes_received: 0,
                status: 'pending'
            }])
            .select()
            .single();

        if (appError) {
            console.error('创建申请失败:', appError);
            showToast('申请提交失败', 'error');
            return;
        }

        // 发送通知给所有小组成员
        await sendApplicationNotifications(application.id, currentApplyingGroup.id);

        showToast('申请已提交，等待小组成员投票', 'success');
        hideApplyGroupModal();

    } catch (error) {
        console.error('申请提交失败:', error);
        showToast('申请提交失败', 'error');
    } finally {
        showLoading(false);
    }
}

async function sendApplicationNotifications(applicationId, groupId) {
    try {
        // 获取小组所有成员
        const { data: members, error: membersError } = await client.database
            .from('group_members')
            .select('user_id, users(nickname)')
            .eq('group_id', groupId);

        if (membersError) {
            console.error('获取小组成员失败:', membersError);
            return;
        }

        const applicantName = currentUser.profile?.nickname || currentUser.user.email;
        const groupName = currentApplyingGroup.data.name;

        // 为每个成员创建通知
        const notifications = members.map(member => ({
            recipient_id: member.user_id,
            sender_id: currentUser.user.id,
            type: 'group_application',
            title: '新的小组申请',
            message: `${applicantName} 申请加入小组 "${groupName}"，请投票决定是否同意`,
            related_inspiration_id: null,
            related_comment_id: applicationId // 复用这个字段存储申请ID
        }));

        const { error: notifyError } = await client.database
            .from('notifications')
            .insert(notifications);

        if (notifyError) {
            console.error('发送通知失败:', notifyError);
        }
    } catch (error) {
        console.error('发送申请通知失败:', error);
    }
}

// 投票功能
let currentVotingApplication = null;

function showVoteNotificationModal(applicationId) {
    // 这个函数会在通知系统中调用
    // 需要从数据库获取申请详情
    loadApplicationForVoting(applicationId);
}

function hideVoteNotificationModal() {
    document.getElementById('voteNotificationModal').classList.add('hidden');
    currentVotingApplication = null;
}

async function loadApplicationForVoting(applicationId) {
    try {
        showLoading(true);

        // 获取申请详情
        const { data: application, error: appError } = await client.database
            .from('group_applications')
            .select(`
                *,
                users!group_applications_applicant_id_fkey(nickname, avatar_url),
                groups(name)
            `)
            .eq('id', applicationId)
            .single();

        if (appError) {
            console.error('获取申请详情失败:', appError);
            showToast('加载申请信息失败', 'error');
            return;
        }

        currentVotingApplication = application;

        // 设置申请者信息
        const applicant = application.users;
        document.getElementById('applicantName').textContent = applicant.nickname || 'Unknown';
        document.getElementById('applicationDate').textContent = new Date(application.created_at).toLocaleDateString();
        document.getElementById('voteApplicationMessage').textContent = application.message;

        const applicantAvatar = document.getElementById('applicantAvatar');
        if (applicant.avatar_url) {
            applicantAvatar.src = applicant.avatar_url;
        } else {
            applicantAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(applicant.nickname || 'User')}&background=667eea&color=fff`;
        }

        // 设置投票进度
        const progress = (application.votes_received / application.votes_needed) * 100;
        document.getElementById('voteProgressBar').style.width = `${progress}%`;
        document.getElementById('voteStatusText').textContent =
            `投票进度: ${application.votes_received}/${application.votes_needed}`;

        // 检查用户是否已经投票
        const { data: existingVote, error: voteError } = await client.database
            .from('group_application_votes')
            .select('vote')
            .eq('application_id', applicationId)
            .eq('voter_id', currentUser.user.id)
            .single();

        const approveBtn = document.getElementById('approveVoteBtn');
        const rejectBtn = document.getElementById('rejectVoteBtn');

        if (existingVote && !voteError) {
            // 用户已经投票，显示投票结果
            if (existingVote.vote) {
                approveBtn.textContent = '✓ 已同意';
                approveBtn.disabled = true;
                rejectBtn.disabled = true;
            } else {
                rejectBtn.textContent = '✗ 已拒绝';
                approveBtn.disabled = true;
                rejectBtn.disabled = true;
            }
        } else {
            // 用户未投票，设置投票按钮
            approveBtn.textContent = '同意加入';
            rejectBtn.textContent = '拒绝申请';
            approveBtn.disabled = false;
            rejectBtn.disabled = false;
            approveBtn.onclick = () => submitVote(applicationId, true);
            rejectBtn.onclick = () => submitVote(applicationId, false);
        }

        // 显示模态框
        document.getElementById('voteNotificationModal').classList.remove('hidden');

    } catch (error) {
        console.error('加载申请投票失败:', error);
        showToast('加载申请信息失败', 'error');
    } finally {
        showLoading(false);
    }
}

async function submitVote(applicationId, vote) {
    try {
        showLoading(true);

        // 提交投票
        const { error: voteError } = await client.database
            .from('group_application_votes')
            .insert([{
                application_id: applicationId,
                voter_id: currentUser.user.id,
                vote: vote
            }]);

        if (voteError) {
            console.error('投票失败:', voteError);
            showToast('投票失败', 'error');
            return;
        }

        // 更新申请的投票计数（只计算赞成票）
        if (vote) {
            const { error: updateError } = await client.database
                .from('group_applications')
                .update({
                    votes_received: client.database.raw('votes_received + 1'),
                    updated_at: new Date().toISOString()
                })
                .eq('id', applicationId);

            if (updateError) {
                console.error('更新投票计数失败:', updateError);
            }
        }

        // 检查是否达到投票要求
        await checkApplicationStatus(applicationId);

        showToast(vote ? '已投赞成票' : '已投反对票', 'success');
        hideVoteNotificationModal();

    } catch (error) {
        console.error('投票失败:', error);
        showToast('投票失败', 'error');
    } finally {
        showLoading(false);
    }
}

async function checkApplicationStatus(applicationId) {
    try {
        // 获取更新后的申请信息
        const { data: application, error: appError } = await client.database
            .from('group_applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (appError) {
            console.error('获取申请状态失败:', appError);
            return;
        }

        // 检查是否达到通过条件
        if (application.votes_received >= application.votes_needed) {
            // 申请通过，自动加入小组
            await approveGroupApplication(application);
        }
    } catch (error) {
        console.error('检查申请状态失败:', error);
    }
}

async function approveGroupApplication(application) {
    try {
        // 将用户添加到小组
        const { error: memberError } = await client.database
            .from('group_members')
            .insert([{
                group_id: application.group_id,
                user_id: application.applicant_id,
                role: 'member'
            }]);

        if (memberError) {
            console.error('添加小组成员失败:', memberError);
            return;
        }

        // 获取当前小组信息并更新成员数
        const { data: currentGroup, error: getGroupError } = await client.database
            .from('groups')
            .select('member_count')
            .eq('id', application.group_id)
            .single();

        if (!getGroupError && currentGroup) {
            const { error: groupError } = await client.database
                .from('groups')
                .update({ member_count: currentGroup.member_count + 1 })
                .eq('id', application.group_id);

            if (groupError) {
                console.error('更新小组成员数失败:', groupError);
            }
        }

        // 更新申请状态
        const { error: statusError } = await client.database
            .from('group_applications')
            .update({ status: 'approved' })
            .eq('id', application.id);

        // 发送通过通知给申请者
        await sendApprovalNotification(application);

        console.log('申请已通过，用户已加入小组');
    } catch (error) {
        console.error('处理申请通过失败:', error);
    }
}

async function sendApprovalNotification(application) {
    try {
        // 获取小组信息
        const { data: group, error: groupError } = await client.database
            .from('groups')
            .select('name')
            .eq('id', application.group_id)
            .single();

        if (groupError) {
            console.error('获取小组信息失败:', groupError);
            return;
        }

        // 发送通知
        const { error: notifyError } = await client.database
            .from('notifications')
            .insert([{
                recipient_id: application.applicant_id,
                sender_id: null, // 系统通知
                type: 'group_approval',
                title: '申请通过',
                message: `恭喜！您的小组申请已通过，现在您是 "${group.name}" 的成员了`,
                related_inspiration_id: null,
                related_comment_id: application.id
            }]);

        if (notifyError) {
            console.error('发送通过通知失败:', notifyError);
        }
    } catch (error) {
        console.error('发送申请通过通知失败:', error);
    }
}

function showVoteApplicationModal(application) {
    currentVotingApplication = application;

    // 填充申请信息到投票模态框
    const modal = document.getElementById('voteNotificationModal');
    const applicantName = document.getElementById('applicantName');
    const applicantAvatar = document.getElementById('applicantAvatar');
    const applicationMessage = document.getElementById('voteApplicationMessage');
    const voteProgressBar = document.getElementById('voteProgressBar');
    const voteStatusText = document.getElementById('voteStatusText');
    const approveBtn = document.getElementById('approveVoteBtn');
    const rejectBtn = document.getElementById('rejectVoteBtn');

    if (applicantName) applicantName.textContent = application.users?.nickname || '未知用户';
    if (applicantAvatar) {
        applicantAvatar.src = application.users?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${application.users?.nickname || 'user'}`;
    }
    if (applicationMessage) applicationMessage.textContent = application.message || '无申请消息';

    if (voteProgressBar && voteStatusText) {
        const progress = (application.votes_received / application.votes_needed) * 100;
        voteProgressBar.style.width = `${Math.min(progress, 100)}%`;
        voteStatusText.textContent = `投票进度: ${application.votes_received}/${application.votes_needed}`;
    }

    // 检查当前用户是否已投票
    if (approveBtn && rejectBtn) {
        // 这里可以检查用户是否已投票，暂时设为可投票状态
        approveBtn.disabled = false;
        rejectBtn.disabled = false;

        // 清除之前的点击事件
        approveBtn.onclick = null;
        rejectBtn.onclick = null;

        // 设置新的点击事件
        approveBtn.onclick = () => submitVote(application.id, true);
        rejectBtn.onclick = () => submitVote(application.id, false);
    }

    modal.classList.remove('hidden');
}

// 模态框管理功能
function showCreateGroupModal() {
    document.getElementById('createGroupModal').classList.remove('hidden');
}

function hideCreateGroupModal() {
    document.getElementById('createGroupModal').classList.add('hidden');
    document.getElementById('createGroupForm').reset();
}

async function handleCreateGroup(e) {
    e.preventDefault();

    const name = document.getElementById('groupName').value;
    const description = document.getElementById('groupDescription').value;
    const isPrivate = document.getElementById('isPrivateGroup').checked;
    const maxMembers = parseInt(document.getElementById('maxMembers').value);

    try {
        showLoading(true);

        // 创建小组
        const { data: group, error: groupError } = await client.database
            .from('groups')
            .insert([{
                name,
                description,
                creator_id: currentUser.user.id,
                is_private: isPrivate,
                max_members: maxMembers,
                member_count: 1
            }])
            .select()
            .single();

        if (groupError) {
            showToast('创建小组失败', 'error');
            return;
        }

        // 将创建者加入小组
        const { error: memberError } = await client.database
            .from('group_members')
            .insert([{
                group_id: group.id,
                user_id: currentUser.user.id,
                role: 'creator'
            }]);

        if (memberError) {
            console.error('加入创建者失败:', memberError);
        }

        showToast('小组创建成功', 'success');
        hideCreateGroupModal();

        if (currentActiveTab === 'groups') {
            await loadGroups();
        }
    } catch (error) {
        console.error('Create group error:', error);
        showToast('创建小组失败', 'error');
    } finally {
        showLoading(false);
    }
}

// 缺失的处理函数
function handleUserSearch() {
    console.log('User search functionality - to be implemented');
    showToast('用户搜索功能待实现', 'info');
}

function handleFollowUser() {
    console.log('Follow user functionality - to be implemented');
    showToast('关注用户功能待实现', 'info');
}

function handleJoinGroup() {
    console.log('Join group functionality - to be implemented');
    showToast('加入小组功能待实现', 'info');
}

function handleLeaveGroup() {
    console.log('Leave group functionality - to be implemented');
    showToast('离开小组功能待实现', 'info');
}

function showShareToGroupModal(inspiration) {
    currentSharingInspiration = inspiration;
    loadUserGroups();
    document.getElementById('shareToGroupModal').classList.remove('hidden');
}

function hideShareToGroupModal() {
    document.getElementById('shareToGroupModal').classList.add('hidden');
    currentSharingInspiration = null;
    selectedGroups = [];
}

async function loadUserGroups() {
    try {
        const { data, error } = await client.database
            .from('group_members')
            .select(`
                groups (id, name, description, avatar_url)
            `)
            .eq('user_id', currentUser.user.id);

        if (error) {
            console.error('加载用户小组失败:', error);
            return;
        }

        const userGroups = data?.map(item => item.groups) || [];
        renderGroupSelection(userGroups);
    } catch (error) {
        console.error('Error loading user groups:', error);
    }
}

function renderGroupSelection(groups) {
    const container = document.getElementById('groupSelectionList');
    if (!container) return;

    if (groups.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>你还没有加入任何小组</p></div>';
        return;
    }

    container.innerHTML = groups.map(group => `
        <div class="group-selection-item" onclick="toggleGroupSelection('${group.id}')">
            <input type="checkbox" id="group_${group.id}" onchange="toggleGroupSelection('${group.id}')">
            <div class="group-selection-avatar">${group.avatar_url ? `<img src="${group.avatar_url}" alt="${group.name}">` : group.name.charAt(0)}</div>
            <div class="group-selection-info">
                <h4>${escapeHtml(group.name)}</h4>
                <p>${escapeHtml(group.description || '')}</p>
            </div>
        </div>
    `).join('');
}

function toggleGroupSelection(groupId) {
    const checkbox = document.getElementById(`group_${groupId}`);
    const item = checkbox.closest('.group-selection-item');

    if (checkbox.checked) {
        if (!selectedGroups.includes(groupId)) {
            selectedGroups.push(groupId);
        }
        item.classList.add('selected');
    } else {
        selectedGroups = selectedGroups.filter(id => id !== groupId);
        item.classList.remove('selected');
    }
}

async function handleConfirmShare() {
    if (!currentSharingInspiration || selectedGroups.length === 0) {
        showToast('请选择要分享到的小组', 'error');
        return;
    }

    try {
        showLoading(true);

        const sharePromises = selectedGroups.map(groupId =>
            client.database
                .from('inspiration_shares')
                .insert([{
                    inspiration_id: currentSharingInspiration.id,
                    group_id: groupId,
                    shared_by: currentUser.user.id
                }])
        );

        await Promise.all(sharePromises);

        showToast(`成功分享到 ${selectedGroups.length} 个小组`, 'success');
        hideShareToGroupModal();
    } catch (error) {
        console.error('Share inspiration error:', error);
        showToast('分享失败', 'error');
    } finally {
        showLoading(false);
    }
}

// 初始化社交功能
function initializeSocialFeatures() {
    setupSocialNavigation();

    // 初始化 Lucide 图标
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // 初始加载个人灵感
    if (currentActiveTab === 'personal') {
        loadInspirations();
    }
}

// showMainPage 已直接更新以包含社交功能初始化

// Global functions for onclick handlers
window.showInspirationModal = showInspirationModal;
window.hideInspirationModal = hideInspirationModal;
window.hideDetailModal = hideDetailModal;
window.hideToast = hideToast;

// 社交功能的全局函数
window.showCreateGroupModal = showCreateGroupModal;
window.hideCreateGroupModal = hideCreateGroupModal;
window.hideGroupDetailModal = hideGroupDetailModal;
window.showApplyGroupModal = showApplyGroupModal;
window.hideApplyGroupModal = hideApplyGroupModal;
window.showVoteNotificationModal = showVoteNotificationModal;
window.hideVoteNotificationModal = hideVoteNotificationModal;
window.showVoteApplicationModal = showVoteApplicationModal;
window.submitVote = submitVote;
window.showShareToGroupModal = showShareToGroupModal;
window.hideShareToGroupModal = hideShareToGroupModal;
window.showInspirationDetail = showInspirationDetail;
window.showUserDetail = function(userId) { /* TODO: 实现用户详情 */ };
window.showGroupDetail = showGroupDetail;
window.followUser = followUser;
window.unfollowUser = unfollowUser;
window.joinGroup = joinGroup;
window.leaveGroup = leaveGroup;
window.toggleGroupSelection = toggleGroupSelection;
window.switchTab = switchTab;
window.saveInspiration = handleInspirationSubmit;
window.cancelEdit = hideInspirationModal;
window.editInspiration = editInspiration;
window.deleteInspiration = deleteInspiration;
window.toggleFavorite = toggleFavorite;
window.showDetail = showInspirationDetail;

// Comments and likes global functions
window.showReplyForm = showReplyForm;
window.deleteComment = deleteComment;

// 语言切换功能
function toggleLanguageMenu() {
    const menu = document.getElementById('langMenu');
    menu.classList.toggle('hidden');
}

function changeLanguage(lang) {
    if (window.i18n) {
        window.i18n.setLanguage(lang);
        updateLanguageDisplay();
        document.getElementById('langMenu').classList.add('hidden');
    }
}

function updateLanguageDisplay() {
    const currentLang = window.i18n ? window.i18n.getCurrentLang() : 'zh';

    // 更新首页的语言显示
    const display = document.getElementById('currentLangDisplay');
    if (display) {
        display.textContent = currentLang === 'zh' ? '中文' : 'EN';
    }

    // 更新登录页面的语言显示
    const loginDisplay = document.getElementById('loginCurrentLangDisplay');
    if (loginDisplay) {
        loginDisplay.textContent = currentLang === 'zh' ? '中文' : 'EN';
    }

    // 更新语言选项的激活状态
    document.querySelectorAll('.lang-option').forEach(option => {
        option.classList.remove('active');
        if (option.onclick.toString().includes(`'${currentLang}'`)) {
            option.classList.add('active');
        }
    });
}

function changeLanguageInLogin(lang) {
    if (window.i18n) {
        window.i18n.setLanguage(lang);
        updateLanguageDisplay();
        document.getElementById('loginLangMenu').classList.add('hidden');
    }
}

// 点击页面其他地方关闭语言菜单
document.addEventListener('click', (e) => {
    const langSwitcher = document.querySelector('.language-switcher');
    const langMenu = document.getElementById('langMenu');

    if (langSwitcher && !langSwitcher.contains(e.target)) {
        if (langMenu) {
            langMenu.classList.add('hidden');
        }
    }
});

// 监听语言变化事件，更新动态内容
window.addEventListener('languageChanged', (event) => {
    const newLang = event.detail.language;

    // 更新动态生成的内容
    if (typeof renderInspirations === 'function') {
        renderInspirations();
    }
    if (typeof renderGroups === 'function') {
        renderGroups();
    }
    if (typeof renderNotifications === 'function') {
        renderNotifications();
    }

    // 重新初始化图标
    if (window.lucide) {
        lucide.createIcons();
    }
});

// Homepage global functions
window.showLogin = showLogin;
window.showRegister = showRegister;
window.scrollToFeatures = scrollToFeatures;
window.toggleLanguageMenu = toggleLanguageMenu;
window.changeLanguage = changeLanguage;
window.changeLanguageInLogin = changeLanguageInLogin;

// Notifications global functions
window.markNotificationAsRead = markNotificationAsRead;
window.deleteNotification = deleteNotification;
window.filterNotifications = filterNotifications;
window.handleNotificationClick = handleNotificationClick;

// 通知系统功能实现
async function loadNotifications() {
    try {
        document.getElementById('notificationsLoading').classList.remove('hidden');
        document.getElementById('notificationsEmpty').classList.add('hidden');

        const { data, error } = await client.database
            .from('notifications')
            .select(`
                *,
                sender:users!notifications_sender_id_fkey(nickname, avatar_url),
                inspiration:inspirations(title)
            `)
            .eq('recipient_id', currentUser.user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error loading notifications:', error);
            showToast('加载通知失败');
            return;
        }

        notifications = data || [];
        unreadNotificationCount = notifications.filter(n => !n.is_read).length;

        updateNotificationBadge();
        displayNotifications();

    } catch (error) {
        console.error('Error loading notifications:', error);
        showToast('加载通知失败');
    } finally {
        document.getElementById('notificationsLoading').classList.add('hidden');
    }
}

function updateNotificationBadge() {
    const badge = document.getElementById('unreadNotificationCount');
    if (unreadNotificationCount > 0) {
        badge.textContent = unreadNotificationCount > 99 ? '99+' : unreadNotificationCount;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function displayNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    const notificationsEmpty = document.getElementById('notificationsEmpty');

    // 根据当前筛选条件过滤通知
    let filteredNotifications = notifications;

    if (currentNotificationFilter === 'unread') {
        filteredNotifications = notifications.filter(n => !n.is_read);
    } else if (currentNotificationFilter !== 'all') {
        filteredNotifications = notifications.filter(n => n.type === currentNotificationFilter);
    }

    if (filteredNotifications.length === 0) {
        notificationsList.innerHTML = '';
        notificationsEmpty.classList.remove('hidden');
        return;
    }

    notificationsEmpty.classList.add('hidden');

    const notificationsHtml = filteredNotifications.map(notification => {
        const senderName = notification.sender?.nickname || '某位用户';
        const senderAvatar = notification.sender?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${senderName}`;
        const typeIcon = getNotificationTypeIcon(notification.type);
        const typeText = getNotificationTypeText(notification.type);

        return `
            <div class="notification-item ${notification.is_read ? '' : 'unread'}"
                 data-type="${notification.type}"
                 data-notification-id="${notification.id}"
                 onclick="handleNotificationClick('${notification.id}')">
                <div class="notification-header">
                    <div class="notification-type">
                        <i data-lucide="${typeIcon}" class="notification-type-icon"></i>
                        <span>${typeText}</span>
                    </div>
                    <span class="notification-time">${formatDate(notification.created_at)}</span>
                </div>
                <div class="notification-title">${escapeHtml(notification.title)}</div>
                <div class="notification-message">${escapeHtml(notification.message)}</div>
                <div class="notification-actions-item">
                    ${!notification.is_read ? `
                        <button class="notification-action-btn" onclick="event.stopPropagation(); markNotificationAsRead('${notification.id}')">
                            <i data-lucide="check"></i> 标记已读
                        </button>
                    ` : ''}
                    <button class="notification-action-btn" onclick="event.stopPropagation(); deleteNotification('${notification.id}')">
                        <i data-lucide="trash-2"></i> 删除
                    </button>
                </div>
            </div>
        `;
    }).join('');

    notificationsList.innerHTML = notificationsHtml;

    // 重新初始化Lucide图标
    lucide.createIcons();
}

function getNotificationTypeIcon(type) {
    const icons = {
        'like': 'heart',
        'comment': 'message-circle',
        'reply': 'reply',
        'follow': 'user-plus',
        'group_invitation': 'users',
        'group_application': 'user-check',
        'group_approval': 'check-circle'
    };
    return icons[type] || 'bell';
}

function getNotificationTypeText(type) {
    const texts = {
        'like': '点赞',
        'comment': '评论',
        'reply': '回复',
        'follow': '关注',
        'group_invitation': '小组邀请',
        'group_application': '入组申请',
        'group_approval': '申请通过'
    };
    return texts[type] || '通知';
}

async function handleNotificationClick(notificationId) {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;

    // 标记为已读
    if (!notification.is_read) {
        await markNotificationAsRead(notificationId);
    }

    // 根据通知类型处理点击事件
    if (notification.type === 'group_application') {
        // 处理小组申请通知 - 显示投票界面
        try {
            // 从通知消息中提取小组名称
            const groupNameMatch = notification.message.match(/"([^"]+)"/);
            const groupName = groupNameMatch ? groupNameMatch[1] : null;

            if (groupName) {
                // 查找该小组的待处理申请
                const { data: applications, error } = await client.database
                    .from('group_applications')
                    .select(`
                        *,
                        groups!inner(name, description, avatar_url),
                        users(nickname, avatar_url)
                    `)
                    .eq('groups.name', groupName)
                    .eq('status', 'pending')
                    .eq('applicant_id', notification.sender_id);

                if (error) {
                    console.error('Error fetching application:', error);
                    showToast('获取申请信息失败', 'error');
                    return;
                }

                if (applications && applications.length > 0) {
                    showVoteApplicationModal(applications[0]);
                } else {
                    showToast('申请不存在或已处理', 'info');
                }
            } else {
                showToast('无法解析申请信息', 'error');
            }
        } catch (error) {
            console.error('Error handling group application notification:', error);
            showToast('处理申请通知时出错', 'error');
        }
    } else if (notification.type === 'group_approval') {
        // 处理申请通过通知 - 可以跳转到小组页面
        if (notification.related_group_id) {
            switchTab('groups');
            // 可以在这里添加跳转到具体小组的逻辑
        }
    } else if (notification.related_inspiration_id) {
        // 跳转到灵感详情
        switchTab('personal');
        setTimeout(() => {
            showInspirationDetail(notification.related_inspiration_id);
        }, 100);
    }
}

async function markNotificationAsRead(notificationId) {
    try {
        const { error } = await client.database
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .eq('recipient_id', currentUser.user.id);

        if (error) {
            console.error('Error marking notification as read:', error);
            return;
        }

        // 更新本地状态
        const notification = notifications.find(n => n.id === notificationId);
        if (notification && !notification.is_read) {
            notification.is_read = true;
            unreadNotificationCount--;
            updateNotificationBadge();
            displayNotifications();
        }

    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function deleteNotification(notificationId) {
    if (!confirm('确定要删除这条通知吗？')) {
        return;
    }

    try {
        const { error } = await client.database
            .from('notifications')
            .delete()
            .eq('id', notificationId)
            .eq('recipient_id', currentUser.user.id);

        if (error) {
            console.error('Error deleting notification:', error);
            showToast('删除通知失败');
            return;
        }

        // 更新本地状态
        const notificationIndex = notifications.findIndex(n => n.id === notificationId);
        if (notificationIndex !== -1) {
            const notification = notifications[notificationIndex];
            if (!notification.is_read) {
                unreadNotificationCount--;
            }
            notifications.splice(notificationIndex, 1);
            updateNotificationBadge();
            displayNotifications();
        }

        showToast('通知已删除');

    } catch (error) {
        console.error('Error deleting notification:', error);
        showToast('删除通知失败');
    }
}

function filterNotifications(filter) {
    currentNotificationFilter = filter;

    // 更新筛选按钮状态
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');

    displayNotifications();
}

async function markAllNotificationsAsRead() {
    if (unreadNotificationCount === 0) {
        showToast('没有未读通知');
        return;
    }

    try {
        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);

        const { error } = await client.database
            .from('notifications')
            .update({ is_read: true })
            .in('id', unreadIds)
            .eq('recipient_id', currentUser.user.id);

        if (error) {
            console.error('Error marking all notifications as read:', error);
            showToast('标记已读失败');
            return;
        }

        // 更新本地状态
        notifications.forEach(n => {
            if (!n.is_read) {
                n.is_read = true;
            }
        });
        unreadNotificationCount = 0;
        updateNotificationBadge();
        displayNotifications();

        showToast('所有通知已标记为已读');

    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        showToast('标记已读失败');
    }
}

async function clearAllNotifications() {
    if (notifications.length === 0) {
        showToast('没有通知可清除');
        return;
    }

    if (!confirm('确定要清空所有通知吗？此操作不可撤销。')) {
        return;
    }

    try {
        const { error } = await client.database
            .from('notifications')
            .delete()
            .eq('recipient_id', currentUser.user.id);

        if (error) {
            console.error('Error clearing all notifications:', error);
            showToast('清空通知失败');
            return;
        }

        // 更新本地状态
        notifications = [];
        unreadNotificationCount = 0;
        updateNotificationBadge();
        displayNotifications();

        showToast('所有通知已清空');

    } catch (error) {
        console.error('Error clearing all notifications:', error);
        showToast('清空通知失败');
    }
}

// 在showMainPage函数中添加通知系统初始化和事件监听器
function initializeNotifications() {
    // 加载通知
    loadNotifications();

    // 添加通知筛选事件监听器
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            filterNotifications(btn.dataset.filter);
        });
    });

    // 添加通知操作按钮事件监听器
    document.getElementById('markAllReadBtn').addEventListener('click', markAllNotificationsAsRead);
    document.getElementById('clearAllNotificationsBtn').addEventListener('click', clearAllNotifications);
}