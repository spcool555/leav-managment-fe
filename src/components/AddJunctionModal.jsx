import React, { useState } from 'react';
import { X, Plus, MapPin, Check } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

/**
 * AddJunctionModal
 * Adds a new junction/sub-location under a parent location.
 * Props:
 *   open       – boolean
 *   onClose    – dismiss handler
 *   locationId – parent LocationList ID
 *   team       – 'field' | 'coc' | 'ccc'
 */
const AddJunctionModal = ({ open, onClose, locationId, team }) => {
  const [name, setName]       = useState('');
  const [ward, setWard]       = useState('');
  const [zone, setZone]       = useState('');
  const [saving, setSaving]   = useState(false);
  const [done, setDone]       = useState(false);

  if (!open) return null;

  const isField = team === 'field';

  const teamLabel = {
    field: '🔧 Junction',
    coc:   '🖥️ COC Location',
    ccc:   '💻 CCC Location',
  }[team] || 'Location';

  const accentColor = {
    field: 'bg-green-600',
    coc:   'bg-purple-600',
    ccc:   'bg-green-600',
  }[team] || 'bg-gray-600';

  const handleClose = () => {
    setName('');
    setWard('');
    setZone('');
    setDone(false);
    onClose();
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Please enter a location name');
      return;
    }

    setSaving(true);
    try {
      // POST to /api/admin/locations/add — adds a single entry to LocationList
      await api.post('/admin/locations/add', {
        name: trimmed,
        team,
        ward: ward.trim() || null,
        zone: zone.trim() || null,
        parent_location_id: locationId,
      });
      toast.success(`${teamLabel} added successfully`);
      setDone(true);
      // Reset after 1 second and keep modal open for more entries
      setTimeout(() => {
        setName('');
        setWard('');
        setZone('');
        setDone(false);
      }, 1200);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add location');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className={`${accentColor} rounded-t-2xl px-6 py-4 flex items-center justify-between`}>
          <div className="flex items-center space-x-3">
            <MapPin className="h-5 w-5 text-white" />
            <h2 className="text-white font-semibold text-lg">Add {teamLabel}</h2>
          </div>
          <button onClick={handleClose} className="text-white hover:text-gray-200 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Location Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {teamLabel} Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Enter ${teamLabel.toLowerCase()} name...`}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
          </div>

          {/* Ward & Zone (only for COC/CCC) */}
          {!isField && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
                <input
                  type="text"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  placeholder="e.g. Ward 5"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
                <input
                  type="text"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  placeholder="e.g. Zone North"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {/* Buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              Done
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className={`flex-1 px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center justify-center space-x-2 transition ${
                saving || !name.trim()
                  ? 'opacity-50 cursor-not-allowed bg-gray-400'
                  : done
                  ? 'bg-green-600 hover:bg-green-700'
                  : `${accentColor} hover:opacity-90`
              }`}
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : done ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Added!</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            You can add multiple entries — click &ldquo;Done&rdquo; when finished.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AddJunctionModal;
