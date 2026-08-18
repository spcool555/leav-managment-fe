import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Camera, CheckCircle2, PlayCircle, RefreshCw, Clock, Navigation } from 'lucide-react';
import Webcam from 'react-webcam';
import api from '../services/api';
import toast from 'react-hot-toast';

// ─── Team-specific display config ───────────────────────────────────────────
const TEAM_CONFIG = {
  field: {
    panelTitle:    'Log Junction Visit',
    locationLabel: 'Junction / Site Name',
    locationPlaceholder: 'Select or type junction name...',
    datalistId:    'field-locations-datalist',
    beforeLabel:   'Before Photo',
    afterLabel:    'After Photo',
    uploadBefore:  'Upload Before Photo',
    uploadAfter:   'Upload After Photo',
    activeLabel:   'Active Work Location',
    todayLabel:    "Today's Junctions",
    emptyMsg:      'No junction visits logged yet today.',
    iconColor:     'text-green-600',
    iconBg:        'bg-green-100',
  },
  coc: {
    panelTitle:    'Log COC Location Visit',
    locationLabel: 'COC Location Name',
    locationPlaceholder: 'Select or type COC location...',
    datalistId:    'coc-locations-datalist',
    beforeLabel:   'Arrival Photo',
    afterLabel:    'Departure Photo',
    uploadBefore:  'Upload Arrival Photo',
    uploadAfter:   'Upload Departure Photo',
    activeLabel:   'Active COC Location',
    todayLabel:    "Today's COC Locations",
    emptyMsg:      'No COC location visits logged yet today.',
    iconColor:     'text-purple-600',
    iconBg:        'bg-purple-100',
  },
  ccc: {
    panelTitle:    'Log CCC Location Visit',
    locationLabel: 'CCC Location Name',
    locationPlaceholder: 'Select or type CCC location...',
    datalistId:    'ccc-locations-datalist',
    beforeLabel:   'Arrival Photo',
    afterLabel:    'Departure Photo',
    uploadBefore:  'Upload Arrival Photo',
    uploadAfter:   'Upload Departure Photo',
    activeLabel:   'Active CCC Location',
    todayLabel:    "Today's CCC Locations",
    emptyMsg:      'No CCC location visits logged yet today.',
    iconColor:     'text-green-600',
    iconBg:        'bg-green-100',
  },
};

const ALLOWED_TEAMS = ['field', 'coc', 'ccc'];

const DEFAULT_FAULT_MAPPING = {
  'Fiber': [
    'Damage',
    'Other (Add as required)'
  ],
  'Fixed Camera': [
    'Cat 6 Cable',
    'Lens',
    'Power Issue',
    'Other (Add as required)'
  ],
  'PTZ Camera': [
    'Cat 6 Cable',
    'Lens',
    'Power Issue',
    'Other (Add as required)'
  ],
  'MS Camera': [
    'Cat 6 Cable',
    'Lens',
    'Power Issue',
    'Other (Add as required)'
  ],
  'Dome Camera': [
    'Cat 6 Cable',
    'Lens',
    'Power Issue',
    'Other (Add as required)'
  ],
  'Wifi AP': [
    'Cat 6 Cable',
    'Power Issue',
    'Other (Add as required)'
  ],
  'JB': [
    'Rectifier',
    'Power Issue',
    'Other (Add as required)'
  ],
  'Kiosk': [
    'Screen Broken',
    'Power Issue',
    'Other (Add as required)'
  ],
  'VaMS': [
    'Pixel Issue',
    'Power Issue',
    'Other (Add as required)'
  ],
  'PA System': [
    'Speaker Issue',
    'Power Issue',
    'Other (Add as required)'
  ],
  'None': [
    'None'
  ]
};

const JunctionVisitPanel = ({ user, attendanceStatus }) => {
  const [team, setTeam] = useState(null);
  const [teamLoading, setTeamLoading] = useState(true);
  const [faultMapping, setFaultMapping] = useState(DEFAULT_FAULT_MAPPING);

  const [visits, setVisits] = useState([]);
  const [loadingVisits, setLoadingVisits] = useState(true);

  const [locationList, setLocationList] = useState([]);
  const [facingMode, setFacingMode] = useState('environment');

  const [locationName, setLocationName] = useState('');
  const [wardText, setWardText] = useState('');
  const [zoneText, setZoneText] = useState('');
  const [visitType, setVisitType] = useState('Regular Visit');
  const [remarkText, setRemarkText] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [selectedFault, setSelectedFault] = useState('');
  const [mode, setMode] = useState(null); // 'starting' | 'completing' | null
  const [activeVisitId, setActiveVisitId] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);



  const webcamRef = useRef(null);

  const handleLocationNameChange = (val) => {
    setLocationName(val);
    const matched = locationList.find(
      (loc) => loc.name.toLowerCase() === val.toLowerCase().trim()
    );
    if (matched) {
      setWardText(matched.ward || '');
      setZoneText(matched.zone || '');
    } else {
      setWardText('');
      setZoneText('');
    }
  };

  // Fetch employee team
  useEffect(() => {
    if (user) {
      const userTeam = (user.team || "").toLowerCase();
      setTeam(ALLOWED_TEAMS.includes(userTeam) ? userTeam : 'field');
    } else {
      setTeam('field');
    }
    setTeamLoading(false);
  }, [user]);

  const fetchTodayVisits = useCallback(async () => {
    if (!user?.id) return;
    setLoadingVisits(true);
    try {
      const res = await api.get(`/junction/today/${user.id}`);
      setVisits(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to fetch junction visits:', error);
    } finally {
      setLoadingVisits(false);
    }
  }, [user?.id]);

  // Fetch team-specific location list from new API endpoint
  useEffect(() => {
    fetchTodayVisits();

    const fetchTeam = (team && ALLOWED_TEAMS.includes(team)) ? team : 'field';

    // Fetch team-aware location list
    api.get(`/locations?team=${fetchTeam}`)
      .then(res => {
        if (Array.isArray(res.data)) setLocationList(res.data);
      })
      .catch(err => console.error('Failed to fetch locations', err));
  }, [team, fetchTodayVisits]);

  // Fetch dynamic asset-fault mapping from backend
  useEffect(() => {
    api.get('/junction/asset-faults')
      .then(res => {
        if (res.data && typeof res.data === 'object' && Object.keys(res.data).length > 0) {
          setFaultMapping(res.data);
        }
      })
      .catch(err => console.error('Failed to fetch asset-faults mapping', err));
  }, []);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const getCurrentLocation = () => {
    setLocationLoading(true);
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser.');
      setLocationLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation(`${latitude},${longitude}`);
        setLocationLoading(false);
      },
      () => {
        toast.error('Failed to get location. Please enable location access.');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const beginStart = () => {
    if (!locationName.trim()) {
      toast.error(`Enter the ${cfg.locationLabel.toLowerCase()} first`);
      return;
    }
    setMode('starting');
    setCapturedImage(null);
    setShowCamera(true);
    getCurrentLocation();
  };

  const beginComplete = (visitId) => {
    setActiveVisitId(visitId);
    const visitObj = visits.find(v => v.id === visitId);
    if (visitObj) {
      setSelectedAsset(visitObj.asset_type || '');
      setSelectedFault(visitObj.fault_type || '');
    } else {
      setSelectedAsset('');
      setSelectedFault('');
    }
    setRemarkText('');
    setMode('completing');
    setCapturedImage(null);
    setShowCamera(true);
    getCurrentLocation();
  };

  const capturePhoto = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setShowCamera(false);
      toast.success('Photo captured');
    } else {
      toast.error('Failed to capture photo, try again');
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setShowCamera(true);
  };

  const cancelFlow = () => {
    setMode(null);
    setShowCamera(false);
    setCapturedImage(null);
    setActiveVisitId(null);
    setSelectedAsset('');
    setSelectedFault('');
  };

  const submit = async () => {
    if (!capturedImage) {
      toast.error('Please capture a photo');
      return;
    }
    if (!location) {
      toast.error('Location is required. Please retry location.');
      return;
    }

    if (mode === 'completing' && !remarkText.trim()) {
      toast.error('Remark is required to complete the visit.');
      return;
    }

    if (team === 'field') {
      if (!selectedAsset) {
        toast.error('Asset Type is required');
        return;
      }
      if (!selectedFault) {
        toast.error('Fault Type is required');
        return;
      }
    }

    setSubmitting(true);
    try {
      const blobRes = await fetch(capturedImage);
      const blob = await blobRes.blob();
      const formData = new FormData();
      formData.append('location', location);
      formData.append('photo', blob, `${user.id}_${Date.now()}.jpg`);

      if (mode === 'starting') {
        formData.append('employee_id', user.id);
        formData.append('junction_name', locationName.trim());
        formData.append('visit_type', visitType);
        formData.append('ward', wardText.trim());
        formData.append('zone', zoneText.trim());
        if (team === 'field') {
          formData.append('asset_type', selectedAsset);
          formData.append('fault_type', selectedFault);
        }
        const res = await api.post('/junction/start', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success(res.data.message || `${cfg.panelTitle} started`);
        setLocationName('');
        setWardText('');
        setZoneText('');
        setVisitType('Regular Visit');
      } else if (mode === 'completing' && activeVisitId) {
        formData.append('remark', remarkText.trim());
        if (team === 'field') {
          formData.append('asset_type', selectedAsset);
          formData.append('fault_type', selectedFault);
        }
        const res = await api.post(`/junction/${activeVisitId}/complete`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success(res.data.message || 'Visit completed');
      }

      cancelFlow();
      fetchTodayVisits();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save visit');
    } finally {
      setSubmitting(false);
    }
  };

  if (teamLoading) return null;

  // Panel visible for all teams; fall back to 'field' config if team is invalid or empty

  const cfg = TEAM_CONFIG[team] || TEAM_CONFIG['field'];
  const shiftDisplay = attendanceStatus?.active_shift_type
    ? attendanceStatus.active_shift_type.toUpperCase()
    : 'No active shift';

  // Team accent colors
  const accentBtn = team === 'field'
    ? 'bg-green-600 hover:bg-green-700'
    : team === 'coc'
    ? 'bg-purple-600 hover:bg-purple-700'
    : 'bg-green-600 hover:bg-green-700';

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mt-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className={`${cfg.iconBg} rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center`}>
            <Navigation className={`h-10 w-10 ${cfg.iconColor}`} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{cfg.panelTitle}</h2>
          <p className="text-gray-600">Employee ID: <span className="font-medium">{user.id}</span></p>
          <p className="text-gray-600">Employee Name: <span className="font-medium">{user.full_name}</span></p>
          <p className="text-gray-600">Shift: <span className="font-medium">{shiftDisplay}</span></p>

          {/* Team Badge */}
          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
            team === 'field' ? 'bg-green-100 text-green-700'
            : team === 'coc' ? 'bg-purple-100 text-purple-700'
            : 'bg-green-100 text-green-700'
          }`}>
            {team.toUpperCase()} Team
          </span>
        </div>

        {/* Camera / capture flow */}
        {mode && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {mode === 'starting'
                ? `${cfg.beforeLabel} — ${locationName}`
                : `${cfg.afterLabel} (Completing Visit)`}
            </label>

            {showCamera && (
              <div className="space-y-4 text-center">
                <div className="relative bg-black rounded-lg overflow-hidden inline-block w-full max-w-[400px]">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: facingMode, width: { ideal: 640 }, height: { ideal: 480 } }}
                    className="rounded-lg w-full"
                    playsInline
                  />
                  <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs flex items-center">
                    <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
                    LIVE
                  </div>
                </div>
                <div className="flex justify-center mb-2">
                  <button onClick={toggleCamera} className="text-gray-700 flex items-center space-x-2 hover:text-primary-600 bg-gray-100 px-4 py-2 rounded-full text-sm font-medium transition-colors">
                    <RefreshCw className="h-4 w-4" />
                    <span>Switch Camera</span>
                  </button>
                </div>
                <div className="flex space-x-4 justify-center">
                  <button onClick={capturePhoto} className="btn-primary flex items-center space-x-2">
                    <Camera className="h-5 w-5" />
                    <span>Capture Photo</span>
                  </button>
                  <button onClick={cancelFlow} className="btn-secondary flex items-center space-x-2">
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            )}

            {capturedImage && (
              <div className="space-y-4 text-center">
                <div className="relative inline-block w-full max-w-[400px]">
                  <img src={capturedImage} alt="captured" className="rounded-lg border-2 border-green-200 w-full" />
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center">
                    <div className="w-2 h-2 bg-white rounded-full mr-1"></div>
                    ✓ Photo Captured
                  </div>
                </div>

                {/* Location Display */}
                <div className="text-left mt-4 mb-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">GPS Location</label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {locationLoading ? 'Getting location...' : location ? 'Location captured' : 'Location not available'}
                        </span>
                      </div>
                    </div>
                    <button onClick={getCurrentLocation} disabled={locationLoading} className="btn-secondary p-3">
                      <RefreshCw className={`h-5 w-5 ${locationLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <div className='mt-2 text-xs text-gray-500'>Captured: {location || '—'}</div>
                </div>

                <div className="flex space-x-4 justify-center">
                  <button onClick={retake} className="btn-secondary flex items-center space-x-2">
                    <Camera className="h-5 w-5" />
                    <span>Retake Photo</span>
                  </button>
                </div>

                {/* Asset and Fault Dropdowns on Complete */}
                {mode === 'completing' && team === 'field' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mt-4 mb-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Asset Type
                      </label>
                      <select
                        value={selectedAsset}
                        onChange={(e) => {
                          setSelectedAsset(e.target.value);
                          setSelectedFault('');
                        }}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="">-- Select Asset Type --</option>
                        {Object.keys(faultMapping).map((asset) => (
                          <option key={asset} value={asset}>{asset}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fault Type
                      </label>
                      <select
                        value={selectedFault}
                        disabled={!selectedAsset}
                        onChange={(e) => setSelectedFault(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">-- Select Fault Type --</option>
                        {selectedAsset && faultMapping[selectedAsset] && faultMapping[selectedAsset].map((fault) => (
                          <option key={fault} value={fault}>{fault}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Remark Input */}
                {mode === 'completing' && (
                  <div className="text-left mt-4 mb-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Remark (Mandatory)</label>
                    <textarea
                      value={remarkText}
                      onChange={(e) => setRemarkText(e.target.value)}
                      placeholder="Enter completion remarks..."
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      rows="3"
                    ></textarea>
                  </div>
                )}

                {/* Submit button */}
                <div className="mt-6">
                  <button
                    onClick={submit}
                    disabled={submitting || !location}
                    className={`w-full py-3 text-lg font-semibold text-white rounded-lg flex items-center justify-center space-x-2 transition-colors ${
                      submitting || !location
                        ? 'opacity-50 cursor-not-allowed bg-gray-400'
                        : accentBtn
                    }`}
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        <span>{mode === 'starting' ? cfg.uploadBefore : cfg.uploadAfter}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Start new visit UI */}
        {!mode && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {cfg.locationLabel}
                </label>
                <input
                  type="text"
                  list={cfg.datalistId}
                  value={locationName}
                  onChange={(e) => handleLocationNameChange(e.target.value)}
                  placeholder={cfg.locationPlaceholder}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
                <datalist id={cfg.datalistId}>
                  {locationList.map((loc) => (
                    <option key={loc.id} value={loc.name} />
                  ))}
                </datalist>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ward
                </label>
                <input
                  type="text"
                  value={wardText}
                  placeholder="Auto-populated ward..."
                  readOnly
                  className="w-full border border-gray-300 bg-gray-100 text-gray-500 rounded-lg px-4 py-3 cursor-not-allowed focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zone
                </label>
                <input
                  type="text"
                  value={zoneText}
                  placeholder="Auto-populated zone..."
                  readOnly
                  className="w-full border border-gray-300 bg-gray-100 text-gray-500 rounded-lg px-4 py-3 cursor-not-allowed focus:outline-none"
                />
              </div>
            </div>
            
            {team === 'field' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visit Type
                  </label>
                  <select
                    value={visitType}
                    onChange={(e) => setVisitType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="Regular Visit">Regular Visit</option>
                    <option value="Down Call Visit">Down Call Visit</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Asset Type
                    </label>
                    <select
                      value={selectedAsset}
                      onChange={(e) => {
                        setSelectedAsset(e.target.value);
                        setSelectedFault('');
                      }}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="">-- Select Asset Type --</option>
                      {Object.keys(faultMapping).map((asset) => (
                        <option key={asset} value={asset}>{asset}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fault Type
                    </label>
                    <select
                      value={selectedFault}
                      disabled={!selectedAsset}
                      onChange={(e) => setSelectedFault(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Select Fault Type --</option>
                      {selectedAsset && faultMapping[selectedAsset] && faultMapping[selectedAsset].map((fault) => (
                        <option key={fault} value={fault}>{fault}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={beginStart}
              className={`w-full py-3 text-lg font-semibold text-white rounded-lg flex items-center justify-center space-x-2 transition-colors ${accentBtn}`}
            >
              <Camera className="h-5 w-5" />
              <span>{cfg.uploadBefore}</span>
            </button>
          </div>
        )}

        {/* Today's visits list */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-4">{cfg.todayLabel}</h4>
          {loadingVisits ? (
            <p className="text-sm text-gray-500 text-center py-4">Loading...</p>
          ) : visits.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-sm text-gray-500">{cfg.emptyMsg}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visits.map((v) => {
                const startedAtDate = v.started_at ? new Date(v.started_at) : null;
                const now = new Date();
                const diffDays = startedAtDate ? (now - startedAtDate) / (1000 * 60 * 60 * 24) : 0;
                
                let isOverdue = false;
                if (v.status === 'in_progress') {
                   if (v.visit_type === 'Regular Visit' && diffDays > 1) isOverdue = true;
                   if (v.visit_type === 'Down Call Visit' && diffDays > 10) isOverdue = true;
                }

                return (
                  <div key={v.id} className={`border rounded-lg px-4 py-3 flex flex-col gap-3 ${isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className={`font-bold ${isOverdue ? 'text-red-700' : 'text-gray-900'}`}>
                          {v.junction_name} 
                          {v.visit_type && <span className="text-xs font-normal ml-2 bg-white px-2 py-0.5 rounded shadow-sm text-gray-600">{v.visit_type}</span>}
                        </div>
                        <div className={`text-xs mt-1 ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                          Start: {v.started_at ? new Date(v.started_at).toLocaleString() : '—'}
                          {v.completed_at ? ` • End: ${new Date(v.completed_at).toLocaleString()}` : ''}
                        </div>
                        {(v.ward || v.zone) && (
                          <div className="text-xs text-gray-500 mt-1">
                            {v.ward && <span>Ward: <span className="font-semibold text-gray-700">{v.ward}</span></span>}
                            {v.ward && v.zone && <span className="mx-1.5">•</span>}
                            {v.zone && <span>Zone: <span className="font-semibold text-gray-700">{v.zone}</span></span>}
                          </div>
                        )}
                        {(v.asset_type || v.fault_type) && (
                          <div className="text-xs text-gray-600 mt-1 bg-white p-2 rounded border border-gray-100">
                            {v.asset_type && <span>Asset: <span className="font-semibold text-gray-800">{v.asset_type}</span></span>}
                            {v.asset_type && v.fault_type && <span className="mx-1.5">•</span>}
                            {v.fault_type && <span>Fault: <span className="font-semibold text-red-600">{v.fault_type}</span></span>}
                          </div>
                        )}
                        {isOverdue && <div className="text-xs text-red-600 mt-1 font-bold">⚠️ OVERDUE - Not completed!</div>}
                        {v.remark && <div className="text-xs text-gray-700 mt-2 italic bg-white p-2 rounded">Remark: {v.remark}</div>}
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          v.status === 'completed' ? 'bg-green-100 text-green-700' : 
                          v.status === 'unresolved' ? 'bg-orange-100 text-orange-700' : 
                          isOverdue ? 'bg-red-200 text-red-800' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {v.status === 'completed' ? 'Completed' : v.status === 'unresolved' ? 'Unresolved' : 'Open'}
                        </span>
                        
                        {!mode && v.status === 'in_progress' && (
                          <button
                            onClick={() => beginComplete(v.id)}
                            className="bg-primary-600 hover:bg-primary-700 text-white text-xs px-3 py-1.5 rounded-md flex items-center space-x-1 transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Complete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>


      </div>
    </div>
  );
};

export default JunctionVisitPanel;
