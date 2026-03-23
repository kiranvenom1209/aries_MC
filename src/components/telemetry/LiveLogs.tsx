import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

interface LogEntry {
  id: number;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SYS';
  message: string;
}

interface LiveLogsProps {
  maxEntries?: number;
  scrollable?: boolean;
}

const MOCK_MESSAGES = [
  "[IMU] Calibrating gyros... OK",
  "[CAN] Node FL response: 11ms",
  "[CAN] Node FR response: 12ms",
  "[SYS] Establishing link to ODrive FL... OK",
  "[NAV] Updating waypoint sequence...",
  "[CAM] Hazard camera stream synchronized",
  "[PWR] Auxiliary power stable",
  "[THERM] Core temperature nominal",
];

const LiveLogs: React.FC<LiveLogsProps> = ({ maxEntries, scrollable = true }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let idCounter = 0;
    
    // Add initial boot log
    const addLog = (msg: string, level: LogEntry['level'] = 'SYS') => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
      
      setLogs(prev => {
        const newLogs = [...prev, { id: idCounter++, timestamp: timeStr, level, message: msg }];
        return newLogs.slice(-50); // Keep last 50 logs
      });
    };

    addLog("SYSTEM BOOT SEQUENCE INITIATED", "SYS");
    
    // Random log interval
    const interval = setInterval(() => {
      if (Math.random() > 0.4) { // Only add logs ~60% of the time to look more realistic
        const msg = MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)];
        const isWarn = Math.random() > 0.9;
        const isError = Math.random() > 0.98;
        addLog(msg, isError ? 'ERROR' : isWarn ? 'WARN' : 'INFO');
      }
    }, 800);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollable && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, scrollable]);

  const visibleLogs = maxEntries ? logs.slice(-maxEntries) : logs;

  return (
    <div className="glass-panel rounded-xl flex flex-col h-full relative glow-border">
      {/* sim-panel like header */}
      <div className="px-5 py-3 border-b border-border-color/30 shadow-sm flex justify-between items-center bg-black/40 shrink-0">
        <div className="flex items-center gap-2">
            <Terminal size={14} className="text-primary-color" />
            <span className="text-[11px] uppercase text-primary-color font-bold tracking-[0.15em]">
            System Terminal / Live Logs
            </span>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.8)]"></div>
            <span className="text-[9px] font-mono text-green-500 uppercase tracking-widest hidden sm:inline">Logging Active</span>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className={`flex-1 p-4 bg-black/60 font-mono text-[10px] sm:text-xs ${scrollable ? 'overflow-y-auto' : 'overflow-hidden'}`}
      >
        {visibleLogs.map((log) => (
          <div key={log.id} className="flex gap-3 mb-1 border-l-2 border-white/10 pl-2 hover:bg-white/5 data-row">
            <span className="text-white/40 shrink-0">[{log.timestamp}]</span>
            <span className={`shrink-0 w-10 
              ${log.level === 'ERROR' ? 'text-red-500 font-bold' : 
                log.level === 'WARN' ? 'text-orange-400' : 
                log.level === 'SYS' ? 'text-primary-color font-bold' : 
                'text-blue-400'}`}
            >
              {log.level}
            </span>
            <span className={`break-words ${log.level === 'ERROR' ? 'text-red-400' : 'text-gray-300'}`}>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveLogs;
