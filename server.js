require('dotenv').config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const { createClient } = require('@supabase/supabase-js');

const app = express();

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL || 'https://bpliyipfzkmkgwehqhbw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to bridge Database (snake_case) to Frontend (camelCase)
const mapUser = (user) => {
    if (!user) return null;
    return {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        billAmount: user.bill_amount,
        createdAt: user.created_at,
        updatedAt: user.updated_at
    };
};




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

// Session with dynamic cookie security
const isProduction = process.env.NODE_ENV === "production";

app.use(
  session({
    secret: process.env.SESSION_SECRET || "zeroone-secret-key-prod-123",
    resave: false,
    saveUninitialized: false,
    proxy: isProduction,
    cookie: {
      secure: isProduction, // Set to true if using HTTPS in production
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);


app.use((req, res, next) => {
  if (req.headers.host.includes('localhost') || req.headers.host.includes('127.0.0.1')) {
    req.sessionOptions = req.sessionOptions || {};
    req.session.cookie.secure = false;
  }
  next();
});

// Auth Middleware
async function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  next();
}

async function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  
  const { data: user, error } = await supabase
    .from('profiles')
    .select('role, username')
    .eq('id', req.session.userId)
    .single();

  if (error || !user) return res.status(403).json({ error: "Access denied" });
  
  if (user.role !== "admin" && user.username !== "jega") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

// ============= AUTH ENDPOINTS =============

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username/Password required" });

    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) return res.status(401).json({ error: "Invalid credentials" });

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

    req.session.userId = user.id;
    req.session.role = user.role;

    res.json({ user: mapUser(user) });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ message: "Logged out successfully" }));
});

app.get("/api/auth/session", requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.session.userId)
      .single();

    if (error || !user) {
      req.session.destroy();
      return res.status(401).json({ error: "Session invalid" });
    }
    res.json({ user: mapUser(user) });
  } catch (error) {
    res.status(500).json({ error: "Session check failed" });
  }
});

// ============= USER ENDPOINTS =============

app.get("/api/users/me", requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.session.userId)
      .single();

    if (error || !user) return res.status(404).json({ error: "User not found" });
    res.json(mapUser(user));
  } catch (error) {
    res.status(500).json({ error: "Failed to get user data" });
  }
});

app.get("/api/users", requireAdmin, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(users.map(mapUser));
  } catch (error) {
    res.status(500).json({ error: "Failed to get users" });
  }
});

app.post("/api/users", requireAdmin, async (req, res) => {
  try {
    const { username, password, fullName, email, billAmount } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Credentials required" });

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (existing) return res.status(400).json({ error: "Username exists" });

    const passwordHash = await bcrypt.hash(password, 10);
    const { data: newUser, error } = await supabase
      .from('profiles')
      .insert([{
        username,
        password_hash: passwordHash,
        full_name: fullName || "",
        email: email || "",
        bill_amount: parseFloat(billAmount) || 0,
        role: 'user'
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ user: mapUser(newUser), credentials: { username, password } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.put("/api/users/:id", requireAdmin, async (req, res) => {
  try {
    const { billAmount, fullName, email } = req.body;
    const { data: user, error } = await supabase
      .from('profiles')
      .update({ 
        bill_amount: billAmount, 
        full_name: fullName, 
        email, 
        updated_at: new Date() 
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !user) return res.status(404).json({ error: "User not found" });
    res.json(mapUser(user));
  } catch (error) {
    res.status(500).json({ error: "Update failed" });
  }
});

app.delete("/api/users/:id", requireAdmin, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.params.id)
      .single();

    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === "admin") return res.status(403).json({ error: "Cannot delete admin" });

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// ============= PAYMENT ENDPOINTS (DISABLED) =============

app.post('/api/payments/create', requireAuth, async (req, res) => {
    res.status(501).json({ error: 'Payment gateway not integrated yet' });
});

app.get('/api/payments/verify/:orderId', requireAuth, async (req, res) => {
    res.status(501).json({ error: 'Payment gateway not integrated yet' });
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
