import { useState } from "react";
import supabase from "../../utils/supabase";

const GuardScanner = () => {
  const [scannedCard, setScannedCard] = useState("");
  const [warningmessage, setWarMessage] = useState("");
  const [acceptMessage, setAccMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const showTempMessage = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    msg: string,
    duration = 2000
  ) => {
    setter(msg);
    setTimeout(() => setter(""), duration);
  };

  const handleScan = async (cardId: string) => {
    setLoading(true);
    setAccMessage("");

    try {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      // 1. Check if user exists
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, name, role")
        .eq("id", cardId)
        .single();

      if (userError || !user) {
        showTempMessage(setErrorMessage, "Error recording attendance");
        setLoading(false);
        return;
      }

      // 2. Check if user has attendance record for today
      const { data: existing, error: fetchError } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", cardId)
        .eq("att_date", today)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!existing) {
        // First scan (Time In)
        const { error: insertError } = await supabase
          .from("attendance")
          .insert([
            {
              user_id: cardId,
              att_date: today,
              time_in: new Date().toISOString(),
              attendance: true,
            },
          ]);

        if (insertError) throw insertError;

        showTempMessage(
          setAccMessage,
          `Time In recorded for ${user.name} (${user.role})`
        );
      } else if (!existing.time_out) {
        // Second scan (Time Out)
        const { error: updateError } = await supabase
          .from("attendance")
          .update({
            time_out: new Date().toISOString(),
            attendance: false,
          })
          .eq("id", existing.id);

        if (updateError) throw updateError;

        showTempMessage(
          setAccMessage,
          `Time Out recorded for ${user.name} (${user.role})`
        );
      } else {
        showTempMessage(
          setWarMessage,
          `${user.name} already logged out today.`
        );
      }
    } catch (err: any) {
      console.error(err);
      showTempMessage(setErrorMessage, "Error recording attendance");
    } finally {
      setLoading(false);
      setScannedCard("");
    }
  };

  return (
    <div className="flex flex-col items-center relative w-full justify-center h-screen bg-gray-50">
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

      {loading && (
        <p className="absolute bottom-50 text-blue-600 mt-3">
          ⏳ Processing...
        </p>
      )}
      {acceptMessage && (
        <div className="absolute flex items-center justify-center px-10 py-10 gap-10 bottom-10 bg-green-500 rounded">
          <svg
            width="64px"
            height="64px"
            viewBox="0 0 16 16"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
          >
            <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
            <g
              id="SVGRepo_tracerCarrier"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></g>
            <g id="SVGRepo_iconCarrier">
              <path
                fill="#021800ff"
                fill-rule="evenodd"
                d="M8 0a8 8 0 100 16A8 8 0 008 0zm2.72 5.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-2-2a.75.75 0 011.06-1.06l1.47 1.47 3.97-3.97z"
                clip-rule="evenodd"
              ></path>
            </g>
          </svg>
          <p className="mt-3 font-semibold text-white text-center">
            {acceptMessage}
          </p>
        </div>
      )}
      {warningmessage && (
        <div className="absolute flex items-center justify-center px-10 py-10 gap-10 bottom-10 bg-yellow-500 rounded">
          <svg
            height="50"
            viewBox="0 0 64 64"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            aria-hidden="true"
            role="img"
            className="iconify iconify--emojione"
            preserveAspectRatio="xMidYMid meet"
            fill="#000000"
            stroke="#000000"
            stroke-width="1.152"
          >
            <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
            <g
              id="SVGRepo_tracerCarrier"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></g>
            <g id="SVGRepo_iconCarrier">
              {" "}
              <path
                d="M5.9 62c-3.3 0-4.8-2.4-3.3-5.3L29.3 4.2c1.5-2.9 3.9-2.9 5.4 0l26.7 52.5c1.5 2.9 0 5.3-3.3 5.3H5.9z"
                fill="#ffce31"
              >
                {" "}
              </path>{" "}
              <g fill="#231f20">
                {" "}
                <path d="M27.8 23.6l2.8 18.5c.3 1.8 2.6 1.8 2.9 0l2.7-18.5c.5-7.2-8.9-7.2-8.4 0">
                  {" "}
                </path>{" "}
                <circle cx="32" cy="49.6" r="4.2">
                  {" "}
                </circle>{" "}
              </g>{" "}
            </g>
          </svg>
          <p className="mt-3 font-semibold text-black text-center">
            {warningmessage}
          </p>
        </div>
      )}
      {errorMessage && (
        <div className="absolute flex items-center justify-center px-10 py-10 gap-10 bottom-10 bg-red-500 rounded">
          <svg
            viewBox="0 0 24 24"
            height="50"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            stroke="#000000"
          >
            <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
            <g
              id="SVGRepo_tracerCarrier"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></g>
            <g id="SVGRepo_iconCarrier">
              {" "}
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="#ffffffff"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              ></circle>{" "}
              <path
                d="M5 19L19 5"
                stroke="#ffffffff"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              ></path>{" "}
            </g>
          </svg>{" "}
          <p className="mt-3 font-semibold text-white text-center">
            {errorMessage}
          </p>
        </div>
      )}
    </div>
  );
};

export default GuardScanner;
