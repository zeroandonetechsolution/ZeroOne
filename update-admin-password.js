require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const USERS_FILE = path.join(__dirname, "users.json");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase configuration.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateAdminPassword() {
  const newPassword = 'mosakutty';
  const username = 'jega';
  
  console.log(`🔐 Updating password for user '${username}'...`);
  
  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // 1. Update Supabase
    console.log("🛠️ Updating Supabase table (profiles)...");
    const { data: supabaseData, error: updateError } = await supabase
      .from('profiles')
      .update({ password_hash: passwordHash })
      .eq('username', username)
      .select();

    if (updateError) {
      console.error("❌ Supabase update error:", updateError.message);
    } else if (supabaseData && supabaseData.length > 0) {
      console.log(`✅ Supabase update successful for '${username}'.`);
    } else {
      console.log(`⚠️ User '${username}' not found in Supabase.`);
    }

    // 2. Update users.json
    console.log("📂 Updating users.json file...");
    const fileContent = await fs.readFile(USERS_FILE, 'utf8');
    const data = JSON.parse(fileContent);

    const userIndex = data.users.findIndex(u => u.username === username);
    if (userIndex !== -1) {
      data.users[userIndex].passwordHash = passwordHash;
      await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2));
      console.log(`✅ users.json update successful for '${username}'.`);
    } else {
      console.log(`⚠️ User '${username}' not found in users.json.`);
    }

    console.log(`✨ Password for '${username}' has been updated to '${newPassword}' across all storage.`);
  } catch (error) {
    console.error("❌ Fatal error during update:", error.message);
  }
}

updateAdminPassword();
