// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { rfid_id, name, email, role, department, hiredDate, semester, schoolYear } =
      await req.json();

    if (!rfid_id || !name || !email || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create auth user (id will be UUID)
    const { data: user, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password: "password123",
        email_confirm: true,
      });

    if (createError) throw createError;

    // Insert user into "users" table with RFID
    const { error: insertError } = await supabase.from("users").insert({
      auth_id: user.user.id,       // auth UUID
      id : rfid_id,                // RFID value
      name,
      email,
      role,
      department: department || null,
      hiredDate: hiredDate || null,
      semester: semester || null,
      schoolYear: schoolYear || null,
      status: "Active",
    });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ user: user.user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Function error:", err); 
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
