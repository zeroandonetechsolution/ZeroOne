/**
 * Payment-Handler.js - Data fetching for customer dashboard & Payment Logic
 */

const PaymentConfig = {
    UPI_ID: "zeroandone@upi", // Replace with actual UPI ID
    PAYEE_NAME: "Zero & One Tech Solutions", // Replace with actual company name
    QR_IMAGE_PATH: "assets/images/payment/qr%20code%20kvb.jpeg"
};

const PaymentHandler = {
    currentBillAmount: 0,
    cashfree: null,

    init: async function() {
        try {
            // Initialize Cashfree SDK (v3)
            this.cashfree = Cashfree({ mode: "sandbox" }); // Change to "production" for live
            
            const userData = await this.getUserData();
            if (userData) {
                this.updateBillUI(userData);
            }
            
            // Refresh every 10 seconds
            setInterval(async () => {
                const data = await this.getUserData();
                if (data) this.updateBillUI(data);
            }, 10000);

            // Initialize UI elements
            this.setupEventListeners();
        } catch (error) {
            console.error("Payment handler init error:", error);
        }
    },

    setupEventListeners: function() {
        // Close modal when clicking outside
        const modal = document.getElementById('payment-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal();
            });
        }
    },

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

    updateBillUI: function(data) {
        this.currentBillAmount = data.billAmount || 0;
        const amountEl = document.getElementById('bill-amount');
        const statusEl = document.getElementById('bill-status');
        const dateEl = document.getElementById('bill-date');

        if (amountEl) {
            amountEl.textContent = `₹${this.currentBillAmount.toLocaleString('en-IN')}`;
            
            if (statusEl) {
                if (this.currentBillAmount <= 0) {
                    statusEl.textContent = "Payment Completed";
                    statusEl.className = "status-badge status-paid";
                } else {
                    statusEl.textContent = "Payment Pending";
                    statusEl.className = "status-badge status-unpaid";
                }
            }
        }

        if (dateEl && data.updatedAt) {
            const date = new Date(data.updatedAt);
            dateEl.textContent = `Last Updated: ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
    },

    // --- Modal & Payment Logic ---

    openPaymentModal: function(type) {
        const modal = document.getElementById('payment-modal');
        const upiContent = document.getElementById('upi-modal-content');
        const qrContent = document.getElementById('qr-modal-content');
        const verifyContent = document.getElementById('manual-verify-content');
        
        if (!modal) return;

        // Reset display
        upiContent.style.display = 'none';
        qrContent.style.display = 'none';
        verifyContent.style.display = 'none';

        if (type === 'upi') {
            upiContent.style.display = 'block';
            this.setupUPI();
        } else if (type === 'qr') {
            qrContent.style.display = 'block';
            
            // Show verification option after a delay or user interaction
            setTimeout(() => {
               verifyContent.style.display = 'block'; 
            }, 2000);
        }

        modal.style.display = 'flex';
    },

    closeModal: function() {
        const modal = document.getElementById('payment-modal');
        if (modal) modal.style.display = 'none';
    },

    setupUPI: function() {
        const upiDisplay = document.getElementById('upi-id-display');
        const payBtn = document.getElementById('pay-app-btn');
        const verifyContent = document.getElementById('manual-verify-content');

        if (upiDisplay) upiDisplay.textContent = PaymentConfig.UPI_ID;

        if (payBtn) {
            // Encode parameters properly
            const amount = this.currentBillAmount > 0 ? this.currentBillAmount : ''; // Don't enforce 0 amount
            const upiLink = `upi://pay?pa=${PaymentConfig.UPI_ID}&pn=${encodeURIComponent(PaymentConfig.PAYEE_NAME)}&am=${amount}&tn=BillPayment`;
            
            payBtn.onclick = () => {
                window.location.href = upiLink;
                // Show verification after clicking pay
                if (verifyContent) verifyContent.style.display = 'block';
            };
        }
    },

    copyUPI: function() {
        navigator.clipboard.writeText(PaymentConfig.UPI_ID).then(() => {
            alert("UPI ID copied to clipboard!");
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    },

    handlePayUPayment: async function() {
        if (this.currentBillAmount <= 0) return alert("No pending bill amount.");
        
        try {
            // 1. Get transaction hash and details from backend
            const response = await fetch(`${API_BASE_URL}/api/payments/payu/hash`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ 
                    amount: this.currentBillAmount,
                    productInfo: "Service Invoice"
                })
            });

            if (!response.ok) throw new Error("Could not initialize PayU session");
            
            const data = await response.json();
            
            // 2. Create a form and submit it to PayU
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = data.action;

            const fields = {
                key: data.key,
                txnid: data.txnid,
                amount: data.amount,
                productinfo: data.productInfo,
                firstname: data.firstname,
                email: data.email,
                phone: data.phone || '9999999999',
                surl: data.surl,
                furl: data.furl,
                hash: data.hash,
                service_provider: 'payu_paisa'
            };

            for (const key in fields) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = fields[key];
                form.appendChild(input);
            }

            document.body.appendChild(form);
            form.submit();

        } catch (error) {
            console.error("PayU error:", error);
            alert("Payment failed to initialize: " + error.message);
        }
    },

    // Legacy or Other method placeholder
    handleCashfreePayment: function() {
        alert("This method is currently using the new PayU integration. Please use the 'Pay Now' buttons.");
    },

    requestVerification: function() {
        alert("Thank you! Admin has been notified to verify your payment.");
        this.closeModal();
        // Here you would typically send an API request to notify admin
    }
};

document.addEventListener('DOMContentLoaded', () => PaymentHandler.init());
