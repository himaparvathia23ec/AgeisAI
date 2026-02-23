/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Mail } from 'lucide-react';

export interface IncidentForThreats {
  id: string;
  sender: string;
  subject: string;
  severity: string;
  timestamp: string;
  risk_score: number;
  source?: string;
  sourceDetail?: string;
  category?: string;
  snippet?: string;
}

interface ThreatsProps {
  incidents: IncidentForThreats[];
  formatTimestamp: (timestamp: string) => string;
  onSelectIncident: (incident: IncidentForThreats) => void;
}

export default function Threats({ incidents, formatTimestamp, onSelectIncident }: ThreatsProps) {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">Threats</h2>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-lg font-bold">Recent Incidents</h3>
          <p className="text-sm text-slate-400 mt-1">Detected threats from your inbox</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-800/50 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Threat Source</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Severity</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {!incidents || incidents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No incidents detected yet. Run Quick Scan to analyze your emails.
                  </td>
                </tr>
              ) : (
                incidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                      {formatTimestamp(incident.timestamp ?? '')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Mail className="size-4 text-slate-400" />
                        <div>
                          <p className="font-medium">{incident.source ?? incident.subject ?? '—'}</p>
                          <p className="text-xs text-slate-500">{incident.sourceDetail ?? incident.sender ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-800 px-2 py-1 rounded text-[11px] font-bold">
                        {incident.category ?? 'Mail'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          incident.severity === 'CRITICAL'
                            ? 'bg-red-500/10 text-red-500'
                            : incident.severity === 'WARNING'
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {incident.severity ?? 'LOW'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectIncident(incident)}
                        className="text-primary hover:underline font-bold text-xs uppercase tracking-wider"
                      >
                        Investigate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
