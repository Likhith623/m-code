import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Home, Search, ArrowLeft } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-lg"
      >
        {/* 404 Animation */}
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="mb-8"
        >
          <span className="text-[150px] font-bold gradient-text leading-none">
            404
          </span>
        </motion.div>

        <h1 className="text-3xl font-bold mb-4">Page Not Found</h1>
        <p className="text-white/60 mb-8">
          Oops! The page you're looking for doesn't exist or has been moved.
          Let's get you back on track.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.history.back()}
            className="glass-button-secondary flex items-center justify-center gap-2"
          >
            <ArrowLeft size={20} />
            <span>Go Back</span>
          </motion.button>
          <Link to="/">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full glass-button flex items-center justify-center gap-2"
            >
              <Home size={20} />
              <span>Back to Home</span>
            </motion.button>
          </Link>
          <Link to="/search">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full glass-button-secondary flex items-center justify-center gap-2"
            >
              <Search size={20} />
              <span>Search Medicine</span>
            </motion.button>
          </Link>
        </div>

        {/* Decorative Elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-500/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px]" />
        </div>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
