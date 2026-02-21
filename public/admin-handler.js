const AdminHandler = {
    init: function() {
        this.tableBody = document.getElementById('user-table-body');
        this.totalUsersEl = document.getElementById('total-users');
        this.totalPendingEl = document.getElementById('total-pending');
        this.modal = document.getElementById('user-modal');
        this.form = document.getElementById('new-user-form');
        this.resultBox = document.getElementById('creation-result');

        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleCreateUser(e));
        }

        this.loadUsers();
        // Refresh users every 5 seconds
        setInterval(() => this.loadUsers(), 5000);
    },

    loadUsers: async function() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to load users');
            }

            const users = await response.json();
            const userList = users.filter(u => u.role === 'user');
            this.renderUsers(userList);
            this.updateStats(userList);
        } catch (error) {
            console.error("Error loading users:", error);
        }
    },

    renderUsers: function(users) {
        if (!this.tableBody) return;
        this.tableBody.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            row.className = 'user-row';
            
            const amount = user.billAmount || 0;
            const statusClass = amount > 0 ? 'status-unpaid' : 'status-paid';
            const statusText = amount > 0 ? 'Pending' : 'Cleared';

            row.innerHTML = `
                <td>
                    <div style="font-weight: 600;">${user.username || 'No Ref ID'}</div>
                    <div style="font-size: 0.8rem; color: #71717a;">${user.fullName || ''}</div>
                </td>
                <td style="color: #a1a1aa;">${user.email || 'N/A'}</td>
                <td>
                    <input type="number" class="bill-input" value="${amount}" id="input-${user.id}">
                </td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
                <td>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn-premium update-btn" onclick="AdminHandler.updateBill('${user.id}')">Update</button>
                        <button class="btn-premium update-btn" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2);" onclick="AdminHandler.deleteUser('${user.id}')">Delete</button>
                    </div>
                </td>
            `;
            this.tableBody.appendChild(row);
        });
    },

    updateStats: function(users) {
        if (this.totalUsersEl) this.totalUsersEl.textContent = users.length;
        
        const totalAmount = users.reduce((acc, user) => acc + (user.billAmount || 0), 0);
        if (this.totalPendingEl) {
            this.totalPendingEl.textContent = `₹${totalAmount.toLocaleString('en-IN')}`;
        }
    },

    showModal: function() {
        this.modal.style.display = 'flex';
        this.form.reset();
        this.resultBox.style.display = 'none';
    },

    hideModal: function() {
        this.modal.style.display = 'none';
    },

    handleCreateUser: async function(e) {
        e.preventDefault();
        const btn = document.getElementById('create-btn');
        btn.disabled = true;
        btn.textContent = "Provisioning...";

        const fullname = document.getElementById('new-fullname').value;
        const email = document.getElementById('new-email').value;
        const username = document.getElementById('new-username').value;
        const password = document.getElementById('new-password').value;
        const bill = parseFloat(document.getElementById('new-bill').value);

        try {
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    username,
                    password,
                    fullName: fullname,
                    email,
                    billAmount: bill
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create user');
            }

            const data = await response.json();

            // Show Success
            document.getElementById('res-id').textContent = data.credentials.username;
            document.getElementById('res-pw').textContent = data.credentials.password;
            this.resultBox.style.display = 'block';
            this.resultBox.scrollIntoView({ behavior: 'smooth' });
            btn.textContent = "Account Created";
            
            // Reload users
            this.loadUsers();
        } catch (error) {
            console.error("Provisioning failed:", error);
            alert("Provisioning failed: " + error.message);
            btn.disabled = false;
            btn.textContent = "Create Account";
        }
    },

    updateBill: async function(userId) {
        const input = document.getElementById(`input-${userId}`);
        if (!input) return;

        const newAmount = parseFloat(input.value);
        if (isNaN(newAmount)) return alert("Please enter a valid amount.");

        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    billAmount: newAmount
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update bill');
            }

            this.loadUsers();
        } catch (error) {
            console.error("Update failed:", error);
            alert("Failed to update bill.");
        }
    },

    deleteUser: async function(userId) {
        if (!confirm("Are you sure? This will delete the user permanently.")) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete user');
            }

            this.loadUsers();
        } catch (error) {
            alert("Error: " + error.message);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => AdminHandler.init());
