import React, { useState } from 'react';
import { ScrollText, ChevronDown, ChevronUp, CheckCircle, XCircle, Info } from 'lucide-react';
import { LogEntry } from '../types';

interface Props {
  logs: LogEntry[];
}

export const ActivityLog: React.FC<Props> = ({ logs }) => {
  const [expanded, setExpanded] = useState(true);

  const getIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={14} className="text-green-400 shrink-0" />;
      case 'error':
        return <XCircle size={14} className="text-red-400 shrink-0" />;
      default:
        return <Info size={14} className="text-blue-400 shrink-0" />;
    }
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-700/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ScrollText size={18} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-white">Activity Log</h3>
          <span className="text-xs text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded-full">
            {logs.length}
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-gray-400" />
        ) : (
          <ChevronDown size={16} className="text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-700/50 max-h-[300px] overflow-y-auto">
          {logs.length > 0 ? (
            <div className="divide-y divide-gray-800/50">
              {logs.map(log => (
                <div key={log.id} className="px-4 py-2.5 flex items-start gap-2 text-xs hover:bg-gray-700/10">
                  {getIcon(log.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-300">[{log.action}]</span>
                      <span className="text-gray-500">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-400 mt-0.5 break-all">{log.details}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500 text-sm">
              No activity yet. Connect to HestiaCP or Cloudflare to get started.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
