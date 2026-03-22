require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase configuration in .env. Check SUPABASE_URL and SUPABASE_ANON_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log("🔍 Testing connection to Supabase...");
  
  try {
    // Try to count rows in the profiles table
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error("❌ Connection error:", error.message);
      if (error.message.includes("does not exist")) {
        console.log("💡 Tip: Make sure you have created the 'profiles' table in your Supabase dashboard.");
      }
    } else {
      console.log("✅ Successfully connected to Supabase!");
      console.log(`📊 Found ${count} users in the 'profiles' table.`);
    }
  } catch (err) {
    console.error("❌ Fatal error:", err.message);
  }
}

testConnection();
