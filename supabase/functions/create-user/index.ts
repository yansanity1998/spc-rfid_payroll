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
    const requestBody = await req.json();
    console.log("Received request body:", requestBody);
    
    const { 
      rfid_id, 
      name, 
      email, 
      role, 
      department, 
      hiredDate, 
      semester, 
      schoolYear,
      positions,
      status,
      password
    } = requestBody;

    if (!rfid_id || !name || !email || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("=== EDGE FUNCTION DEBUG ===");
    console.log("All received fields:");
    console.log("- rfid_id:", rfid_id);
    console.log("- name:", name);
    console.log("- email:", email);
    console.log("- role:", role);
    console.log("- department:", department);
    console.log("- hiredDate:", hiredDate);
    console.log("- semester:", semester);
    console.log("- schoolYear:", schoolYear);

    // Create auth user (id will be UUID)
    const { data: user, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password: password || "ChangePassword",
        email_confirm: true,
      });

    if (createError) throw createError;

    // Enhanced data processing to preserve user input values
    const processField = (value, type = 'string') => {
      console.log(`Processing field: "${value}" (${typeof value}) as ${type}`);
      
      // Handle null/undefined - only return null if truly null/undefined
      if (value === null || value === undefined) {
        console.log("Field is null/undefined, returning null");
        return null;
      }
      
      // Handle number conversion
      if (type === 'number') {
        if (typeof value === 'number' && value > 0) {
          console.log(`Valid number: ${value}`);
          return value;
        }
        if (typeof value === 'string' && value.trim() !== '') {
          const num = parseInt(value.trim());
          if (!isNaN(num) && num > 0) {
            console.log(`Number conversion: "${value}" -> ${num}`);
            return num;
          }
        }
        console.log(`Invalid/empty number field: "${value}", returning null`);
        return null;
      }
      
      // Handle string processing - preserve all non-empty values
      if (type === 'string') {
        if (typeof value === 'string') {
          const trimmed = value.trim();
          console.log(`String processing: "${value}" -> "${trimmed}"`);
          // Return the trimmed value if it's not empty, otherwise null
          return trimmed !== '' ? trimmed : null;
        } else if (value !== null && value !== undefined) {
          const converted = String(value).trim();
          console.log(`String conversion: ${value} -> "${converted}"`);
          return converted !== '' ? converted : null;
        }
        console.log(`Empty string value, returning null`);
        return null;
      }
      
      console.log(`Returning as-is: ${value}`);
      return value;
    };

    // Insert user into "users" table with remaining fields
    const insertData = {
      auth_id: user.user.id,                    // auth UUID
      // Do NOT overwrite primary key `id` with RFID. Store RFID in dedicated column.
      rfid_id: processField(rfid_id, 'number'),
      name: processField(name),
      email: processField(email),
      role: processField(role),
      department: processField(department),
      positions: processField(positions),
      hiredDate: processField(hiredDate),
      // Accept semester and schoolYear as flexible strings to support values
      // like "Summer" or academic year strings such as "2024-2025".
      semester: processField(semester, 'string'),
      schoolYear: processField(schoolYear, 'string'),
      status: processField(status) || "Active",
    };

    console.log("=== FINAL INSERT DATA ===");
    console.log("Insert data prepared:", JSON.stringify(insertData, null, 2));
    console.log("Field by field check:");
    Object.entries(insertData).forEach(([key, value]) => {
      console.log(`- ${key}: ${value} (${typeof value})`);
    });

    const { data: insertedUser, error: insertError } = await supabase
      .from("users")
      .insert(insertData)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw insertError;
    }

    console.log("User inserted successfully:", insertedUser);

    return new Response(JSON.stringify({ 
      user: user.user,
      insertedUser: insertedUser[0],
      id: insertedUser[0]?.id,
      user_id: insertedUser[0]?.id
    }), {
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
