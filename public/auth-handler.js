/**
 * Auth-Handler.js - Unified login logic
 */

const AuthHandler = {
    init: function() {
        this.form = document.getElementById('auth-form');
        this.errorMsg = document.getElementById('auth-error');
        this.submitBtn = document.getElementById('submit-btn');
        this.authPageType = document.body.classList.contains('admin-theme') ? 'admin' : 'user';

        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleLogin(e));
        }
    },

    handleLogin: async function(e) {
        e.preventDefault();
        this.clearError();
        this.setLoading(true);

        const usernameInput = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    username: usernameInput,
                    password: password
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Login failed');
            }

            const data = await response.json();
            const user = data.user;

            // Verify role if on admin page
            if (this.authPageType === 'admin') {
                const isMasterAdmin = (user.username === 'jega');
                
                if (user.role.toLowerCase() !== 'admin' && !isMasterAdmin) {
                    await this.logout();
                    throw new Error("Access Denied: Admin privileges required.");
                }
            }

            // Redirect based on role
            if (user.role.toLowerCase() === 'admin' || user.username === 'jega') {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'payment.html';
            }
        } catch (error) {
            this.showError(error.message);
            this.setLoading(false);
        }
    },

    logout: async function() {
        try {
            await fetch(`${API_BASE_URL}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (e) {
            console.error("Logout failed:", e);
        }
    },

    showError: function(msg) {
        if (this.errorMsg) {
            this.errorMsg.textContent = msg;
            this.errorMsg.style.display = 'block';
        }
    },

    clearError: function() {
        if (this.errorMsg) this.errorMsg.style.display = 'none';
    },

    setLoading: function(loading) {
        if (this.submitBtn) {
            this.submitBtn.disabled = loading;
            this.submitBtn.innerHTML = loading ? '<span class="spinner"></span> Authenticating...' : 'Authenticate';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => AuthHandler.init());
