import { useEffect, useState } from "react";

interface TapRecord {
  id: string;
  userName: string;
  userRole: string;
  profilePicture: string;
  action: 'time_in' | 'time_out';
  session: 'morning' | 'afternoon';
  time: string;
  timestamp: Date;
  type: 'success' | 'error' | 'info';
}

const TapHistory = () => {
  const [tapRecords, setTapRecords] = useState<TapRecord[]>([]);

  // Load tap history from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('tapHistory');
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        // Convert timestamp strings back to Date objects
        const records = parsed.map((record: any) => ({
          ...record,
          timestamp: new Date(record.timestamp)
        }));
        setTapRecords(records);
      }
    } catch (error) {
      console.error('[TapHistory] Error loading history from localStorage:', error);
    }
  }, []);

  // Function to add new tap record
  const addTapRecord = (record: TapRecord) => {
    setTapRecords(prev => {
      const newRecords = [record, ...prev].slice(0, 10); // Keep only last 10 records
      // Save to localStorage
      try {
        localStorage.setItem('tapHistory', JSON.stringify(newRecords));
      } catch (error) {
        console.error('[TapHistory] Error saving to localStorage:', error);
      }
      return newRecords;
    });
  };

  // Expose addTapRecord function globally for Scanner to use
  useEffect(() => {
    (window as any).addTapHistory = addTapRecord;
    return () => {
      delete (window as any).addTapHistory;
    };
  }, []);

  const getActionIcon = (action: string) => {
    if (action === 'time_in') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    );
  };

  const getSessionBadge = (session: string) => {
    if (session === 'morning') {
      return (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/20 border border-orange-500/30 rounded-full">
          <svg className="w-3 h-3 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="text-[10px] font-semibold text-orange-300 uppercase">AM</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded-full">
        <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
        <span className="text-[10px] font-semibold text-blue-300 uppercase">PM</span>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-2xl border-2 border-red-500/30 rounded-2xl shadow-[0_0_60px_rgba(239,68,68,0.3)] flex flex-col overflow-hidden relative" style={{ height: 'calc(90vh)' }}>
      
      {/* Animated Border Glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20 animate-pulse rounded-2xl pointer-events-none"></div>
      
      {/* Header */}
      <div className="relative z-10 p-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-red-600 to-red-800 rounded-lg flex items-center justify-center shadow-lg">
              <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Tap History</h3>
              <p className="text-[10px] text-white/60">Recent attendance records</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] text-green-400 font-semibold uppercase">Live</span>
          </div>
        </div>
      </div>

      {/* Records List */}
      <div className="relative z-10 flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
        {tapRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-white/40 text-sm font-medium">No tap records yet</p>
            <p className="text-white/30 text-xs mt-1">Tap history will appear here</p>
          </div>
        ) : (
          tapRecords.map((record) => (
            <div
              key={record.id}
              className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-2.5 hover:border-red-500/30 transition-all duration-300 animate-slideIn"
            >
              <div className="flex items-start gap-2.5">
                {/* Profile Picture */}
                <div className="relative flex-shrink-0">
                  {record.profilePicture ? (
                    <img
                      src={record.profilePicture}
                      alt={record.userName}
                      className={`w-12 h-12 rounded-full object-cover border-2 shadow-lg ${
                        record.action === 'time_in'
                          ? 'border-green-400'
                          : 'border-red-400'
                      }`}
                    />
                  ) : (
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-lg ${
                        record.action === 'time_in'
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-400'
                          : 'bg-gradient-to-br from-red-500 to-rose-600 border-red-400'
                      }`}
                    >
                      <span className="text-lg font-bold text-white">
                        {record.userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  
                  {/* Action Badge */}
                  <div
                    className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg ${
                      record.action === 'time_in'
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                        : 'bg-gradient-to-br from-red-500 to-rose-600'
                    }`}
                  >
                    {getActionIcon(record.action)}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-white font-semibold text-sm truncate">
                      {record.userName}
                    </h4>
                    {getSessionBadge(record.session)}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      record.action === 'time_in'
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-red-500/20 text-red-300'
                    }`}>
                      {record.action === 'time_in' ? 'Time In' : 'Time Out'}
                    </span>
                    <span className="text-xs text-white/50">•</span>
                    <span className="text-xs text-white/60">{record.userRole}</span>
                  </div>

                  <div className="flex items-center gap-2 text-white/50">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-mono">{record.time}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="relative z-10 p-2.5 border-t border-white/10 bg-slate-900/50 flex-shrink-0">
        <div className="flex items-center justify-between text-[10px] text-white/50">
          <span>Showing last {tapRecords.length} records</span>
          <span className="font-mono">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(239, 68, 68, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(239, 68, 68, 0.5);
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default TapHistory;
