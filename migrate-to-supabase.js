require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const USERS_FILE = path.join(__dirname, "users.json");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase configuration in .env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    try {
        console.log("Reading users.json...");
        const data = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
        
        console.log(`Found ${data.users.length} users. Migrating now...`);
        
        for (const user of data.users) {
            console.log(`Processing user: ${user.username}`);

            // To use Supabase Auth effectively, we should ideally create users there.
            // But for a quick migration into the profiles table:
            const { data: existing, error: checkError } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', user.username)
                .single();

            if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means not found
                console.error(`Error checking user ${user.username}:`, checkError.message);
                continue;
            }

            if (!existing) {
                const isValidUuid = (user.id && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(user.id));
                const insertData = {
                    username: user.username,
                    password_hash: user.passwordHash,
                    full_name: user.fullName,
                    email: user.email,
                    role: user.role || 'user',
                    bill_amount: user.billAmount || 0,
                };
                if (isValidUuid) insertData.id = user.id;

                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert([insertData]);

                if (insertError) {
                    console.error(`Failed to migrate ${user.username}:`, insertError.message);
                } else {
                    console.log(`Successfully migrated ${user.username}`);
                }
            } else {
                console.log(`User ${user.username} already exists in Supabase.`);
            }
        }

        console.log("Migration finished.");
    } catch (error) {
        console.error("Migration fatal error:", error);
    }
}

migrate();
