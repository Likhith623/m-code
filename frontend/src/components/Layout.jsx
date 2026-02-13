import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { motion } from 'framer-motion';

// Global floating particles background animation
const GlobalFloatingParticles = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    {[...Array(25)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-2 h-2 bg-primary-400/20 rounded-full"
        initial={{
          x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
          y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
        }}
        animate={{
          y: [null, Math.random() * -200, Math.random() * 200],
          x: [null, Math.random() * 100 - 50],
          opacity: [0.15, 0.4, 0.15],
        }}
        transition={{
          duration: Math.random() * 10 + 8,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      />
    ))}
  </div>
);

const Layout = () => {
  return (
    <div className="min-h-screen relative">
      <GlobalFloatingParticles />
      <Navbar />
      <main className="pt-20 relative z-10">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
