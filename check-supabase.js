
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConnection() {
  console.log('Checking connection to:', supabaseUrl);
  try {
    const { data, error } = await supabase.from('profiles_public').select('*').limit(1);
    if (error) {
      console.error('Supabase query error:', error.message);
      if (error.code === 'PGRST116') {
        console.log('Note: PGRST116 usually means no rows found or table empty/private, but the connection might be working.');
      }
    } else {
      console.log('Connection successful! Found', data.length, 'rows in profiles_public.');
    }
  } catch (err) {
    console.error('Unexpected error:', err.message);
  }
}

checkConnection();
