/**
 * Migration Script: Add ref_id column to profiles table
 * 
 * Ref ID format: ZO + last 5 digits of mobile/username
 * Example: Mobile 9876543210 → Ref ID ZO43210
 * 
 * Run this AFTER adding the column via Supabase SQL Editor:
 *   ALTER TABLE profiles ADD COLUMN ref_id TEXT;
 * 
 * Then run: node add-ref-id-column.js
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

function generateRefId(username) {
    // Extract digits from username/mobile
    const digits = (username || '').replace(/\D/g, '');
    if (digits.length >= 5) {
        return 'ZO' + digits.slice(-5);
    }
    // Fallback: ZO + 5 random digits
    return 'ZO' + Math.floor(10000 + Math.random() * 90000);
}

async function migrate() {
    console.log("🔧 Backfilling ref_id for existing users...\n");
    
    const { data: users, error: fetchError } = await supabase
        .from('profiles')
        .select('id, username, ref_id');

    if (fetchError) {
        console.error("❌ Error fetching users:", fetchError.message);
        if (fetchError.message.includes('does not exist')) {
            console.log("\n👉 You need to add the ref_id column first!");
            console.log("   Go to Supabase Dashboard → SQL Editor → Run:");
            console.log("\n   ALTER TABLE profiles ADD COLUMN ref_id TEXT;\n");
        }
        return;
    }

    if (!users || users.length === 0) {
        console.log("ℹ️  No users found in the database.");
        return;
    }

    let updated = 0;
    let skipped = 0;

    for (const user of users) {
        if (user.ref_id) {
            console.log(`  ⏭️  ${user.username} → already has ref_id: ${user.ref_id}`);
            skipped++;
            continue;
        }

        const newRefId = generateRefId(user.username);

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ ref_id: newRefId })
            .eq('id', user.id);

        if (updateError) {
            console.error(`  ❌ Failed to update ${user.username}:`, updateError.message);
        } else {
            console.log(`  ✅ ${user.username} → ${newRefId}`);
            updated++;
        }
    }

    console.log(`\n🎉 Migration complete! Updated: ${updated}, Skipped: ${skipped}`);
}

migrate();
