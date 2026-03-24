const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function addColumn() {
    console.log("Adding column 'last_invoice' to 'profiles' table...");
    try {
        // We attempt to perform a select and see if it fails
        const { error } = await supabase.from('profiles').select('last_invoice').limit(1);
        if (error && error.message.includes('column "last_invoice" does not exist')) {
            console.log("Column missing. Please run this SQL in your Supabase Dashboard:");
            console.log("ALTER TABLE profiles ADD COLUMN last_invoice JSONB;");
            
            // Try to add it via a hack? No, Supabase doesn't support ALTER via regular Client API.
        } else if (error) {
            console.error("Error checking column:", error.message);
        } else {
            console.log("Column already exists! ✅");
        }
    } catch(e) {
        console.error("Fatal error:", e);
    }
}

addColumn();
