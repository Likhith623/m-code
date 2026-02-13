import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Navigation,
  Phone,
  Clock,
  Star,
  ChevronRight,
  X,
  Loader2,
  Route,
  IndianRupee,
  Package,
  ExternalLink,
  Locate,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Load Google Maps Script
const loadGoogleMapsScript = () => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve(window.google);
      return;
    }

    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;

    window.initGoogleMaps = () => {
      resolve(window.google);
    };

    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const MedicineMap = ({ 
  stores = [], 
  selectedMedicine = null, 
  userLocation = null,
  onStoreSelect = () => {},
  selectedStoreId = null,
  isVisible = true 
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [showDirections, setShowDirections] = useState(false);
  const [travelInfo, setTravelInfo] = useState(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Normalize userLocation to always use lat/lng format
  const normalizedUserLocation = userLocation ? {
    lat: userLocation.lat ?? userLocation.latitude,
    lng: userLocation.lng ?? userLocation.longitude
  } : null;

  // Helper to normalize store properties (handle both naming conventions)
  const getStoreProps = (store) => ({
    id: store.id,
    name: store.name || store.store_name || 'Unknown Store',
    address: store.address || 'Address not available',
    fullAddress: store.fullAddress || store.address,
    phone: store.phone || '',
    email: store.email || '',
    rating: parseFloat(store.rating) || 4.0,
    totalReviews: store.totalReviews || store.total_reviews || 0,
    isOpen: store.isOpen ?? store.is_open ?? true,
    openingHours: store.openingHours || store.opening_hours || '9:00 AM - 9:00 PM',
    latitude: parseFloat(store.latitude) || 0,
    longitude: parseFloat(store.longitude) || 0,
    distance: store.distance || store.distance_km,
    medicine: store.medicine,
    storeImageUrl: store.storeImageUrl || store.store_image_url,
  });

  // Initialize map
  useEffect(() => {
    if (!isVisible) return;

    const initMap = async () => {
      try {
        await loadGoogleMapsScript();
        
        if (!mapRef.current || mapInstanceRef.current) return;

        const defaultCenter = normalizedUserLocation 
          ? { lat: normalizedUserLocation.lat, lng: normalizedUserLocation.lng }
          : { lat: 19.0760, lng: 72.8777 }; // Mumbai default

        const map = new window.google.maps.Map(mapRef.current, {
          center: defaultCenter,
          zoom: 14,
          styles: mapStyles,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        mapInstanceRef.current = map;

        // Add user location marker
        if (normalizedUserLocation) {
          addUserMarker(map, normalizedUserLocation);
        }

        // Initialize directions renderer
        directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
          map,
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: '#8B5CF6',
            strokeWeight: 5,
            strokeOpacity: 0.8,
          },
        });

        setIsLoaded(true);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    initMap();

    return () => {
      // Cleanup markers
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };
  }, [isVisible, normalizedUserLocation]);

  // Add user location marker
  const addUserMarker = (map, location) => {
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    userMarkerRef.current = new window.google.maps.Marker({
      position: { lat: location.lat, lng: location.lng },
      map,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#3B82F6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
      title: 'Your Location',
      zIndex: 1000,
    });

    // Add pulse animation div
    const pulseDiv = document.createElement('div');
    pulseDiv.className = 'user-pulse-marker';
  };

  // Add store markers
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();

    stores.forEach((store, index) => {
      const storeProps = getStoreProps(store);
      const position = { lat: storeProps.latitude, lng: storeProps.longitude };
      const isNearest = index === 0; // First store is nearest (already sorted by distance)

      // Custom marker with animation - crown for nearest
      const marker = new window.google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        icon: {
          url: createCustomMarkerSVG(storeProps.isOpen, index + 1, isNearest),
          scaledSize: isNearest ? new window.google.maps.Size(65, 90) : new window.google.maps.Size(50, 60),
          anchor: isNearest ? new window.google.maps.Point(32, 90) : new window.google.maps.Point(25, 60),
        },
        animation: window.google.maps.Animation.DROP,
        title: isNearest ? `👑 NEAREST: ${storeProps.name}` : storeProps.name,
        zIndex: isNearest ? 1000 : 100 - index, // Nearest on top
      });

      marker.addListener('click', () => {
        handleStoreClick(store);
      });

      // Bounce animation on hover
      marker.addListener('mouseover', () => {
        marker.setAnimation(window.google.maps.Animation.BOUNCE);
        setTimeout(() => marker.setAnimation(null), 750);
      });

      markersRef.current.push(marker);
      bounds.extend(position);
    });

    // Include user location in bounds
    if (normalizedUserLocation) {
      bounds.extend({ lat: normalizedUserLocation.lat, lng: normalizedUserLocation.lng });
    }

    // Fit map to bounds
    if (stores.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, { padding: 50 });
    }
  }, [stores, isLoaded, normalizedUserLocation]);

  // Create custom marker SVG with crown for nearest store
  const createCustomMarkerSVG = (isOpen, number, isNearest = false) => {
    const color = isOpen ? '#10B981' : '#EF4444';
    const size = isNearest ? 65 : 50;
    const viewBox = isNearest ? '0 0 65 75' : '0 0 50 60';
    
    // Crown SVG for nearest store
    const crownSvg = isNearest ? `
      <g transform="translate(12, -5)">
        <polygon points="20,0 25,12 40,12 28,20 32,32 20,24 8,32 12,20 0,12 15,12" fill="#FFD700" stroke="#FFA500" stroke-width="1"/>
        <text x="20" y="22" text-anchor="middle" font-size="8" font-weight="bold" fill="#7C2D12">★</text>
      </g>
    ` : '';
    
    const markerY = isNearest ? 30 : 0;
    
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${isNearest ? 90 : 60}" viewBox="${viewBox}">
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
          </filter>
          ${isNearest ? `<filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>` : ''}
        </defs>
        ${crownSvg}
        <g transform="translate(${isNearest ? 7.5 : 0}, ${markerY})">
          <path d="M25 0C11.2 0 0 11.2 0 25c0 17.5 25 35 25 35s25-17.5 25-35C50 11.2 38.8 0 25 0z" fill="${color}" filter="url(#${isNearest ? 'glow' : 'shadow'})"/>
          <circle cx="25" cy="23" r="15" fill="white"/>
          <text x="25" y="28" text-anchor="middle" font-size="14" font-weight="bold" fill="${color}">${number}</text>
        </g>
      </svg>
    `;
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  };

  // Handle store click
  const handleStoreClick = (store) => {
    setSelectedStore(store);
    setShowDirections(false);
    setTravelInfo(null);
    onStoreSelect(store);

    // Pan to store
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: store.latitude, lng: store.longitude });
      mapInstanceRef.current.setZoom(16);
    }
  };

  // Calculate directions
  const calculateRoute = async () => {
    if (!normalizedUserLocation || !selectedStore || !mapInstanceRef.current) return;

    setIsCalculatingRoute(true);
    const storeProps = getStoreProps(selectedStore);

    try {
      const directionsService = new window.google.maps.DirectionsService();

      const result = await directionsService.route({
        origin: { lat: normalizedUserLocation.lat, lng: normalizedUserLocation.lng },
        destination: { lat: storeProps.latitude, lng: storeProps.longitude },
        travelMode: window.google.maps.TravelMode.DRIVING,
      });

      directionsRendererRef.current.setDirections(result);
      setShowDirections(true);

      const route = result.routes[0].legs[0];
      setTravelInfo({
        distance: route.distance.text,
        duration: route.duration.text,
      });
    } catch (error) {
      console.error('Error calculating route:', error);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Clear directions
  const clearDirections = () => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({ routes: [] });
    }
    setShowDirections(false);
    setTravelInfo(null);
  };

  // Center on user location
  const centerOnUser = () => {
    if (mapInstanceRef.current && normalizedUserLocation) {
      mapInstanceRef.current.panTo({ lat: normalizedUserLocation.lat, lng: normalizedUserLocation.lng });
      mapInstanceRef.current.setZoom(15);
    }
  };

  // Zoom controls
  const zoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() + 1);
    }
  };

  const zoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() - 1);
    }
  };

  // Calculate distance between two points
  const calculateDistance = (store) => {
    if (!normalizedUserLocation || !window.google) return null;

    const from = new window.google.maps.LatLng(normalizedUserLocation.lat, normalizedUserLocation.lng);
    const to = new window.google.maps.LatLng(store.latitude, store.longitude);
    const distance = window.google.maps.geometry.spherical.computeDistanceBetween(from, to);

    if (distance < 1000) {
      return `${Math.round(distance)} m`;
    }
    return `${(distance / 1000).toFixed(1)} km`;
  };

  if (!isVisible) return null;

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden">
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Loading Overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
          <div className="text-center">
            <Loader2 size={40} className="animate-spin text-primary-500 mx-auto mb-3" />
            <p className="text-white/70">Loading map...</p>
          </div>
        </div>
      )}

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={centerOnUser}
          className="p-3 rounded-xl bg-slate-800/90 backdrop-blur-sm border border-white/10 text-white hover:bg-slate-700/90 transition-colors"
          title="Center on my location"
        >
          <Locate size={20} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={zoomIn}
          className="p-3 rounded-xl bg-slate-800/90 backdrop-blur-sm border border-white/10 text-white hover:bg-slate-700/90 transition-colors"
        >
          <ZoomIn size={20} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={zoomOut}
          className="p-3 rounded-xl bg-slate-800/90 backdrop-blur-sm border border-white/10 text-white hover:bg-slate-700/90 transition-colors"
        >
          <ZoomOut size={20} />
        </motion.button>
      </div>

      {/* Selected Medicine Badge */}
      {selectedMedicine && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-4 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500/90 to-purple-600/90 backdrop-blur-sm text-white text-sm font-medium flex items-center gap-2"
        >
          <Package size={16} />
          <span>Showing stores with "{selectedMedicine}"</span>
        </motion.div>
      )}

      {/* Store Cards List */}
      {stores.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {stores.map((store, index) => {
              const storeProps = getStoreProps(store);
              return (
              <motion.div
                key={store.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                onClick={() => handleStoreClick(store)}
                className={`flex-shrink-0 w-72 p-4 rounded-xl cursor-pointer transition-all ${
                  selectedStore?.id === store.id
                    ? 'bg-gradient-to-br from-primary-500/30 to-purple-600/30 border-2 border-primary-500'
                    : 'bg-slate-800/90 border border-white/10'
                } backdrop-blur-sm`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      storeProps.isOpen ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="font-semibold text-white text-sm truncate max-w-[150px]">
                        {storeProps.name}
                      </h4>
                      <div className="flex items-center gap-1 text-xs text-white/60">
                        <Star size={12} className="text-yellow-400 fill-yellow-400" />
                        <span>{storeProps.rating?.toFixed(1) || 'N/A'}</span>
                        {storeProps.totalReviews > 0 && (
                          <span className="text-white/40">({storeProps.totalReviews})</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    storeProps.isOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {storeProps.isOpen ? 'Open' : 'Closed'}
                  </span>
                </div>
                
                <p className="text-xs text-white/50 truncate mb-2">
                  <MapPin size={12} className="inline mr-1" />
                  {storeProps.address}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-primary-400">
                    <Navigation size={12} className="inline mr-1" />
                    {storeProps.distance ? `${storeProps.distance} km` : 'N/A'}
                  </span>
                  <ChevronRight size={16} className="text-white/50" />
                </div>
              </motion.div>
            );})}
          </div>
        </div>
      )}

      {/* Selected Store Detail Panel */}
      <AnimatePresence>
        {selectedStore && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', damping: 25 }}
            className="absolute top-4 right-20 w-80 bg-slate-800/95 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
          >
            {/* Store Header */}
            <div className="p-4 bg-gradient-to-r from-primary-500/20 to-purple-600/20 border-b border-white/10">
              {(() => {
                const storeProps = getStoreProps(selectedStore);
                return (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    storeProps.isOpen ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    <MapPin size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{storeProps.name}</h3>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={storeProps.isOpen ? 'text-green-400' : 'text-red-400'}>
                        {storeProps.isOpen ? '● Open Now' : '● Closed'}
                      </span>
                      {storeProps.rating && (
                        <>
                          <span className="text-white/30">•</span>
                          <span className="text-yellow-400 flex items-center gap-1">
                            <Star size={12} className="fill-yellow-400" />
                            {storeProps.rating.toFixed(1)}
                            {storeProps.totalReviews > 0 && (
                              <span className="text-white/40">({storeProps.totalReviews})</span>
                            )}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setSelectedStore(null);
                    clearDirections();
                  }}
                  className="p-2 rounded-full hover:bg-white/10"
                >
                  <X size={18} className="text-white/70" />
                </motion.button>
              </div>
              );})()}
            </div>

            {/* Store Details */}
            <div className="p-4 space-y-3">
              {(() => {
                const storeProps = getStoreProps(selectedStore);
                return (
              <>
              <div className="flex items-start gap-3 text-sm">
                <MapPin size={16} className="text-primary-400 mt-0.5 flex-shrink-0" />
                <span className="text-white/70">{storeProps.fullAddress || storeProps.address}</span>
              </div>

              {storeProps.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone size={16} className="text-primary-400 flex-shrink-0" />
                  <a href={`tel:${storeProps.phone}`} className="text-white/70 hover:text-primary-400">
                    {storeProps.phone}
                  </a>
                </div>
              )}

              {storeProps.openingHours && (
                <div className="flex items-center gap-3 text-sm">
                  <Clock size={16} className="text-primary-400 flex-shrink-0" />
                  <span className="text-white/70">{storeProps.openingHours}</span>
                </div>
              )}
              </>
              );})()}

              {/* Travel Info */}
              {travelInfo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-3 rounded-xl bg-primary-500/10 border border-primary-500/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Route size={16} className="text-primary-400" />
                      <span className="text-sm font-medium text-white">Route Info</span>
                    </div>
                    <button
                      onClick={clearDirections}
                      className="text-xs text-white/50 hover:text-white/70"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="text-white/70">
                      <strong className="text-white">{travelInfo.distance}</strong> distance
                    </span>
                    <span className="text-white/70">
                      <strong className="text-white">{travelInfo.duration}</strong> drive
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={calculateRoute}
                  disabled={!userLocation || isCalculatingRoute}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-purple-600 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isCalculatingRoute ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Navigation size={16} />
                  )}
                  Get Directions
                </motion.button>
                <motion.a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${getStoreProps(selectedStore).latitude},${getStoreProps(selectedStore).longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="py-2.5 px-4 rounded-xl bg-white/10 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-white/20"
                >
                  <ExternalLink size={16} />
                </motion.a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS for pulse animation */}
      <style>{`
        .user-pulse-marker {
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.3);
          animation: pulse 2s ease-out infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(3); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

// Dark map styles for better visibility
const mapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8b8b8b' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#2d2d44' }],
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#1e1e32' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry.fill',
    stylers: [{ color: '#1a2e1a' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2d2d44' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1a1a2e' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3d3d5c' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1a1a2e' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2d2d44' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0e1626' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4a5568' }],
  },
];

export default MedicineMap;
