/**
 * Core.js - Centralized logic for Zero & One Tech Solutions
 * Handles API communication and shared Auth utilities.
 */

// Set this to your deployed backend URL (e.g., https://zero-one-api.onrender.com)
// If empty, it will use the current domain (localhost or firebase)
const PROD_API_URL = 'https://zeroone-o0u0.onrender.com'; 
const API_BASE_URL = PROD_API_URL || window.location.origin;

const Core = {
    currentUser: null,

    init: function() {
        console.log("Core initialized.");
        this.setupAuthState();
    },

    /**
     * Auth state listener that handles role-based redirection
     */
    setupAuthState: async function() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.updateUI(data.user);
                this.handleRoleRedirection(data.user);
            } else {
                this.currentUser = null;
                this.resetUI();
                if (this.isProtectedRoute()) {
                    window.location.href = 'user-login.html';
                }
            }
        } catch (error) {
            console.error("Session check error:", error);
            this.currentUser = null;
            this.resetUI();
            if (this.isProtectedRoute()) {
                window.location.href = 'user-login.html';
            }
        }
    },

    /**
     * Get current user data
     */
    getUserData: async function() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                credentials: 'include'
            });

            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error("Error fetching user data:", error);
            return null;
        }
    },

    /**
     * Shared role-based redirection logic
     */
    handleRoleRedirection: function(userData) {
        const path = window.location.pathname;
        const currentPage = path.split('/').pop() || 'index.html';
        const role = userData ? userData.role : 'user';
        
        const isMasterAdmin = (userData && userData.username === 'zeroandone');

        // Prevent logged-in users from hitting login pages
        if (currentPage === 'user-login.html' || currentPage === 'admin-login.html') {
            window.location.href = (role === 'admin' || isMasterAdmin) ? 'admin-dashboard.html' : 'payment.html';
        }

        // Security: Kick non-admins out of admin dashboard
        if (currentPage === 'admin-dashboard.html' && role !== 'admin' && !isMasterAdmin) {
            window.location.href = 'index.html';
        }
    },

    isProtectedRoute: function() {
        const protectedRoutes = ['payment.html', 'admin-dashboard.html'];
        const currentPage = window.location.pathname.split('/').pop();
        return protectedRoutes.includes(currentPage);
    },

    updateUI: function(userData) {
        const loginNavItem = document.getElementById('login-nav-item');
        const userNavItem = document.getElementById('user-nav-item');
        const adminNavItem = document.getElementById('admin-nav-item');
        const userDashboardNavItem = document.getElementById('user-dashboard-nav-item');
        const userDisplay = document.getElementById('user-name-display');

        const role = userData?.role || 'user';
        const isMasterAdmin = (userData && userData.username === 'zeroandone');

        if (loginNavItem) loginNavItem.style.display = 'none';
        if (userNavItem) userNavItem.style.display = 'flex';
        
        if (adminNavItem) {
            adminNavItem.style.display = (role === 'admin' || isMasterAdmin) ? 'block' : 'none';
        }
        
        if (userDashboardNavItem) {
            userDashboardNavItem.style.display = (role === 'user' && !isMasterAdmin) ? 'block' : 'none';
        }

        if (userDisplay) {
            userDisplay.textContent = userData?.fullName || userData?.username || 'User';
            userDisplay.style.display = 'block';
        }
    },

    resetUI: function() {
        const loginNavItem = document.getElementById('login-nav-item');
        const userNavItem = document.getElementById('user-nav-item');
        const adminNavItem = document.getElementById('admin-nav-item');
        const userDashboardNavItem = document.getElementById('user-dashboard-nav-item');

        if (loginNavItem) loginNavItem.style.display = 'block';
        if (userNavItem) userNavItem.style.display = 'none';
        if (adminNavItem) adminNavItem.style.display = 'none';
        if (userDashboardNavItem) userDashboardNavItem.style.display = 'none';
    },

    logout: async function() {
        try {
            await fetch(`${API_BASE_URL}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            window.location.href = 'index.html';
        } catch (error) {
            console.error("Logout error:", error);
            window.location.href = 'index.html';
        }
    }
};

// Start core services
document.addEventListener('DOMContentLoaded', () => Core.init());
