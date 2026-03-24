/**
 * Migration Script: Add ref_id column to profiles table
 * 
 * This script:
 * 1. Adds the 'ref_id' column to the profiles table (if it doesn't exist)
 * 2. Backfills existing users who have REF-style usernames by moving them to ref_id
 * 
 * Run: node add-ref-id-column.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase configuration in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log("🔧 Step 1: Adding ref_id column to profiles table...");
    
    // Use Supabase SQL (RPC) to add the column
    const { error: sqlError } = await supabase.rpc('exec_sql', {
        query: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ref_id TEXT;`
    });

    if (sqlError) {
        // If RPC doesn't exist, tell user to run SQL manually
        console.log("⚠️  Could not run ALTER TABLE via RPC (this is normal).");
        console.log("");
        console.log("👉 Please run this SQL in your Supabase Dashboard > SQL Editor:");
        console.log("");
        console.log("   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ref_id TEXT;");
        console.log("");
        console.log("   After running the SQL, press Enter to continue with backfill...");
        
        await waitForEnter();
    } else {
        console.log("✅ Column ref_id added successfully!");
    }

    // Step 2: Backfill existing users
    console.log("\n🔧 Step 2: Backfilling existing users...");
    
    const { data: users, error: fetchError } = await supabase
        .from('profiles')
        .select('id, username, ref_id')
        .is('ref_id', null);

    if (fetchError) {
        console.error("❌ Error fetching users:", fetchError.message);
        return;
    }

    if (!users || users.length === 0) {
        console.log("ℹ️  No users need backfilling (all users already have ref_id set).");
        return;
    }

    console.log(`Found ${users.length} user(s) without ref_id. Backfilling...`);

    for (const user of users) {
        let newRefId;
        
        // If username looks like a REF ID (starts with REF), move it to ref_id
        if (user.username && user.username.startsWith('REF')) {
            newRefId = user.username;
            console.log(`  → ${user.username}: keeping as Ref ID (was already REF-style)`);
        } else {
            // Generate a new Ref ID for non-REF usernames (like admin 'jega')
            newRefId = "REF" + Math.floor(100000 + Math.random() * 900000);
            console.log(`  → ${user.username}: assigning new Ref ID → ${newRefId}`);
        }

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ ref_id: newRefId })
            .eq('id', user.id);

        if (updateError) {
            console.error(`  ❌ Failed to update ${user.username}:`, updateError.message);
        } else {
            console.log(`  ✅ Updated ${user.username}`);
        }
    }

    console.log("\n🎉 Migration complete!");
    console.log("\nSummary of changes:");
    console.log("  • ref_id column added to profiles table");
    console.log("  • Existing users backfilled with Ref IDs");
    console.log("  • Customers now login with their MOBILE NUMBER");
    console.log("  • Ref ID is auto-generated and used for invoices only");
}

function waitForEnter() {
    return new Promise((resolve) => {
        process.stdin.once('data', () => resolve());
    });
}

migrate();
