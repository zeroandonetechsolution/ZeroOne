require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("JSON_COLUMNS:" + JSON.stringify(Object.keys(data[0] || {})));
        console.log("JSON_DATA:" + JSON.stringify(data[0]));
    }
}

checkSchema();
