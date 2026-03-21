require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

const USERS_FILE = path.join(__dirname, "users.json");

// Define the User Schema (matching your current JSON structure)
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

async function migrate() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected successfully!");

        console.log("Reading users.json...");
        const data = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
        
        console.log(`Found ${data.users.length} users. Migrating now...`);
        
        for (const userData of data.users) {
            // Check if user already exists
            const existing = await User.findOne({ username: userData.username });
            if (!existing) {
                await User.create(userData);
                console.log(`Migrated user: ${userData.username}`);
            } else {
                console.log(`User already exists, skipping: ${userData.username}`);
            }
        }

        console.log("Migration complete!");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

migrate();
