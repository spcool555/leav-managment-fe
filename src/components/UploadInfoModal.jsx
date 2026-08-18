import React from 'react';
import { X, FileSpreadsheet, Download, Info, CheckCircle } from 'lucide-react';
import api from '../services/api';

/**
 * UploadInfoModal
 * Shows the Excel column format guide for each team.
 * Props:
 *   team    – 'field' | 'coc' | 'ccc'
 *   onClose – dismiss handler
 */
const UploadInfoModal = ({ team, onClose }) => {
  const isField = team === 'field';

  const teamLabel = {
    field: '🔧 Field Team',
    coc:   '🖥️ COC Team',
    ccc:   '💻 CCC Team',
  }[team] || team;

  const accentColor = {
    field: 'bg-green-600',
    coc:   'bg-purple-600',
    ccc:   'bg-green-600',
  }[team] || 'bg-gray-600';

  const handleDownloadSample = async () => {
    try {
      const response = await api.get(`/admin/locations/sample?team=${team}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sample_${team}_locations.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download sample', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className={`${accentColor} rounded-t-2xl px-6 py-4 flex items-center justify-between`}>
          <div className="flex items-center space-x-3">
            <Info className="h-5 w-5 text-white" />
            <h2 className="text-white font-semibold text-lg">Upload Format — {teamLabel}</h2>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Please prepare your Excel file with the following columns:
          </p>

          {/* Column Table */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Column Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Required?</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Example</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-3 font-mono text-green-700 text-xs bg-green-50">Employee Name</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center space-x-1 text-green-700">
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">Required</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">Rahul Sharma</td>
                </tr>
                {!isField && (
                  <tr>
                    <td className="px-4 py-3 font-mono text-purple-700 text-xs bg-purple-50">Location Name</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center space-x-1 text-green-700">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">Required</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">Location A</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Notes */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 space-y-1">
            <p className="font-semibold">📌 Notes:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>File must be <strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong></li>
              <li>Column names are case-insensitive</li>
              <li>Duplicate location names will be skipped (not duplicated)</li>
              
            </ul>
          </div>

          {/* Download Sample */}
          <button
            onClick={handleDownloadSample}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Download Sample Excel</span>
          </button>

          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadInfoModal;
