import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Store,
  Package,
  AlertTriangle,
  TrendingUp,
  Plus,
  ChevronRight,
  MapPin,
  Clock,
  Eye,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const RetailerDashboard = () => {
  const { profile, user } = useAuthStore();
  const [stats, setStats] = useState({
    totalStores: 0,
    totalMedicines: 0,
    lowStock: 0,
    totalViews: 0,
  });
  const [stores, setStores] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch stores
      const { data: storesData } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', user.id);

      setStores(storesData || []);

      if (storesData && storesData.length > 0) {
        const storeIds = storesData.map((s) => s.id);

        // Fetch all medicines for these stores
        const { data: medicines } = await supabase
          .from('medicines')
          .select('*')
          .in('store_id', storeIds);

        // Calculate stats
        const totalMedicines = medicines?.length || 0;
        const lowStock =
          medicines?.filter((m) => m.quantity <= m.min_stock_alert).length || 0;

        setStats({
          totalStores: storesData.length,
          totalMedicines,
          lowStock,
          totalViews: 0, // Would need analytics
        });

        // Get low stock items
        const lowStockMeds = medicines
          ?.filter((m) => m.quantity <= m.min_stock_alert)
          .slice(0, 5);
        setLowStockItems(lowStockMeds || []);
      } else {
        setStats({
          totalStores: 0,
          totalMedicines: 0,
          lowStock: 0,
          totalViews: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Stores',
      value: stats.totalStores,
      icon: Store,
      color: 'from-blue-500 to-cyan-500',
      link: '/retailer/stores',
    },
    {
      title: 'Total Medicines',
      value: stats.totalMedicines,
      icon: Package,
      color: 'from-green-500 to-emerald-500',
      link: '/retailer/inventory',
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStock,
      icon: AlertTriangle,
      color: 'from-orange-500 to-red-500',
      link: '/retailer/inventory',
    },
    {
      title: 'Total Views',
      value: stats.totalViews,
      icon: Eye,
      color: 'from-purple-500 to-pink-500',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Dashboard Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold mb-2">
              <span className="gradient-text">Dashboard</span>
            </h1>
            <p className="text-white/60">
              Welcome, <span className="font-medium text-white">{profile?.full_name || 'Retailer'}</span> • Manage your stores and inventory
            </p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="glass-button flex items-center gap-2 self-start"
          >
            <TrendingUp size={16} />
            <span>Refresh Stats</span>
          </button>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {stat.link ? (
                <Link to={stat.link} className="block">
                  <div className="glass-card p-6 hover:bg-white/10 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}
                      >
                        <stat.icon size={24} className="text-white" />
                      </div>
                      {stat.title === 'Low Stock Items' && stats.lowStock > 0 && (
                        <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      )}
                    </div>
                    <h3 className="text-3xl font-bold mb-1">{stat.value}</h3>
                    <p className="text-white/60 text-sm">{stat.title}</p>
                  </div>
                </Link>
              ) : (
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}
                    >
                      <stat.icon size={24} className="text-white" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold mb-1">{stat.value}</h3>
                  <p className="text-white/60 text-sm">{stat.title}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid sm:grid-cols-2 gap-4 mb-8"
        >
          <Link to="/retailer/stores">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="glass-card p-6 flex items-center gap-4"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center">
                <Plus size={28} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Add New Store</h3>
                <p className="text-white/50 text-sm">Register a new pharmacy</p>
              </div>
              <ChevronRight size={24} className="ml-auto text-white/30" />
            </motion.div>
          </Link>

          <Link to="/retailer/inventory">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="glass-card p-6 flex items-center gap-4"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Package size={28} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Manage Inventory</h3>
                <p className="text-white/50 text-sm">Add or update medicines</p>
              </div>
              <ChevronRight size={24} className="ml-auto text-white/30" />
            </motion.div>
          </Link>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* My Stores */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Store size={20} />
                My Stores
              </h2>
              <Link
                to="/retailer/stores"
                className="text-primary-400 text-sm hover:underline"
              >
                View All
              </Link>
            </div>

            {stores.length === 0 ? (
              <div className="text-center py-8">
                <Store size={40} className="mx-auto text-white/20 mb-3" />
                <p className="text-white/50">No stores yet</p>
                <Link
                  to="/retailer/stores"
                  className="text-primary-400 text-sm hover:underline mt-2 inline-block"
                >
                  Add your first store
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {stores.slice(0, 3).map((store) => (
                  <Link
                    key={store.id}
                    to={`/retailer/inventory/${store.id}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500/20 to-purple-600/20 flex items-center justify-center overflow-hidden">
                        {store.store_image_url ? (
                          <img
                            src={store.store_image_url}
                            alt={store.store_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Store size={20} className="text-primary-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{store.store_name}</p>
                        <p className="text-xs text-white/50 flex items-center gap-1">
                          <MapPin size={12} />
                          {store.city}, {store.state}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className={`px-2 py-1 rounded-full text-xs ${
                          store.is_open
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {store.is_open ? 'Open' : 'Closed'}
                      </div>
                      <ChevronRight size={18} className="text-white/30" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>

          {/* Low Stock Alerts */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <AlertTriangle size={20} className="text-orange-400" />
                Low Stock Alerts
              </h2>
              {lowStockItems.length > 0 && (
                <span className="px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs">
                  {lowStockItems.length} items
                </span>
              )}
            </div>

            {lowStockItems.length === 0 ? (
              <div className="text-center py-8">
                <Package size={40} className="mx-auto text-white/20 mb-3" />
                <p className="text-white/50">All items are well-stocked!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-orange-500/10 border border-orange-500/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                        <Package size={18} className="text-orange-400" />
                      </div>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-white/50">
                          {item.quantity} left • Min: {item.min_stock_alert}
                        </p>
                      </div>
                    </div>
                    <span className="text-orange-400 font-semibold">
                      {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Tips Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 glass-card p-6"
        >
          <h2 className="text-xl font-semibold mb-4">💡 Quick Tips</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white/5">
              <h3 className="font-medium mb-1">Keep Inventory Updated</h3>
              <p className="text-sm text-white/50">
                Regular updates help customers find what they need.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/5">
              <h3 className="font-medium mb-1">Add Medicine Images</h3>
              <p className="text-sm text-white/50">
                Photos help customers identify medicines quickly.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/5">
              <h3 className="font-medium mb-1">Monitor Low Stock</h3>
              <p className="text-sm text-white/50">
                Set alerts to restock before running out.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RetailerDashboard;
