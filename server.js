const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs").promises;
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { Cashfree } = require('cashfree-pg');

const app = express();

// Initialize Cashfree
Cashfree.XClientId = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = process.env.CASHFREE_ENV === 'PRODUCTION' 
    ? Cashfree.Environment.PRODUCTION 
    : Cashfree.Environment.SANDBOX;
const PORT = process.env.PORT || 3000;

// Required for secure cookies on Render/Heroku
app.set('trust proxy', 1);

// File paths
const USERS_FILE = path.join(__dirname, "users.json");
const SESSIONS_FILE = path.join(__dirname, "sessions.json");

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://zeroone-o0u0.onrender.com',
  "https://zeroandonetech.web.app",
  "https://zeroandonetech.firebaseapp.com",
  "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(
          new Error(
            "The CORS policy for this site does not allow access from the specified Origin.",
          ),
          false,
        );
      }
      return callback(null, true);
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "zeroone-secret-key-prod-123",
    resave: false,
    saveUninitialized: false,
    proxy: process.env.NODE_ENV === "production", // Required for many hosts like Render
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Required for cross-site cookies
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

// Serve static files from public directory
app.use(express.static("public"));

// Helper functions
async function readUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return { users: [] };
  }
}

async function writeUsers(data) {
  await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2));
}

function findUserByUsername(users, username) {
  return users.find((u) => u.username === username);
}

function findUserById(users, id) {
  return users.find((u) => u.id === id);
}

// Middleware to check authentication
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

// Middleware to check admin role
async function requireAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { users } = await readUsers();
  const user = findUserById(users, req.session.userId);

  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
}

// ============= AUTH ENDPOINTS =============

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const { users } = await readUsers();
    const user = findUserByUsername(users, username);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Set session
    req.session.userId = user.id;
    req.session.role = user.role;

    // Return user data (without password)
    const { passwordHash, ...userData } = user;
    res.json({ user: userData });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Logout
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.json({ message: "Logged out successfully" });
  });
});

// Check session
app.get("/api/auth/session", requireAuth, async (req, res) => {
  try {
    const { users } = await readUsers();
    const user = findUserById(users, req.session.userId);

    if (!user) {
      req.session.destroy();
      return res.status(401).json({ error: "Session invalid" });
    }

    const { passwordHash, ...userData } = user;
    res.json({ user: userData });
  } catch (error) {
    console.error("Session check error:", error);
    res.status(500).json({ error: "Session check failed" });
  }
});

// ============= USER ENDPOINTS =============

// Get current user data
app.get("/api/users/me", requireAuth, async (req, res) => {
  try {
    const { users } = await readUsers();
    const user = findUserById(users, req.session.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { passwordHash, ...userData } = user;
    res.json(userData);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to get user data" });
  }
});

// Get all users (admin only)
app.get("/api/users", requireAdmin, async (req, res) => {
  try {
    const { users } = await readUsers();
    const usersWithoutPasswords = users.map(
      ({ passwordHash, ...user }) => user,
    );
    res.json(usersWithoutPasswords);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Failed to get users" });
  }
});

// Create user (admin only)
app.post("/api/users", requireAdmin, async (req, res) => {
  try {
    const { username, password, fullName, email, billAmount } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const data = await readUsers();

    // Check if username already exists
    if (findUserByUsername(data.users, username)) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      id: uuidv4(),
      username,
      passwordHash,
      fullName: fullName || "",
      email: email || "",
      role: "user",
      billAmount: parseFloat(billAmount) || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    data.users.push(newUser);
    await writeUsers(data);

    const { passwordHash: _, ...userData } = newUser;
    res
      .status(201)
      .json({ user: userData, credentials: { username, password } });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Update user (admin only)
app.put("/api/users/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { billAmount, fullName, email } = req.body;

    const data = await readUsers();
    const userIndex = data.users.findIndex((u) => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update user
    if (billAmount !== undefined) {
      data.users[userIndex].billAmount = parseFloat(billAmount);
    }
    if (fullName !== undefined) {
      data.users[userIndex].fullName = fullName;
    }
    if (email !== undefined) {
      data.users[userIndex].email = email;
    }
    data.users[userIndex].updatedAt = new Date().toISOString();

    await writeUsers(data);

    const { passwordHash, ...userData } = data.users[userIndex];
    res.json(userData);
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Delete user (admin only)
app.delete("/api/users/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const data = await readUsers();
    const userIndex = data.users.findIndex((u) => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prevent deleting admin users
    if (data.users[userIndex].role === "admin") {
      return res.status(403).json({ error: "Cannot delete admin users" });
    }

    data.users.splice(userIndex, 1);
    await writeUsers(data);

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// ============= PAYMENT ENDPOINTS =============

// Create Cashfree Order
app.post('/api/payments/create', requireAuth, async (req, res) => {
    try {
        const { amount, customerName, customerEmail, customerPhone } = req.body;
        const { users } = await readUsers();
        const user = findUserById(users, req.session.userId);

        if (!user) return res.status(404).json({ error: 'User not found' });

        const orderId = `order_${uuidv4().substring(0, 8)}_${Date.now()}`;

        const request = {
            "order_amount": parseFloat(amount).toFixed(2),
            "order_currency": "INR",
            "order_id": orderId,
            "customer_details": {
                "customer_id": user.id,
                "customer_name": customerName || user.fullName || "Customer",
                "customer_email": customerEmail || user.email || "info@zeroone.site",
                "customer_phone": customerPhone || "9999999999"
            },
            "order_meta": {
                "return_url": `${process.env.FRONTEND_URL}/payment-status.html?order_id={order_id}`
            }
        };

        const response = await Cashfree.PGCreateOrder("2023-08-01", request);
        res.json(response.data);
    } catch (error) {
        console.error('Cashfree Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Payment initialization failed' });
    }
});

// Verify Payment
app.get('/api/payments/verify/:orderId', requireAuth, async (req, res) => {
    try {
        const { orderId } = req.params;
        const response = await Cashfree.PGOrderFetchPayments("2023-08-01", orderId);
        
        const payments = response.data;
        const successPayment = payments.find(p => p.payment_status === 'SUCCESS');

        if (successPayment) {
            // Logic to clear user bill could go here
            return res.json({ status: 'SUCCESS', payment: successPayment });
        }

        res.json({ status: 'PENDING' });
    } catch (error) {
        console.error('Verification Error:', error.message);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend should be served from: http://localhost:${PORT}`);
});
