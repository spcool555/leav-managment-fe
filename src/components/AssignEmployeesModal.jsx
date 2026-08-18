import React, { useState, useEffect } from 'react';
import { X, Users, Search, Check, Save } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

/**
 * AssignEmployeesModal
 * Props:
 *   team          – 'field' | 'coc' | 'ccc'
 *   locationId    – ID of the LocationList entry
 *   currentEmployeeIds – array of already-assigned employee IDs
 *   onClose       – called when modal is dismissed
 *   onSave        – called after a successful save
 */
const AssignEmployeesModal = ({ team, locationId, currentEmployeeIds = [], onClose, onSave }) => {
  const [employees, setEmployees]     = useState([]);
  const [selected, setSelected]       = useState(new Set(currentEmployeeIds));
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);

  // Fetch all employees of this team
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/admin/employees');
        const all = Array.isArray(res.data) ? res.data : [];
        const filtered = all.filter(
          (e) => {
            if (e.is_admin) return false;
            const t = (e.team || '').toLowerCase();
            const targetTeam = (team || '').toLowerCase();
            return t === targetTeam;
          }
        );
        setEmployees(filtered);
      } catch (err) {
        toast.error('Failed to load employees');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [team]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/admin/locations/${locationId}/assign`, {
        employee_ids: [...selected],
      });
      toast.success('Employees assigned successfully');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign employees');
    } finally {
      setSaving(false);
    }
  };

  const visible = employees.filter(
    (e) =>
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.id.toLowerCase().includes(search.toLowerCase())
  );

  const teamColors = {
    field: 'bg-green-600',
    coc: 'bg-purple-600',
    ccc: 'bg-green-600',
  };
  const accentColor = teamColors[team] || 'bg-gray-600';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`${accentColor} rounded-t-2xl px-6 py-4 flex items-center justify-between`}>
          <div className="flex items-center space-x-3">
            <Users className="h-5 w-5 text-white" />
            <h2 className="text-white font-semibold text-lg">Assign Employees</h2>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {selected.size} employee{selected.size !== 1 ? 's' : ''} selected •{' '}
            {team?.toUpperCase()} team
          </p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : visible.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">
              {search ? 'No employees match your search.' : `No ${team} team employees found.`}
            </p>
          ) : (
            visible.map((emp) => {
              const checked = selected.has(emp.id);
              return (
                <button
                  key={emp.id}
                  onClick={() => toggle(emp.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                    checked
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      checked ? 'border-green-500 bg-green-500' : 'border-gray-300 bg-white'
                    }`}
                  >
                    {checked && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{emp.full_name}</p>
                    <p className="text-xs text-gray-500">{emp.id} • {emp.designation || emp.team}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{saving ? 'Saving...' : 'Save Assignment'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignEmployeesModal;
