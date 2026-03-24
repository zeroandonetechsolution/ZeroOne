const AdminHandler = {
    init: function() {
        this.tableBody = document.getElementById('user-table-body');
        this.totalUsersEl = document.getElementById('total-users');
        this.totalPendingEl = document.getElementById('total-pending');
        this.modal = document.getElementById('user-modal');
        this.form = document.getElementById('new-user-form');
        this.resultBox = document.getElementById('creation-result');
        this.receiptModal = document.getElementById('receipt-modal');
        this.receiptForm = document.getElementById('receipt-form');

        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleCreateUser(e));
        }
        if (this.receiptForm) {
            this.receiptForm.addEventListener('submit', (e) => this.handleGenerateReceipt(e));
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
                    <div style="font-weight: 600;">${user.refId || 'No Ref ID'}</div>
                    <div style="font-size: 0.8rem; color: #a1a1aa;">${user.fullName || ''}</div>
                    <div style="font-size: 0.75rem; color: #71717a;">Mobile: ${user.username || 'N/A'}</div>
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
                        <button class="btn-premium update-btn" style="background: rgba(99, 102, 241, 0.1); color: var(--primary); border: 1px solid rgba(99, 102, 241, 0.3);" onclick="AdminHandler.showReceiptModal('${user.id}', '${user.fullName || user.username}', '${user.refId || 'No Ref ID'}')">Receipt</button>
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
        const actionsFooter = document.getElementById('modal-actions-footer');
        if (actionsFooter) actionsFooter.style.display = 'flex';
        
        // Clear Ref ID and generate it live from mobile input
        document.getElementById('new-username').value = '';
        document.getElementById('create-btn').disabled = false;
        document.getElementById('create-btn').textContent = 'Create Account';

        // Auto-generate Ref ID from mobile number (ZO + last 5 digits)
        const mobileInput = document.getElementById('new-mobile');
        mobileInput.oninput = function() {
            const digits = mobileInput.value.replace(/\D/g, ''); // strip non-digits
            if (digits.length >= 5) {
                document.getElementById('new-username').value = 'ZO' + digits.slice(-5);
            } else {
                document.getElementById('new-username').value = '';
            }
        };
    },

    hideModal: function() {
        this.modal.style.display = 'none';
    },

    showReceiptModal: function(userId, customerName, refId) {
        if (!this.receiptModal) return;
        document.getElementById('r-customer-name').textContent = customerName;
        document.getElementById('r-ref-id').value = refId;
        document.getElementById('r-name-hidden').value = customerName;
        document.getElementById('r-user-id').value = userId;
        
        // Reset inputs
        document.getElementById('r-work').value = 0;
        document.getElementById('r-service').value = 0;
        document.getElementById('r-hosting').value = 0;
        document.getElementById('r-deployment').value = 0;
        document.getElementById('r-gst').value = 0;
        this.calculateReceiptTotal();
        
        this.receiptModal.style.display = 'flex';
    },

    hideReceiptModal: function() {
        if (this.receiptModal) this.receiptModal.style.display = 'none';
    },

    toggleReceiptFields: function() {
        const type = document.getElementById('r-type').value;
        const websiteFields = document.getElementById('r-website-fields');
        if (type === 'website') {
            websiteFields.style.display = 'block';
        } else {
            websiteFields.style.display = 'none';
            document.getElementById('r-hosting').value = 0;
            document.getElementById('r-deployment').value = 0;
        }
        this.calculateReceiptTotal();
    },

    calculateReceiptTotal: function() {
        const hosting = parseFloat(document.getElementById('r-hosting').value) || 0;
        const deployment = parseFloat(document.getElementById('r-deployment').value) || 0;
        const work = parseFloat(document.getElementById('r-work').value) || 0;
        const service = parseFloat(document.getElementById('r-service').value) || 0;
        const gst = parseFloat(document.getElementById('r-gst').value) || 0;

        const type = document.getElementById('r-type').value;
        let total = work + service + gst;
        if (type === 'website') {
            total += hosting + deployment;
        }

        document.getElementById('r-amount').value = total;
    },

    handleGenerateReceipt: function(e) {
        e.preventDefault();
        
        const type = document.getElementById('r-type').value;
        const receiptData = {
            customerName: document.getElementById('r-name-hidden').value,
            refId: document.getElementById('r-ref-id').value,
            receiptId: "RC-" + new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14),
            
            // Amount Details
            type: type,
            work: parseFloat(document.getElementById('r-work').value) || 0,
            service: parseFloat(document.getElementById('r-service').value) || 0,
            hosting: parseFloat(document.getElementById('r-hosting').value) || 0,
            deployment: parseFloat(document.getElementById('r-deployment').value) || 0,
            gst: parseFloat(document.getElementById('r-gst').value) || 0,
            amount: document.getElementById('r-amount').value
        };
        
        // Cache locally
        localStorage.setItem('current_receipt', JSON.stringify(receiptData));
        
        // --- Persistence: Push to User's Login Account ---
        const userId = document.getElementById('r-user-id').value;
        if (userId) {
            fetch(`${API_BASE_URL}/api/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ billAmount: parseFloat(receiptData.amount) })
            }).then(() => {
                this.loadUsers(); // Refresh the table
            });
        }
        
        this.hideReceiptModal();
        const shareData = btoa(encodeURIComponent(JSON.stringify(receiptData)));
        window.open(`receipt.html?data=${shareData}`, '_blank');
    },

    copyShareableLink: function() {
        const dataStr = localStorage.getItem('current_receipt');
        if (!dataStr) return alert("Generate an invoice first!");
        
        const shareData = btoa(encodeURIComponent(dataStr));
        const url = `${window.location.origin}/receipt.html?data=${shareData}&customer=true`;
        
        navigator.clipboard.writeText(url).then(() => {
            alert("Shareable invoice link copied to clipboard!");
        });
    },

    handleCreateUser: async function(e) {
        e.preventDefault();
        const btn = document.getElementById('create-btn');
        btn.disabled = true;
        btn.textContent = "Provisioning...";

        const fullname = document.getElementById('new-fullname').value;
        const email = document.getElementById('new-email').value || '';
        const mobile = document.getElementById('new-mobile').value || '';
        const username = document.getElementById('new-username').value;
        const password = document.getElementById('new-password').value;
        const bill = parseFloat(document.getElementById('new-bill').value) || 0;

        try {
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    username: mobile, // Storing mobile in username field
                    password,
                    fullName: fullname,
                    email,
                    billAmount: bill,
                    refId: username   // Storing Ref ID in new ref_id field
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create user');
            }

            const data = await response.json();

            // Show Success
            document.getElementById('res-id').textContent = data.credentials.username;
            document.getElementById('res-ref-id').textContent = data.user.refId;
            document.getElementById('res-pw').textContent = data.credentials.password;
            
            // Store globally temporaily for the "Enter Receipt" button
            window._lastCreatedUser = {
                id: data.user.id,
                username: data.user.username,
                refId: data.user.refId,
                fullName: fullname
            };

            const actionsFooter = document.getElementById('modal-actions-footer');
            if (actionsFooter) actionsFooter.style.display = 'none';

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

    openReceiptFromCreation: function() {
        if (!window._lastCreatedUser) return;
        this.hideModal();
        this.showReceiptModal(
            window._lastCreatedUser.id, 
            window._lastCreatedUser.fullName, 
            window._lastCreatedUser.refId
        );
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
