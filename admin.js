// FL Studio Organizer - Admin Panel JavaScript
// Complete production-ready implementation

// ===========================
// CONFIGURATION
// ===========================

const CONFIG = {
    API_BASE: 'http://95.216.5.123:3003',
    TOKEN_KEY: 'fl_admin_token',
    USER_KEY: 'fl_admin_user',
    ITEMS_PER_PAGE: 20
};

// ===========================
// STATE MANAGEMENT
// ===========================

const STATE = {
    currentView: 'dashboard',
    currentUser: null,
    token: null,
    users: {
        data: [],
        currentPage: 1,
        totalPages: 1,
        searchQuery: '',
        statusFilter: ''
    },
    files: {
        data: [],
        currentPage: 1,
        totalPages: 1,
        searchQuery: '',
        typeFilter: '',
        bpmFilter: ''
    },
    stats: null,
    charts: {}
};

// ===========================
// UTILITY FUNCTIONS
// ===========================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `
        <i class="fas ${icons[type]} toast-icon"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;

    container.appendChild(toast);

    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
    });

    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

// ===========================
// API FUNCTIONS
// ===========================

async function apiRequest(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (STATE.token) {
        headers['Authorization'] = `Bearer ${STATE.token}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        if (response.status === 401) {
            handleUnauthorized();
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'API request failed');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

function handleUnauthorized() {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
    STATE.token = null;
    STATE.currentUser = null;
    showLogin();
    showToast('Session expired. Please login again.', 'warning');
}

// ===========================
// AUTHENTICATION
// ===========================

function initAuth() {
    const token = localStorage.getItem(CONFIG.TOKEN_KEY);
    const user = localStorage.getItem(CONFIG.USER_KEY);

    if (token && user) {
        STATE.token = token;
        STATE.currentUser = JSON.parse(user);
        showDashboard();
        loadDashboardData();
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';

    if (STATE.currentUser) {
        document.getElementById('userName').textContent = STATE.currentUser.email || 'Admin';
    }
}

async function handleLogin(email, password, rememberMe) {
    try {
        const response = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        STATE.token = response.token;
        STATE.currentUser = response.user;

        if (rememberMe) {
            localStorage.setItem(CONFIG.TOKEN_KEY, response.token);
            localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(response.user));
        } else {
            sessionStorage.setItem(CONFIG.TOKEN_KEY, response.token);
            sessionStorage.setItem(CONFIG.USER_KEY, JSON.stringify(response.user));
        }

        showToast('Login successful!', 'success');
        showDashboard();
        loadDashboardData();
    } catch (error) {
        throw error;
    }
}

function handleLogout() {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
    sessionStorage.removeItem(CONFIG.TOKEN_KEY);
    sessionStorage.removeItem(CONFIG.USER_KEY);

    STATE.token = null;
    STATE.currentUser = null;

    showToast('Logged out successfully', 'info');
    showLogin();
}

// ===========================
// DASHBOARD DATA
// ===========================

async function loadDashboardData() {
    await Promise.all([
        loadStats(),
        loadRecentActivity()
    ]);
}

async function loadStats() {
    try {
        const stats = await apiRequest('/api/admin/stats');
        STATE.stats = stats;

        document.getElementById('statTotalUsers').textContent = stats.totalUsers || 0;
        document.getElementById('statTotalFiles').textContent = stats.totalFiles || 0;
        document.getElementById('statTotalTags').textContent = stats.totalTags || 0;
        document.getElementById('statActiveToday').textContent = stats.activeToday || 0;

        document.getElementById('statUsersChange').textContent = `${stats.usersChange || 0}%`;
        document.getElementById('statFilesChange').textContent = `${stats.filesChange || 0}%`;
        document.getElementById('statTagsChange').textContent = `${stats.tagsChange || 0}%`;
    } catch (error) {
        console.error('Failed to load stats:', error);
        showToast('Failed to load statistics', 'error');
    }
}

async function loadRecentActivity() {
    const feedEl = document.getElementById('activityFeed');
    feedEl.innerHTML = '<div class="activity-loader"><i class="fas fa-spinner fa-spin"></i> Loading activity...</div>';

    try {
        const activity = await apiRequest('/api/admin/activity');

        if (!activity || activity.length === 0) {
            feedEl.innerHTML = '<div class="activity-loader">No recent activity</div>';
            return;
        }

        feedEl.innerHTML = activity.map(item => `
            <div class="activity-item">
                <div class="activity-icon" style="background: ${getActivityColor(item.type)};">
                    <i class="fas ${getActivityIcon(item.type)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${item.title}</div>
                    <div class="activity-description">${item.description}</div>
                    <div class="activity-time">${getRelativeTime(item.timestamp)}</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load activity:', error);
        feedEl.innerHTML = '<div class="activity-loader">Failed to load activity</div>';
    }
}

function getActivityIcon(type) {
    const icons = {
        user_registered: 'fa-user-plus',
        user_login: 'fa-sign-in-alt',
        file_uploaded: 'fa-upload',
        file_deleted: 'fa-trash',
        tag_created: 'fa-tag'
    };
    return icons[type] || 'fa-circle';
}

function getActivityColor(type) {
    const colors = {
        user_registered: 'linear-gradient(135deg, #FF00FF, #FF3366)',
        user_login: 'linear-gradient(135deg, #00FFFF, #0088FF)',
        file_uploaded: 'linear-gradient(135deg, #00FF88, #00CC66)',
        file_deleted: 'linear-gradient(135deg, #FF3366, #FF6699)',
        tag_created: 'linear-gradient(135deg, #FF3366, #FF6699)'
    };
    return colors[type] || 'linear-gradient(135deg, #666, #999)';
}

// ===========================
// USERS MANAGEMENT
// ===========================

async function loadUsers(page = 1) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="table-loader"><i class="fas fa-spinner fa-spin"></i> Loading users...</td></tr>';

    try {
        const params = new URLSearchParams({
            page,
            limit: CONFIG.ITEMS_PER_PAGE,
            search: STATE.users.searchQuery,
            status: STATE.users.statusFilter
        });

        const response = await apiRequest(`/api/admin/users?${params}`);

        STATE.users.data = response.users || [];
        STATE.users.currentPage = response.currentPage || 1;
        STATE.users.totalPages = response.totalPages || 1;

        if (STATE.users.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="table-loader">No users found</td></tr>';
            return;
        }

        tbody.innerHTML = STATE.users.data.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.email}</td>
                <td>${user.displayName || '-'}</td>
                <td>${formatDate(user.createdAt)}</td>
                <td>
                    <span class="status-badge ${user.status || 'active'}">
                        ${(user.status || 'active').toUpperCase()}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="action-icon-btn" onclick="viewUser(${user.id})" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-icon-btn" onclick="toggleUserStatus(${user.id}, '${user.status || 'active'}')" title="Toggle Status">
                            <i class="fas fa-toggle-${user.status === 'active' ? 'on' : 'off'}"></i>
                        </button>
                        <button class="action-icon-btn danger" onclick="deleteUser(${user.id})" title="Delete User">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        renderPagination('usersPagination', STATE.users.currentPage, STATE.users.totalPages, loadUsers);
    } catch (error) {
        console.error('Failed to load users:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="table-loader">Failed to load users</td></tr>';
        showToast('Failed to load users', 'error');
    }
}

async function viewUser(userId) {
    const modal = document.getElementById('userDetailModal');
    const body = document.getElementById('userDetailBody');

    modal.classList.add('active');
    body.innerHTML = '<div class="modal-loader"><i class="fas fa-spinner fa-spin"></i> Loading user details...</div>';

    try {
        const user = await apiRequest(`/api/admin/users/${userId}`);

        body.innerHTML = `
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">ID</span>
                    <span class="detail-value">${user.id}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Email</span>
                    <span class="detail-value">${user.email}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Display Name</span>
                    <span class="detail-value">${user.displayName || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Status</span>
                    <span class="detail-value">
                        <span class="status-badge ${user.status || 'active'}">
                            ${(user.status || 'active').toUpperCase()}
                        </span>
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">File Count</span>
                    <span class="detail-value">${user.fileCount || 0}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Last Login</span>
                    <span class="detail-value">${user.lastLogin ? formatDateTime(user.lastLogin) : 'Never'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Created At</span>
                    <span class="detail-value">${formatDateTime(user.createdAt)}</span>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Failed to load user details:', error);
        body.innerHTML = '<div class="modal-loader">Failed to load user details</div>';
        showToast('Failed to load user details', 'error');
    }
}

async function toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    try {
        await apiRequest(`/api/admin/users/${userId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });

        showToast(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`, 'success');
        loadUsers(STATE.users.currentPage);
    } catch (error) {
        console.error('Failed to toggle user status:', error);
        showToast('Failed to update user status', 'error');
    }
}

async function deleteUser(userId) {
    showConfirmModal(
        'Delete User',
        'Are you sure you want to delete this user? This action cannot be undone.',
        async () => {
            try {
                await apiRequest(`/api/admin/users/${userId}`, {
                    method: 'DELETE'
                });

                showToast('User deleted successfully', 'success');
                loadUsers(STATE.users.currentPage);
            } catch (error) {
                console.error('Failed to delete user:', error);
                showToast('Failed to delete user', 'error');
            }
        }
    );
}

// ===========================
// FILES MANAGEMENT
// ===========================

async function loadFiles(page = 1) {
    const tbody = document.getElementById('filesTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="table-loader"><i class="fas fa-spinner fa-spin"></i> Loading files...</td></tr>';

    try {
        const params = new URLSearchParams({
            page,
            limit: CONFIG.ITEMS_PER_PAGE,
            search: STATE.files.searchQuery,
            type: STATE.files.typeFilter,
            bpm: STATE.files.bpmFilter
        });

        const response = await apiRequest(`/api/admin/files?${params}`);

        STATE.files.data = response.files || [];
        STATE.files.currentPage = response.currentPage || 1;
        STATE.files.totalPages = response.totalPages || 1;

        if (STATE.files.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="table-loader">No files found</td></tr>';
            return;
        }

        tbody.innerHTML = STATE.files.data.map(file => `
            <tr>
                <td>${file.filename}</td>
                <td>${file.type || '-'}</td>
                <td>${file.userEmail || '-'}</td>
                <td>${file.bpm || '-'}</td>
                <td>${file.key || '-'}</td>
                <td>
                    ${file.tags ? `
                        <div class="tag-list">
                            ${file.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
                            ${file.tags.length > 3 ? `<span class="tag">+${file.tags.length - 3}</span>` : ''}
                        </div>
                    ` : '-'}
                </td>
                <td>
                    <div class="table-actions">
                        <button class="action-icon-btn" onclick="viewFile(${file.id})" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-icon-btn danger" onclick="deleteFile(${file.id})" title="Delete File">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        renderPagination('filesPagination', STATE.files.currentPage, STATE.files.totalPages, loadFiles);
    } catch (error) {
        console.error('Failed to load files:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="table-loader">Failed to load files</td></tr>';
        showToast('Failed to load files', 'error');
    }
}

async function viewFile(fileId) {
    const modal = document.getElementById('fileDetailModal');
    const body = document.getElementById('fileDetailBody');

    modal.classList.add('active');
    body.innerHTML = '<div class="modal-loader"><i class="fas fa-spinner fa-spin"></i> Loading file details...</div>';

    try {
        const file = await apiRequest(`/api/admin/files/${fileId}`);

        body.innerHTML = `
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">ID</span>
                    <span class="detail-value">${file.id}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Filename</span>
                    <span class="detail-value">${file.filename}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Type</span>
                    <span class="detail-value">${file.type || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">User</span>
                    <span class="detail-value">${file.userEmail || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">BPM</span>
                    <span class="detail-value">${file.bpm || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Key</span>
                    <span class="detail-value">${file.key || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">File Size</span>
                    <span class="detail-value">${file.size ? formatFileSize(file.size) : '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Created At</span>
                    <span class="detail-value">${formatDateTime(file.createdAt)}</span>
                </div>
                ${file.tags && file.tags.length > 0 ? `
                    <div class="detail-item" style="grid-column: 1 / -1;">
                        <span class="detail-label">Tags</span>
                        <div class="tag-list">
                            ${file.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    } catch (error) {
        console.error('Failed to load file details:', error);
        body.innerHTML = '<div class="modal-loader">Failed to load file details</div>';
        showToast('Failed to load file details', 'error');
    }
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function deleteFile(fileId) {
    showConfirmModal(
        'Delete File',
        'Are you sure you want to delete this file? This action cannot be undone.',
        async () => {
            try {
                await apiRequest(`/api/admin/files/${fileId}`, {
                    method: 'DELETE'
                });

                showToast('File deleted successfully', 'success');
                loadFiles(STATE.files.currentPage);
            } catch (error) {
                console.error('Failed to delete file:', error);
                showToast('Failed to delete file', 'error');
            }
        }
    );
}

// ===========================
// ANALYTICS
// ===========================

async function loadAnalytics() {
    try {
        const analytics = await apiRequest('/api/admin/analytics');

        renderUsersChart(analytics.usersOverTime || []);
        renderFilesChart(analytics.filesByType || {});
        renderBpmChart(analytics.bpmRanges || {});
        renderTopTags(analytics.topTags || []);
    } catch (error) {
        console.error('Failed to load analytics:', error);
        showToast('Failed to load analytics', 'error');
    }
}

function renderUsersChart(data) {
    const canvas = document.getElementById('usersChart');
    if (!canvas) return;

    if (STATE.charts.users) {
        STATE.charts.users.destroy();
    }

    const ctx = canvas.getContext('2d');
    STATE.charts.users = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.date),
            datasets: [{
                label: 'New Users',
                data: data.map(d => d.count),
                borderColor: '#FF00FF',
                backgroundColor: 'rgba(255, 0, 255, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#B8B8C8' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#B8B8C8' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    ticks: { color: '#B8B8C8' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            }
        }
    });
}

function renderFilesChart(data) {
    const canvas = document.getElementById('filesChart');
    if (!canvas) return;

    if (STATE.charts.files) {
        STATE.charts.files.destroy();
    }

    const ctx = canvas.getContext('2d');
    STATE.charts.files = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: [
                    '#FF00FF',
                    '#00FFFF',
                    '#FF3366',
                    '#00FF88',
                    '#FFA500'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#B8B8C8' }
                }
            }
        }
    });
}

function renderBpmChart(data) {
    const canvas = document.getElementById('bpmChart');
    if (!canvas) return;

    if (STATE.charts.bpm) {
        STATE.charts.bpm.destroy();
    }

    const ctx = canvas.getContext('2d');
    STATE.charts.bpm = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: 'Files',
                data: Object.values(data),
                backgroundColor: 'rgba(255, 0, 255, 0.7)',
                borderColor: '#FF00FF',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#B8B8C8' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#B8B8C8' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    ticks: { color: '#B8B8C8' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            }
        }
    });
}

function renderTopTags(tags) {
    const container = document.getElementById('topTagsList');
    if (!container) return;

    if (tags.length === 0) {
        container.innerHTML = '<div class="activity-loader">No tags found</div>';
        return;
    }

    container.innerHTML = tags.map(tag => `
        <div class="tag-item">
            <span class="tag-name">${tag.name}</span>
            <span class="tag-count">${tag.count}</span>
        </div>
    `).join('');
}

// ===========================
// NAVIGATION
// ===========================

function switchView(viewName) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === viewName) {
            item.classList.add('active');
        }
    });

    // Update views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    const targetView = document.getElementById(`${viewName}View`);
    if (targetView) {
        targetView.classList.add('active');
    }

    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        users: 'Users Management',
        files: 'Files Management',
        analytics: 'Analytics',
        settings: 'Settings'
    };
    document.getElementById('pageTitle').textContent = titles[viewName] || 'Dashboard';

    STATE.currentView = viewName;

    // Load data for the view
    if (viewName === 'users') {
        loadUsers(1);
    } else if (viewName === 'files') {
        loadFiles(1);
    } else if (viewName === 'analytics') {
        loadAnalytics();
    }
}

// ===========================
// PAGINATION
// ===========================

function renderPagination(containerId, currentPage, totalPages, loadFunction) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = `
        <button class="pagination-btn" onclick="${loadFunction.name}(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="${loadFunction.name}(${i})">
                ${i}
            </button>
        `;
    }

    html += `
        <button class="pagination-btn" onclick="${loadFunction.name}(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    container.innerHTML = html;
}

// ===========================
// MODALS
// ===========================

function showConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    document.getElementById('confirmModalTitle').textContent = title;
    document.getElementById('confirmModalMessage').textContent = message;

    modal.classList.add('active');

    const confirmBtn = document.getElementById('confirmModalConfirm');
    const cancelBtn = document.getElementById('confirmModalCancel');

    const handleConfirm = () => {
        modal.classList.remove('active');
        onConfirm();
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
    };

    const handleCancel = () => {
        modal.classList.remove('active');
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
}

// ===========================
// EVENT LISTENERS
// ===========================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize auth
    initAuth();

    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('rememberMe').checked;

            const loginBtn = document.getElementById('loginBtn');
            const errorEl = document.getElementById('loginError');

            loginBtn.classList.add('loading');
            loginBtn.disabled = true;
            errorEl.style.display = 'none';

            try {
                await handleLogin(email, password, rememberMe);
            } catch (error) {
                errorEl.querySelector('.error-text').textContent = error.message || 'Login failed. Please check your credentials.';
                errorEl.style.display = 'flex';
            } finally {
                loginBtn.classList.remove('loading');
                loginBtn.disabled = false;
            }
        });
    }

    // Password toggle
    const passwordToggle = document.getElementById('passwordToggle');
    if (passwordToggle) {
        passwordToggle.addEventListener('click', () => {
            const passwordInput = document.getElementById('password');
            const icon = passwordToggle.querySelector('i');

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    }

    // OAuth buttons (placeholder)
    document.getElementById('googleLogin')?.addEventListener('click', () => {
        showToast('Google OAuth not implemented yet', 'info');
    });

    document.getElementById('discordLogin')?.addEventListener('click', () => {
        showToast('Discord OAuth not implemented yet', 'info');
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
    });

    // User dropdown
    const userDropdownBtn = document.getElementById('userDropdownBtn');
    const userDropdownMenu = document.getElementById('userDropdownMenu');

    if (userDropdownBtn && userDropdownMenu) {
        userDropdownBtn.addEventListener('click', () => {
            userDropdownMenu.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!userDropdownBtn.contains(e.target) && !userDropdownMenu.contains(e.target)) {
                userDropdownMenu.classList.remove('active');
            }
        });
    }

    // Navigation
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(item.dataset.view);
        });
    });

    // Quick actions
    document.querySelectorAll('.action-btn[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            switchView(btn.dataset.view);
        });
    });

    // Mobile menu
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');

    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // User search
    const userSearch = document.getElementById('userSearch');
    if (userSearch) {
        let timeout;
        userSearch.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                STATE.users.searchQuery = e.target.value;
                loadUsers(1);
            }, 500);
        });
    }

    // User status filter
    const userStatusFilter = document.getElementById('userStatusFilter');
    if (userStatusFilter) {
        userStatusFilter.addEventListener('change', (e) => {
            STATE.users.statusFilter = e.target.value;
            loadUsers(1);
        });
    }

    // File search
    const fileSearch = document.getElementById('fileSearch');
    if (fileSearch) {
        let timeout;
        fileSearch.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                STATE.files.searchQuery = e.target.value;
                loadFiles(1);
            }, 500);
        });
    }

    // File filters
    const fileTypeFilter = document.getElementById('fileTypeFilter');
    if (fileTypeFilter) {
        fileTypeFilter.addEventListener('change', (e) => {
            STATE.files.typeFilter = e.target.value;
            loadFiles(1);
        });
    }

    const fileBpmFilter = document.getElementById('fileBpmFilter');
    if (fileBpmFilter) {
        fileBpmFilter.addEventListener('change', (e) => {
            STATE.files.bpmFilter = e.target.value;
            loadFiles(1);
        });
    }

    // Refresh activity
    document.getElementById('refreshActivity')?.addEventListener('click', () => {
        loadRecentActivity();
    });

    // Export data
    document.getElementById('exportDataBtn')?.addEventListener('click', () => {
        showToast('Export functionality coming soon', 'info');
    });

    // Test API connection
    document.getElementById('testApiBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('testApiBtn');
        const statusIndicator = document.getElementById('apiStatusIndicator');
        const statusText = document.getElementById('apiStatusText');

        btn.disabled = true;
        statusIndicator.className = 'status-indicator';
        statusText.textContent = 'Testing...';

        try {
            await apiRequest('/api/health');
            statusIndicator.className = 'status-indicator online';
            statusText.textContent = 'Connected';
            showToast('API connection successful', 'success');
        } catch (error) {
            statusIndicator.className = 'status-indicator offline';
            statusText.textContent = 'Disconnected';
            showToast('API connection failed', 'error');
        } finally {
            btn.disabled = false;
        }
    });

    // Modal close buttons
    document.getElementById('closeUserModal')?.addEventListener('click', () => {
        document.getElementById('userDetailModal').classList.remove('active');
    });

    document.getElementById('closeFileModal')?.addEventListener('click', () => {
        document.getElementById('fileDetailModal').classList.remove('active');
    });

    document.getElementById('closeConfirmModal')?.addEventListener('click', () => {
        document.getElementById('confirmModal').classList.remove('active');
    });

    // Modal backdrop clicks
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', () => {
            backdrop.parentElement.classList.remove('active');
        });
    });
});

// Make functions globally accessible
window.viewUser = viewUser;
window.toggleUserStatus = toggleUserStatus;
window.deleteUser = deleteUser;
window.viewFile = viewFile;
window.deleteFile = deleteFile;
window.loadUsers = loadUsers;
window.loadFiles = loadFiles;

console.log('FL Studio Organizer Admin Panel - Loaded Successfully!');
