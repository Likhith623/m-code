import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Heart,
  Bell,
  Clock,
  MapPin,
  TrendingUp,
  Store,
  AlertCircle,
  ChevronRight,
  Pill,
  Trash2,
  ExternalLink,
  RefreshCw,
  MessageCircle,
  Bot,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { supabase, getFavoriteMedicines, removeFavoriteMedicine } from '../../lib/supabase';
import toast from 'react-hot-toast';
import Chatbot from '../../components/Chatbot';

const CustomerDashboard = () => {
  const { profile, user } = useAuthStore();
  const [stats, setStats] = useState({
    totalSearches: 0,
    favoriteStores: 0,
    favoriteMedicines: 0,
    activeAlerts: 0,
  });
  const [recentSearches, setRecentSearches] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [favoriteMedicines, setFavoriteMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Chatbot state for medicine info
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [selectedMedicineQuery, setSelectedMedicineQuery] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch recent searches
      const { data: searches, error: searchError } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!searchError) setRecentSearches(searches || []);

      // Fetch favorite stores with store details
      const { data: favs, error: favError } = await supabase
        .from('favorites')
        .select('*, stores(*)')
        .eq('user_id', user.id)
        .limit(5);

      if (!favError) setFavorites(favs || []);

      // Fetch favorite medicines
      const favMedsResult = await getFavoriteMedicines(user.id);
      if (!favMedsResult.error) setFavoriteMedicines(favMedsResult.data || []);

      // Count stats
      const { count: searchCount } = await supabase
        .from('search_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: favCount } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: favMedCount } = await supabase
        .from('favorite_medicines')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: alertCount } = await supabase
        .from('medicine_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true);

      setStats({
        totalSearches: searchCount || 0,
        favoriteStores: favCount || 0,
        favoriteMedicines: favMedCount || 0,
        activeAlerts: alertCount || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavoriteMedicine = async (medicineId) => {
    try {
      const { error } = await removeFavoriteMedicine(user.id, medicineId);
      if (error) throw error;
      
      setFavoriteMedicines(prev => prev.filter(m => m.medicine_id !== medicineId));
      setStats(prev => ({ ...prev, favoriteMedicines: prev.favoriteMedicines - 1 }));
      toast.success('Removed from favorites');
    } catch (error) {
      toast.error('Failed to remove favorite');
    }
  };

  // Open chatbot with medicine info
  const handleMedicineInfoClick = (medicineName) => {
    setSelectedMedicineQuery(medicineName);
    setChatbotOpen(true);
  };

  const statCards = [
    {
      title: 'Total Searches',
      value: stats.totalSearches,
      icon: Search,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Favorite Stores',
      value: stats.favoriteStores,
      icon: Store,
      color: 'from-pink-500 to-rose-500',
    },
    {
      title: 'Saved Medicines',
      value: stats.favoriteMedicines,
      icon: Pill,
      color: 'from-green-500 to-emerald-500',
    },
    {
      title: 'Active Alerts',
      value: stats.activeAlerts,
      icon: Bell,
      color: 'from-purple-500 to-violet-500',
    },
  ];

  const quickActions = [
    {
      title: 'Search Medicine',
      description: 'Find medicines near you',
      icon: Search,
      link: '/search',
      color: 'from-primary-500 to-cyan-500',
    },
    {
      title: 'View Favorites',
      description: 'Your saved pharmacies',
      icon: Heart,
      link: '/customer/favorites',
      color: 'from-pink-500 to-rose-500',
    },
    {
      title: 'Notifications',
      description: 'Check your alerts',
      icon: Bell,
      link: '/customer/notifications',
      color: 'from-purple-500 to-violet-500',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-7xl mx-auto">
        {/* Dashboard Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              <span className="gradient-text">Dashboard</span>
            </h1>
            <p className="text-white/60 text-sm sm:text-base">
              Welcome, <span className="font-medium text-white">{profile?.full_name || 'User'}</span> • Find medicines near you
            </p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="glass-button flex items-center gap-2 self-start"
          >
            <RefreshCw size={16} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </motion.div>

        {/* Stats Grid - Now responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}
                >
                  <stat.icon size={20} className="text-white sm:hidden" />
                  <stat.icon size={24} className="text-white hidden sm:block" />
                </div>
                <TrendingUp size={16} className="text-green-400 sm:hidden" />
                <TrendingUp size={20} className="text-green-400 hidden sm:block" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold mb-1">{stat.value}</h3>
              <p className="text-white/60 text-xs sm:text-sm">{stat.title}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-4 sm:p-6 mb-6 sm:mb-8"
        >
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Quick Search</h2>
          <Link to="/search">
            <div className="glass-input flex items-center gap-3 cursor-pointer hover:border-primary-500 transition-colors">
              <Search size={20} className="text-white/50" />
              <span className="text-white/50 text-sm sm:text-base">Search for medicines...</span>
            </div>
          </Link>
        </motion.div>

        {/* Tabs for different sections */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {['overview', 'medicines', 'stores', 'searches'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'bg-primary-500 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Recent Searches Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                  <Clock size={18} className="text-primary-400" />
                  Recent Searches
                </h2>
                <Link to="/search" className="text-primary-400 text-sm hover:underline">
                  View all
                </Link>
              </div>

              {recentSearches.length === 0 ? (
                <div className="text-center py-8">
                  <Search size={40} className="mx-auto text-white/20 mb-3" />
                  <p className="text-white/50">No recent searches</p>
                  <Link
                    to="/search"
                    className="text-primary-400 text-sm hover:underline mt-2 inline-block"
                  >
                    Start searching
                  </Link>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {recentSearches.map((search) => (
                    <Link
                      key={search.id}
                      to={`/search?q=${encodeURIComponent(search.search_query)}`}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500/20 to-purple-600/20 flex items-center justify-center flex-shrink-0">
                          <Search size={16} className="text-primary-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{search.search_query}</p>
                          <p className="text-xs text-white/50">
                            {search.results_count || 0} results •{' '}
                            {new Date(search.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-white/30 flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Favorite Medicines Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                  <Pill size={18} className="text-green-400" />
                  Saved Medicines
                </h2>
                <span className="text-white/50 text-sm">{favoriteMedicines.length} saved</span>
              </div>

              {favoriteMedicines.length === 0 ? (
                <div className="text-center py-8">
                  <Pill size={40} className="mx-auto text-white/20 mb-3" />
                  <p className="text-white/50">No favorite medicines yet</p>
                  <p className="text-white/30 text-sm mt-1">
                    Click ❤️ on search results to save
                  </p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {favoriteMedicines.slice(0, 5).map((med) => (
                    <div
                      key={med.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div 
                        className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                        onClick={() => handleMedicineInfoClick(med.medicine_name)}
                        title="Click to learn about this medicine"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-600/20 flex items-center justify-center flex-shrink-0">
                          <Pill size={16} className="text-green-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{med.medicine_name || 'Unknown'}</p>
                          <p className="text-xs text-white/50">
                            Click to learn more • Added {new Date(med.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleMedicineInfoClick(med.medicine_name)}
                          className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
                          title="Ask AI about this medicine"
                        >
                          <Bot size={16} className="text-purple-400" />
                        </button>
                        <Link
                          to={`/search?q=${encodeURIComponent(med.medicine_name || '')}`}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="Search for this medicine"
                        >
                          <ExternalLink size={16} className="text-primary-400" />
                        </Link>
                        <button
                          onClick={() => handleRemoveFavoriteMedicine(med.medicine_id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Remove from favorites"
                        >
                          <Trash2 size={16} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}

        {activeTab === 'medicines' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4 sm:p-6"
          >
            <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
              <Pill size={20} className="text-green-400" />
              All Saved Medicines
            </h2>

            {favoriteMedicines.length === 0 ? (
              <div className="text-center py-12">
                <Pill size={48} className="mx-auto text-white/20 mb-4" />
                <p className="text-white/50 mb-2">No favorite medicines saved</p>
                <Link to="/search" className="text-primary-400 hover:underline">
                  Search for medicines to save
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Medicine</th>
                      <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Date Added</th>
                      <th className="text-right py-3 px-4 text-white/60 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {favoriteMedicines.map((med, index) => (
                      <tr
                        key={med.id}
                        className={`border-b border-white/5 ${index % 2 === 0 ? 'bg-white/[0.02]' : ''}`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-600/20 flex items-center justify-center">
                              <Pill size={14} className="text-green-400" />
                            </div>
                            <span className="font-medium">{med.medicine_name || 'Unknown Medicine'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-white/60 text-sm">
                          {new Date(med.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/search?q=${encodeURIComponent(med.medicine_name || '')}`}
                              className="px-3 py-1.5 text-xs bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors"
                            >
                              Search
                            </Link>
                            <button
                              onClick={() => handleRemoveFavoriteMedicine(med.medicine_id)}
                              className="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'stores' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4 sm:p-6"
          >
            <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
              <Store size={20} className="text-pink-400" />
              Favorite Stores
            </h2>

            {favorites.length === 0 ? (
              <div className="text-center py-12">
                <Store size={48} className="mx-auto text-white/20 mb-4" />
                <p className="text-white/50 mb-2">No favorite stores saved</p>
                <Link to="/search" className="text-primary-400 hover:underline">
                  Search for pharmacies to save
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Store</th>
                      <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Location</th>
                      <th className="text-center py-3 px-4 text-white/60 text-sm font-medium">Status</th>
                      <th className="text-right py-3 px-4 text-white/60 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {favorites.map((fav, index) => (
                      <tr
                        key={fav.id}
                        className={`border-b border-white/5 ${index % 2 === 0 ? 'bg-white/[0.02]' : ''}`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500/20 to-rose-600/20 flex items-center justify-center">
                              <Store size={14} className="text-pink-400" />
                            </div>
                            <span className="font-medium">{fav.stores?.store_name || 'Unknown Store'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-white/60 text-sm">
                            <MapPin size={14} />
                            {fav.stores?.city || 'Unknown Location'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              fav.stores?.is_open
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {fav.stores?.is_open ? 'Open' : 'Closed'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={`https://maps.google.com/?q=${fav.stores?.latitude},${fav.stores?.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 text-xs bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors"
                            >
                              Directions
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'searches' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4 sm:p-6"
          >
            <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock size={20} className="text-primary-400" />
              Search History
            </h2>

            {recentSearches.length === 0 ? (
              <div className="text-center py-12">
                <Search size={48} className="mx-auto text-white/20 mb-4" />
                <p className="text-white/50 mb-2">No search history yet</p>
                <Link to="/search" className="text-primary-400 hover:underline">
                  Start searching for medicines
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Search Query</th>
                      <th className="text-center py-3 px-4 text-white/60 text-sm font-medium">Results</th>
                      <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Date</th>
                      <th className="text-right py-3 px-4 text-white/60 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSearches.map((search, index) => (
                      <tr
                        key={search.id}
                        className={`border-b border-white/5 ${index % 2 === 0 ? 'bg-white/[0.02]' : ''}`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500/20 to-purple-600/20 flex items-center justify-center">
                              <Search size={14} className="text-primary-400" />
                            </div>
                            <span className="font-medium">{search.search_query}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-1 bg-white/10 rounded-full text-sm">
                            {search.results_count || 0}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-white/60 text-sm">
                          {new Date(search.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end">
                            <Link
                              to={`/search?q=${encodeURIComponent(search.search_query)}`}
                              className="px-3 py-1.5 text-xs bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors"
                            >
                              Search Again
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6 sm:mt-8"
        >
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {quickActions.map((action) => (
              <Link key={action.title} to={action.link}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="glass-card p-4 sm:p-6 group"
                >
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <action.icon size={20} className="text-white sm:hidden" />
                    <action.icon size={24} className="text-white hidden sm:block" />
                  </div>
                  <h3 className="font-semibold mb-1 text-sm sm:text-base">{action.title}</h3>
                  <p className="text-xs sm:text-sm text-white/50">{action.description}</p>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Emergency Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-6 sm:mt-8 glass-card p-4 sm:p-6 border-l-4 border-red-500"
        >
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={20} className="text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-red-400 mb-1">
                Emergency Helpline
              </h3>
              <p className="text-white/70 text-xs sm:text-sm">
                In case of a medical emergency, please call{' '}
                <strong className="text-white">108</strong> or visit your nearest
                hospital immediately. This app helps locate medicines but is not a
                substitute for emergency medical care.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Chatbot for medicine info */}
      <Chatbot 
        isOpenExternal={chatbotOpen}
        initialQuery={selectedMedicineQuery}
        onClose={() => {
          setChatbotOpen(false);
          setSelectedMedicineQuery(null);
        }}
      />
    </div>
  );
};

export default CustomerDashboard;
