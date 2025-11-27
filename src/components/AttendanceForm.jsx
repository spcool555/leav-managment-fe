import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, RefreshCw, Send } from 'lucide-react';
import Webcam from 'react-webcam';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import api from '../services/api';
import toast from 'react-hot-toast';

const AttendanceForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [userMessage, setUserMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(true);

  useEffect(() => {
    fetchAttendanceStatus();
    getCurrentLocation();
  }, []);

  const fetchAttendanceStatus = async () => {
    try {
      const response = await api.get(`/attendance/status/${user.id}`);
      setAttendanceStatus(response.data);
      setIsCheckingIn(!response.data.checked_in);
    } catch (error) {
      toast.error('Failed to fetch attendance status');
    }
  };

  const getCurrentLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation(`${latitude},${longitude}`);
          console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
          console.log(`Location: ${location}`);
          setLocationLoading(false);
        },
        (error) => {
          toast.error('Failed to get location. Please enable location access.');
          setLocationLoading(false);
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser.');
      setLocationLoading(false);
    }
  };

  const capturePhoto = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setShowCamera(false);
      toast.success('Photo captured successfully!');
    } else {
      toast.error('Failed to capture photo. Please try again.');
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setShowCamera(true);
  };

  const submitAttendance = async () => {
    if (!capturedImage) {
      toast.error('Please capture a photo');
      return;
    }
    
    if (!location) {
      toast.error('Location is required. Please refresh location.');
      return;
    }

    setLoading(true);
    
    try {
      // Convert base64 image to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('employee_id', user.id);
      formData.append('location', location);
      formData.append('user_message', userMessage);
      formData.append('photo', blob, `${user.id}_${Date.now()}.jpg`);

      const endpoint = isCheckingIn ? '/attendance/check-in' : '/attendance/check-out';
      const apiResponse = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (apiResponse.data.success) {
        toast.success(apiResponse.data.message);
        navigate('/dashboard');
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to submit attendance';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header 
        title={isCheckingIn ? 'Check In' : 'Check Out'}
        showBackButton={true}
        backPath="/dashboard"
      />

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Mark Attendance</h2>
            <p className="text-gray-600">Employee ID: {user.id}</p>
            <p className="text-gray-600">Employee Name: {user.full_name}</p>
          </div>

          {/* Photo Capture Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Capture Photo
            </label>
            
            {!showCamera && !capturedImage && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Photo is required for attendance marking</p>
                <button
                  onClick={() => setShowCamera(true)}
                  className="btn-primary flex items-center space-x-2 mx-auto"
                >
                  <Camera className="h-5 w-5" />
                  <span>Open Camera</span>
                </button>
              </div>
            )}

            {showCamera && (
              <div className="space-y-4 text-center">
                <div className="relative bg-black rounded-lg overflow-hidden inline-block">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{
                      facingMode: "user",
                      width: { ideal: 640 },
                      height: { ideal: 480 }
                    }}
                    className="rounded-lg"
                    style={{ maxWidth: "400px", width: "100%" }}
                    playsInline
                  />
                  <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs flex items-center">
                    <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
                    LIVE
                  </div>
                </div>
                <div className="flex space-x-4 justify-center">
                  <button
                    onClick={capturePhoto}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Camera className="h-5 w-5" />
                    <span>Capture Photo</span>
                  </button>
                  <button
                    onClick={() => setShowCamera(false)}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            )}

            {capturedImage && (
              <div className="space-y-4 text-center">
                <div className="relative inline-block">
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="rounded-lg border-2 border-green-200"
                    style={{ maxWidth: '400px', width: '100%' }}
                  />
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center">
                    <div className="w-2 h-2 bg-white rounded-full mr-1"></div>
                    ✓ Photo Captured
                  </div>
                </div>
                <div className="flex space-x-4 justify-center">
                  <button
                    onClick={retakePhoto}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <Camera className="h-5 w-5" />
                    <span>Retake Photo</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Location Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {locationLoading ? 'Getting location...' : 
                     location ? 'Location captured' : 'Location not available'}
                  </span>
                </div>
              </div>
              <button
                onClick={getCurrentLocation}
                disabled={locationLoading}
                className="btn-secondary p-3"
              >
                <RefreshCw className={`h-5 w-5 ${locationLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className='mt-2 text-xs'>Captured Location: {location}</div>
          </div>

          {/* Message Section */}
          <div className="mb-6">
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Message (Optional)
            </label>
            <textarea
              id="message"
              rows={3}
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              className="input-field"
              placeholder="Write your message (optional)"
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={submitAttendance}
            disabled={loading || !capturedImage || !location}
            className={`w-full btn-primary py-3 text-lg font-semibold flex items-center justify-center space-x-2 ${
              loading || !capturedImage || !location ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                <span>Submit Attendance</span>
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
};

export default AttendanceForm;
