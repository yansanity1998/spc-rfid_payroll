import { useState } from "react";
import supabase from "../../utils/supabase";

const GuardScanner = () => {
  const [scannedCard, setScannedCard] = useState("");
  const [warningmessage, setWarMessage] = useState("");
  const [acceptMessage, setAccMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastScannedUser, setLastScannedUser] = useState<any>(null);

  const showTempMessage = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    msg: string,
    duration = 3000
  ) => {
    setter(msg);
    setTimeout(() => setter(""), duration);
  };

  const handleScan = async (cardId: string) => {
    setLoading(true);
    setAccMessage("");
    setWarMessage("");
    setErrorMessage("");

    try {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      // 1. Check if user exists
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, name, role")
        .eq("id", cardId)
        .single();

      if (userError || !user) {
        showTempMessage(setErrorMessage, "User not found. Please contact administrator.");
        setLoading(false);
        return;
      }

      setLastScannedUser(user);

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
          `${user.name} already completed attendance for today.`
        );
      }
    } catch (err: any) {
      console.error(err);
      showTempMessage(setErrorMessage, "Error recording attendance. Please try again.");
    } finally {
      setLoading(false);
      setScannedCard("");
    }
  };

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
      <main className="flex flex-col w-full max-w-4xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl min-h-[90vh]">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">RFID Attendance Scanner</h1>
              <p className="text-gray-600">Tap your RFID card to record attendance</p>
            </div>
          </div>
        </div>

        {/* Scanner Interface */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          {/* Hidden Input for RFID */}
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
            placeholder="RFID Scanner Input"
          />

          {/* Scanner Visual */}
          <div className="relative mb-8">
            <div className="w-64 h-64 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center shadow-2xl">
              <div className="w-48 h-48 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                <div className="w-32 h-32 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h4" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Scanning Animation */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-72 h-72 border-4 border-teal-300 border-t-teal-600 rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* Status Text */}
          <div className="text-center mb-8">
            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xl font-semibold text-teal-600">Processing...</p>
              </div>
            ) : (
              <div>
                <p className="text-xl font-semibold text-gray-700 mb-2">Ready to Scan</p>
                <p className="text-gray-500">Please tap your RFID card on the scanner</p>
              </div>
            )}
          </div>

          {/* Last Scanned User Info */}
          {lastScannedUser && !loading && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 max-w-md w-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {lastScannedUser.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{lastScannedUser.name}</p>
                  <p className="text-sm text-gray-500">{lastScannedUser.role}</p>
                </div>
              </div>
            </div>
          )}

          {/* Back to Dashboard Button */}
          <a
            href="/Guard/dashboard"
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </a>
        </div>

        {/* Success Message */}
        {acceptMessage && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Success!</h3>
                <p className="text-green-600 font-medium">{acceptMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Warning Message */}
        {warningmessage && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Notice</h3>
                <p className="text-yellow-600 font-medium">{warningmessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Error</h3>
                <p className="text-red-600 font-medium">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default GuardScanner;
