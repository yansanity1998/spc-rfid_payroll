import { useState } from "react";
import supabase from "../../utils/supabase";
import toast, { Toaster } from "react-hot-toast";
import { spclogo } from "../../utils";

const Scanner = () => {
  const [scannedCard, setScannedCard] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleScan = async (cardId: string) => {
    setLoading(true);
    setMessage("");

    try {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      // 🔍 Step 1: Find user with this cardId in users table
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, name") // only fetch what you need
        .eq("id", cardId)   // if RFID = users.id
        .maybeSingle();

      if (userError) throw userError;
      if (!user) {
        toast.error(`❌ No user found for card ${cardId}`);
        return;
      }

      // 🔍 Step 2: Check if user already has attendance today
      const { data: existing, error: fetchError } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", user.id)
        .eq("att_date", today)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!existing) {
        // ✅ First scan → Time In
        const { error: insertError } = await supabase.from("attendance").insert([
          {
            user_id: user.id,
            att_date: today,
            time_in: new Date().toISOString(),
            status: true,
          },
        ]);

        if (insertError) throw insertError;
        toast.success(`✅ Time In recorded for ${user.name ?? user.id}`);
      } else if (!existing.time_out) {
        // ✅ Second scan → Time Out
        const { error: updateError } = await supabase
          .from("attendance")
          .update({
            time_out: new Date().toISOString(),
            status: false,
          })
          .eq("id", existing.id);

        if (updateError) throw updateError;
        toast.success(`✅ Time Out recorded for ${user.name ?? user.id}`);
      } else {
        // ⚠️ Already completed both time_in and time_out
        toast.loading(`⚠️ ${user.name ?? user.id} already completed attendance today.`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("❌ Error recording attendance");
    } finally {
      setLoading(false);
      setScannedCard(""); // clear input for next scan
    }
  };

  return (
    <div className="flex flex-col items-center w-full justify-center h-screen bg-gray-50">
      <Toaster position="bottom-left" reverseOrder={false} />
      <div className="bg-red-950 absolute top-0 w-full shadow-xl/20 h-2 sm:h-3"></div>

      <img
        src={spclogo}
        alt=""
        className="h-16 sm:h-24 md:h-32 lg:h-40 absolute top-5 sm:top-10 left-5 sm:left-10"
      />
      <h1 className="text-2xl font-bold mb-4">RFID Attendance Scanner</h1>

      <input
        autoFocus
        type="text"
        value={scannedCard}
        onChange={(e) => setScannedCard(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && scannedCard.trim() !== "") {
            handleScan(scannedCard.trim());
          }
        }}
        className="opacity-0 absolute -left-96"
      />

      <p className="text-gray-600">Please tap an RFID card...</p>

      {loading && <p className="text-blue-600 mt-3">⏳ Processing...</p>}
      {message && <p className="mt-3 font-semibold">{message}</p>}
    </div>
  );
};

export default Scanner;
