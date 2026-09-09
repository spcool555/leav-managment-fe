// Utility for continuous official shift location tracking across Web, PWA, Android, and iOS
import api from '../services/api';

let watchId = null;
let timerId = null;
let wakeLock = null;
let visibilityHandler = null;

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

export const startLocationTracking = (employeeId) => {
  if (!employeeId) return;
  stopLocationTracking();

  console.log('Starting continuous background location tracking for employee:', employeeId);

  requestWakeLock();

  const sendPing = (position) => {
    if (!position || !position.coords) return;
    const payload = {
      employee_id: employeeId,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy || null,
      speed: position.coords.speed || null,
      timestamp: new Date(position.timestamp).toISOString(),
      is_background: document.hidden || false,
    };

    api.post('/api/location/ping', payload).catch((err) => {
      console.debug('Location ping failed:', err?.message || err);
    });
  };

  // Check if native Capacitor background geolocation plugin is registered (for mobile APK/IPA)
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
    // 1. Send immediate ping on start
    navigator.geolocation.getCurrentPosition(sendPing, (err) => console.warn('GPS position error:', err), {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 15000,
    });

    // 2. Set interval ping every 2 minutes during active shift
    timerId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(sendPing, (err) => console.warn('Periodic GPS error:', err), {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 15000,
      });
    }, 2 * 60 * 1000);

    // 3. Watch position for active movement
    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          sendPing(pos);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
    } catch (e) {
      console.warn('watchPosition failed:', e);
    }

    // 4. Ping immediately when app/screen comes back into focus or wakes up
    visibilityHandler = () => {
      if (!document.hidden) {
        requestWakeLock();
        navigator.geolocation.getCurrentPosition(sendPing, () => {}, { enableHighAccuracy: true });
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
  console.log('Stopped location tracking');
};

