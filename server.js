require('dotenv').config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const bcrypt = require("bcryptjs");
const mongoose = require('mongoose');
const { v4: uuidv4 } = require("uuid");
const { Cashfree } = require('cashfree-pg');

const app = express();

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// MongoDB User Schema
const userSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    fullName: String,
    email: String,
    role: { type: String, default: 'user' },
    billAmount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// Cashfree Setup
Cashfree.XClientId = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = process.env.CASHFREE_ENV === 'PRODUCTION' 
    ? Cashfree.Environment.PRODUCTION 
    : Cashfree.Environment.SANDBOX;

const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

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
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(new Error("CORS policy blocked access from this origin."), false);
      }
      return callback(null, true);
    },
    credentials: true,
  }),
);
app.use(express.json());

// Session with MongoStore
app.use(
  session({
    secret: process.env.SESSION_SECRET || "zeroone-secret-key-prod-123",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sessions'
    }),
    proxy: process.env.NODE_ENV === "production",
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

app.use(express.static("public"));

// Auth Middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  next();
}

async function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  const user = await User.findOne({ id: req.session.userId });
  if (!user || user.role !== "admin") return res.status(403).json({ error: "Admin access required" });
  next();
}

// ============= AUTH ENDPOINTS =============

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username/Password required" });

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

    req.session.userId = user.id;
    req.session.role = user.role;

    const { passwordHash, ...userData } = user.toObject();
    res.json({ user: userData });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ message: "Logged out successfully" }));
});

app.get("/api/auth/session", requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.session.userId });
    if (!user) {
      req.session.destroy();
      return res.status(401).json({ error: "Session invalid" });
    }
    const { passwordHash, ...userData } = user.toObject();
    res.json({ user: userData });
  } catch (error) {
    res.status(500).json({ error: "Session check failed" });
  }
});

// ============= USER ENDPOINTS =============

app.get("/api/users/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.session.userId });
    if (!user) return res.status(404).json({ error: "User not found" });
    const { passwordHash, ...userData } = user.toObject();
    res.json(userData);
  } catch (error) {
    res.status(500).json({ error: "Failed to get user data" });
  }
});

app.get("/api/users", requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-passwordHash');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to get users" });
  }
});

app.post("/api/users", requireAdmin, async (req, res) => {
  try {
    const { username, password, fullName, email, billAmount } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Credentials required" });

    if (await User.findOne({ username })) return res.status(400).json({ error: "Username exists" });

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      id: uuidv4(),
      username,
      passwordHash,
      fullName: fullName || "",
      email: email || "",
      billAmount: parseFloat(billAmount) || 0
    });

    const { passwordHash: _, ...userData } = newUser.toObject();
    res.status(201).json({ user: userData, credentials: { username, password } });
  } catch (error) {
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.put("/api/users/:id", requireAdmin, async (req, res) => {
  try {
    const { billAmount, fullName, email } = req.body;
    const user = await User.findOneAndUpdate(
      { id: req.params.id },
      { $set: { billAmount, fullName, email, updatedAt: new Date() } },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    const { passwordHash, ...userData } = user.toObject();
    res.json(userData);
  } catch (error) {
    res.status(500).json({ error: "Update failed" });
  }
});

app.delete("/api/users/:id", requireAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.params.id });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === "admin") return res.status(403).json({ error: "Cannot delete admin" });

    await User.deleteOne({ id: req.params.id });
    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// ============= PAYMENT ENDPOINTS =============

app.post('/api/payments/create', requireAuth, async (req, res) => {
    try {
        const { amount, customerName, customerEmail, customerPhone } = req.body;
        const user = await User.findOne({ id: req.session.userId });
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
        res.status(500).json({ error: 'Payment initialization failed' });
    }
});

app.get('/api/payments/verify/:orderId', requireAuth, async (req, res) => {
    try {
        const response = await Cashfree.PGOrderFetchPayments("2023-08-01", req.params.orderId);
        const payments = response.data;
        const successPayment = payments.find(p => p.payment_status === 'SUCCESS');

        if (successPayment) return res.json({ status: 'SUCCESS', payment: successPayment });
        res.json({ status: 'PENDING' });
    } catch (error) {
        res.status(500).json({ error: 'Verification failed' });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
