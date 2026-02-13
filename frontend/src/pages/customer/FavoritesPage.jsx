import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Heart,
  Store,
  MapPin,
  Phone,
  Star,
  Trash2,
  ExternalLink,
  Search,
  Pill,
  IndianRupee,
  Package,
  Building2,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { supabase, getFavoriteMedicines, removeFavoriteMedicine } from '../../lib/supabase';
import toast from 'react-hot-toast';

const FavoritesPage = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('medicines');
  const [favoriteStores, setFavoriteStores] = useState([]);
  const [favoriteMedicines, setFavoriteMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAllFavorites();
    }
  }, [user]);

  const fetchAllFavorites = async () => {
    setLoading(true);
    try {
      // Fetch favorite stores
      const { data: storeData, error: storeError } = await supabase
        .from('favorites')
        .select(`
          id,
          created_at,
          stores (
            id,
            store_name,
            address,
            city,
            phone,
            rating,
            store_image_url,
            is_open
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (storeError) throw storeError;
      setFavoriteStores(storeData || []);

      // Fetch favorite medicines
      const { data: medicines, error: medError } = await getFavoriteMedicines(user.id);
      if (medError) throw medError;
      setFavoriteMedicines(medicines || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const removeStoreFavorite = async (favoriteId) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;
      
      setFavoriteStores(favoriteStores.filter((f) => f.id !== favoriteId));
      toast.success('Removed from favorites');
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast.error('Failed to remove');
    }
  };

  const removeMedicineFavorite = async (favoriteId, medicineId) => {
    try {
      await removeFavoriteMedicine(user.id, medicineId);
      setFavoriteMedicines(favoriteMedicines.filter((f) => f.id !== favoriteId));
      toast.success('Removed from favorites');
    } catch (error) {
      console.error('Error removing favorite medicine:', error);
      toast.error('Failed to remove');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold">
            My <span className="gradient-text">Favorites</span>
          </h1>
          <p className="text-white/60 mt-2">
            Quick access to your saved medicines and stores
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 p-1 bg-white/5 rounded-xl mb-8 w-fit"
        >
          <button
            onClick={() => setActiveTab('medicines')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'medicines'
                ? 'bg-primary-500 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Pill size={18} />
            <span>Medicines</span>
            {favoriteMedicines.length > 0 && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                activeTab === 'medicines' ? 'bg-white/20' : 'bg-primary-500/30 text-primary-300'
              }`}>
                {favoriteMedicines.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('stores')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'stores'
                ? 'bg-primary-500 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Store size={18} />
            <span>Stores</span>
            {favoriteStores.length > 0 && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                activeTab === 'stores' ? 'bg-white/20' : 'bg-primary-500/30 text-primary-300'
              }`}>
                {favoriteStores.length}
              </span>
            )}
          </button>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Favorite Medicines Tab */}
          {activeTab === 'medicines' && (
            <motion.div
              key="medicines"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {favoriteMedicines.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-card p-12 text-center"
                >
                  <Pill size={64} className="mx-auto text-white/20 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Favorite Medicines</h3>
                  <p className="text-white/50 mb-6">
                    Save medicines while searching to quickly find them later
                  </p>
                  <Link to="/search">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="glass-button inline-flex items-center gap-2"
                    >
                      <Search size={20} />
                      <span>Search Medicines</span>
                    </motion.button>
                  </Link>
                </motion.div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {favoriteMedicines.map((fav, index) => (
                      <motion.div
                        key={fav.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: index * 0.05 }}
                        className="glass-card p-4 group relative"
                      >
                        {/* Remove Button */}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => removeMedicineFavorite(fav.id, fav.medicine_id)}
                          className="absolute top-3 right-3 p-2 rounded-full bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/40"
                        >
                          <Trash2 size={14} />
                        </motion.button>

                        {/* Medicine Info */}
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500/20 to-purple-600/20 flex items-center justify-center flex-shrink-0">
                            <Pill size={24} className="text-primary-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate pr-8">
                              {fav.medicines?.name || fav.medicine_name}
                            </h3>
                            {fav.medicines?.generic_name && (
                              <p className="text-sm text-white/50 truncate">
                                {fav.medicines.generic_name}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Medicine Details */}
                        {fav.medicines && (
                          <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 text-white/60">
                                <IndianRupee size={14} />
                                <span>Price</span>
                              </div>
                              <span className="font-semibold text-green-400">
                                ₹{fav.medicines.price}
                              </span>
                            </div>
                            
                            {fav.medicines.quantity !== undefined && (
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-white/60">
                                  <Package size={14} />
                                  <span>Stock</span>
                                </div>
                                <span className={`font-medium ${
                                  fav.medicines.quantity > 10 ? 'text-green-400' : 
                                  fav.medicines.quantity > 0 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                  {fav.medicines.quantity > 0 ? `${fav.medicines.quantity} available` : 'Out of stock'}
                                </span>
                              </div>
                            )}

                            {fav.medicines.stores && (
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-white/60">
                                  <Building2 size={14} />
                                  <span>Store</span>
                                </div>
                                <span className="truncate max-w-[150px] text-white/80">
                                  {fav.medicines.stores.store_name}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Search Button */}
                        <Link 
                          to={`/search?q=${encodeURIComponent(fav.medicines?.name || fav.medicine_name)}`}
                          className="block mt-4"
                        >
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full glass-button-secondary text-sm flex items-center justify-center gap-2 py-2"
                          >
                            <Search size={14} />
                            <span>Find Nearby</span>
                          </motion.button>
                        </Link>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}

          {/* Favorite Stores Tab */}
          {activeTab === 'stores' && (
            <motion.div
              key="stores"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {favoriteStores.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-card p-12 text-center"
                >
                  <Heart size={64} className="mx-auto text-white/20 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Favorite Stores</h3>
                  <p className="text-white/50 mb-6">
                    Save stores while searching for medicines
                  </p>
                  <Link to="/search">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="glass-button inline-flex items-center gap-2"
                    >
                      <Search size={20} />
                      <span>Search Medicines</span>
                    </motion.button>
                  </Link>
                </motion.div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {favoriteStores.map((fav, index) => (
                      <motion.div
                        key={fav.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: index * 0.05 }}
                        className="glass-card overflow-hidden group"
                      >
                        {/* Store Image */}
                        <div className="h-40 bg-gradient-to-br from-primary-500/20 to-purple-600/20 relative">
                          {fav.stores?.store_image_url ? (
                            <img
                              src={fav.stores.store_image_url}
                              alt={fav.stores.store_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Store size={40} className="text-white/30" />
                            </div>
                          )}
                          
                          {/* Status Badge */}
                          <div
                            className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium ${
                              fav.stores?.is_open
                                ? 'bg-green-500/90 text-white'
                                : 'bg-red-500/90 text-white'
                            }`}
                          >
                            {fav.stores?.is_open ? 'Open' : 'Closed'}
                          </div>

                          {/* Remove Button */}
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => removeStoreFavorite(fav.id)}
                            className="absolute top-3 left-3 p-2 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={16} />
                          </motion.button>
                        </div>

                        {/* Store Info */}
                        <div className="p-4">
                          <h3 className="font-semibold text-lg truncate">
                            {fav.stores?.store_name || 'Unknown Store'}
                          </h3>
                          
                          <div className="mt-2 space-y-2">
                            <div className="flex items-start gap-2 text-sm text-white/60">
                              <MapPin size={16} className="flex-shrink-0 mt-0.5" />
                              <span className="line-clamp-2">
                                {fav.stores?.address}, {fav.stores?.city}
                              </span>
                            </div>
                            
                            {fav.stores?.phone && (
                              <div className="flex items-center gap-2 text-sm text-white/60">
                                <Phone size={16} className="flex-shrink-0" />
                                <span>{fav.stores.phone}</span>
                              </div>
                            )}
                            
                            {fav.stores?.rating > 0 && (
                              <div className="flex items-center gap-2 text-sm">
                                <Star size={16} className="text-yellow-400 fill-yellow-400" />
                                <span>{fav.stores.rating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 flex items-center gap-2">
                            <Link
                              to={`/search?store=${fav.stores?.id}`}
                              className="flex-1"
                            >
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full glass-button text-sm flex items-center justify-center gap-2"
                              >
                                <Search size={16} />
                                <span>View Medicines</span>
                              </motion.button>
                            </Link>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fav.stores?.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="p-3 rounded-xl bg-white/10 hover:bg-white/20"
                              >
                                <ExternalLink size={16} />
                              </motion.button>
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FavoritesPage;
