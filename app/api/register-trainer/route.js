import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const SUPABASE_URL = "https://hamzjxkedatewqbqidkm.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTAyNzM3NiwiZXhwIjoyMDg0NjAzMzc2fQ.EVWQJYfc5VS_l7OiCeO7iOET7s4m-1G4UZU64rlGh9A";

export async function POST(request) {
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { email, password, firstName, lastName } = await request.json();

    // 1. Crea utente Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName }
    });

    if (authError) throw authError;

    // 2. Crea profilo nel DB
    const { error: profileError } = await supabaseAdmin
      .from('trainers')
      .insert([{
        id: authData.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
      }]);

    if (profileError) throw profileError;

    return NextResponse.json({ message: "Trainer creato!" }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}