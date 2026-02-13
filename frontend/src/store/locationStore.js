import { create } from 'zustand';

const useLocationStore = create((set, get) => ({
  userLocation: null,
  locationError: null,
  isLocating: false,

  // Get user's current location
  getUserLocation: () => {
    return new Promise((resolve, reject) => {
      set({ isLocating: true, locationError: null });

      if (!navigator.geolocation) {
        const error = 'Geolocation is not supported by your browser';
        set({ locationError: error, isLocating: false });
        reject(new Error(error));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          set({ userLocation: location, isLocating: false });
          resolve(location);
        },
        (error) => {
          let errorMessage = 'Unable to get your location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }
          
          set({ locationError: errorMessage, isLocating: false });
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes cache
        }
      );
    });
  },

  // Set location manually
  setLocation: (lat, lng) => {
    set({
      userLocation: { lat, lng },
      locationError: null,
    });
  },

  // Clear location
  clearLocation: () => {
    set({
      userLocation: null,
      locationError: null,
    });
  },

  // Calculate distance from user to a point
  getDistanceFrom: (lat, lng) => {
    const { userLocation } = get();
    if (!userLocation) return null;

    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat - userLocation.lat);
    const dLon = toRad(lng - userLocation.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(userLocation.lat)) *
        Math.cos(toRad(lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100; // Round to 2 decimal places
  },
}));

const toRad = (deg) => deg * (Math.PI / 180);

export default useLocationStore;
