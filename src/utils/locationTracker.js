// Utility for continuous official shift location tracking across Web, PWA, Android, and iOS
import api from '../services/api';

let watchId = null;
let timerId = null;
let wakeLock = null;
let visibilityHandler = null;
let lastPingTime = 0;
let lastPingLat = null;
let lastPingLng = null;

// Distance calculation helper (Haversine formula in meters)
const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Request Screen Wake Lock if available on mobile browsers
const requestWakeLock = async () => {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
      });
    }
  } catch (err) {
    console.debug('Wake lock request failed / unsupported:', err);
  }
};

export const startLocationTracking = (employeeInput) => {
  if (!employeeInput) return;

  // Extract string employee ID safely (if user object or string with colon is passed)
  let cleanEmpId = typeof employeeInput === 'object' ? (employeeInput.id || employeeInput.employee_id) : employeeInput;
  if (!cleanEmpId) return;
  cleanEmpId = String(cleanEmpId).trim();
  if (cleanEmpId.includes(':')) {
    cleanEmpId = cleanEmpId.split(':')[0].trim();
  }

  stopLocationTracking();

  console.log('Starting continuous background location tracking for employee:', cleanEmpId);

  requestWakeLock();

  const sendPing = (position, force = false) => {
    if (!position || !position.coords) return;
    const lat = Number(position.coords.latitude);
    const lng = Number(position.coords.longitude);

    if (isNaN(lat) || isNaN(lng)) return;

    const now = Date.now();

    // Throttle: avoid spamming server if last ping was < 45 seconds ago and movement is < 15 meters
    if (!force && lastPingTime && (now - lastPingTime < 45000)) {
      if (lastPingLat !== null && lastPingLng !== null) {
        const dist = getDistanceMeters(lastPingLat, lastPingLng, lat, lng);
        if (dist < 15) return;
      }
    }

    lastPingTime = now;
    lastPingLat = lat;
    lastPingLng = lng;

    let isoTimestamp;
    try {
      const parsedDate = position.timestamp ? new Date(position.timestamp) : new Date();
      isoTimestamp = isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
    } catch (_) {
      isoTimestamp = new Date().toISOString();
    }

    const payload = {
      employee_id: cleanEmpId,
      latitude: lat,
      longitude: lng,
      accuracy: position.coords.accuracy ? Number(position.coords.accuracy) : null,
      speed: position.coords.speed ? Number(position.coords.speed) : null,
      timestamp: isoTimestamp,
      is_background: document.hidden || false,
    };

    api.post('/location/ping', payload).catch((err) => {
      console.debug('Location ping failed:', err?.message || err);
    });
  };

  // Native Capacitor background geolocation plugin fallback (for mobile APK/IPA)
  if (window.Capacitor && window.Capacitor.isPluginAvailable('BackgroundGeolocation')) {
    try {
      window.Capacitor.Plugins.BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: "Official Shift Tracking Active",
          backgroundTitle: "Attendance Location Tracking",
          requestPermissions: true,
          stale: false,
          distanceFilter: 10
        },
        (location, error) => {
          if (error) {
            console.warn('Native background geolocation error:', error);
            return;
          }
          if (location) {
            sendPing({ coords: location, timestamp: location.time || Date.now() });
          }
        }
      );
    } catch (e) {
      console.warn('Failed to initialize native background geolocation plugin:', e);
    }
  }

  if ('geolocation' in navigator) {
    // 1. Send immediate ping on start (forced)
    navigator.geolocation.getCurrentPosition(
      (pos) => sendPing(pos, true),
      (err) => console.warn('GPS position error:', err),
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      }
    );

    // 2. Set interval ping every 2 minutes during active shift
    timerId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => sendPing(pos),
        (err) => console.warn('Periodic GPS error:', err),
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 15000,
        }
      );
    }, 2 * 60 * 1000);

    // 3. Watch position for active movement
    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => sendPing(pos),
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
    } catch (e) {
      console.warn('watchPosition failed:', e);
    }

    // 4. Ping when app/screen comes back into focus or wakes up
    visibilityHandler = () => {
      if (!document.hidden) {
        requestWakeLock();
        navigator.geolocation.getCurrentPosition(
          (pos) => sendPing(pos, true),
          () => {},
          { enableHighAccuracy: true }
        );
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
  }
};

export const stopLocationTracking = () => {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
  if (wakeLock !== null) {
    try { wakeLock.release(); } catch (_) {}
    wakeLock = null;
  }
  if (visibilityHandler !== null) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
  lastPingTime = 0;
  lastPingLat = null;
  lastPingLng = null;
  console.log('Stopped location tracking');
};
