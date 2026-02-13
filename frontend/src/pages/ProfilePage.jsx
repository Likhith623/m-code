import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Edit,
  Camera,
  Save,
  Loader2,
  Shield,
  Bell,
  Eye,
  EyeOff,
  LogOut,
  Trash2,
  Key,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { supabase, uploadImage } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const { user, profile, signOut, setProfile } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
      });
      setAvatarPreview(profile.avatar_url);
    }
  }, [profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let avatarUrl = profile?.avatar_url || null;

      // Upload avatar if changed
      if (avatarFile) {
        const filePath = `${user.id}/avatar-${Date.now()}.${avatarFile.name.split('.').pop()}`;
        avatarUrl = await uploadImage('avatars', filePath, avatarFile);
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          address: formData.address,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      setEditing(false);
      setAvatarFile(null);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast.success('Password updated successfully!');
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    toast.success('Signed out successfully');
  };

  const handleDeleteAccount = async () => {
    const confirmed = confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );

    if (!confirmed) return;

    const doubleConfirm = prompt(
      'Type "DELETE" to confirm account deletion:'
    );

    if (doubleConfirm !== 'DELETE') {
      toast.error('Account deletion cancelled');
      return;
    }

    setLoading(true);

    try {
      // Note: Account deletion should be handled server-side
      // For now, we'll just sign out
      toast.error('Please contact support to delete your account');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setAvatarFile(null);
    setAvatarPreview(profile?.avatar_url);
    setFormData({
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
      address: profile?.address || '',
    });
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold">
            <span className="gradient-text">My</span> Profile
          </h1>
          <p className="text-white/60 mt-2">
            Manage your account settings and preferences
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Profile Information</h2>
                {!editing && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setEditing(true)}
                    className="glass-button-secondary text-sm flex items-center gap-2"
                  >
                    <Edit size={16} />
                    <span>Edit</span>
                  </motion.button>
                )}
              </div>

              <form onSubmit={handleSubmit}>
                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 pb-6 border-b border-white/10">
                  <div className="relative">
                    <div className="w-28 h-28 rounded-full overflow-hidden bg-gradient-to-br from-primary-500 to-purple-600">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl font-bold">
                          {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    {editing && (
                      <label className="absolute bottom-0 right-0 p-2 rounded-full bg-primary-500 cursor-pointer hover:bg-primary-600 transition-colors">
                        <Camera size={16} />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-xl font-semibold">
                      {profile?.full_name || 'No Name Set'}
                    </h3>
                    <p className="text-white/50">{user?.email}</p>
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${
                          profile?.role === 'retailer'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        <Shield size={14} />
                        {profile?.role === 'retailer' ? 'Retailer' : 'Customer'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <User size={16} className="inline mr-2" />
                      Full Name
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        className="glass-input"
                        placeholder="Enter your full name"
                      />
                    ) : (
                      <p className="py-3 px-4 rounded-xl bg-white/5">
                        {profile?.full_name || 'Not set'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <Mail size={16} className="inline mr-2" />
                      Email Address
                    </label>
                    <p className="py-3 px-4 rounded-xl bg-white/5 text-white/50">
                      {user?.email}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <Phone size={16} className="inline mr-2" />
                      Phone Number
                    </label>
                    {editing ? (
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="glass-input"
                        placeholder="Enter your phone number"
                      />
                    ) : (
                      <p className="py-3 px-4 rounded-xl bg-white/5">
                        {profile?.phone || 'Not set'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <MapPin size={16} className="inline mr-2" />
                      Address
                    </label>
                    {editing ? (
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        rows={2}
                        className="glass-input resize-none"
                        placeholder="Enter your address"
                      />
                    ) : (
                      <p className="py-3 px-4 rounded-xl bg-white/5">
                        {profile?.address || 'Not set'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Edit Buttons */}
                {editing && (
                  <div className="flex items-center gap-4 mt-6 pt-6 border-t border-white/10">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="flex-1 glass-button-secondary"
                    >
                      Cancel
                    </button>
                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 glass-button flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : (
                        <>
                          <Save size={20} />
                          <span>Save Changes</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                )}
              </form>
            </div>
          </motion.div>

          {/* Account Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {/* Security */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Key size={18} />
                Security
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <p className="font-medium">Change Password</p>
                  <p className="text-sm text-white/50">
                    Update your account password
                  </p>
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Bell size={18} />
                Notifications
              </h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 cursor-pointer">
                  <span className="text-sm">Email notifications</span>
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded"
                    defaultChecked
                  />
                </label>
                <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 cursor-pointer">
                  <span className="text-sm">Stock alerts</span>
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded"
                    defaultChecked
                  />
                </label>
              </div>
            </div>

            {/* Account Actions */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Account</h3>
              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSignOut}
                  className="w-full p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center gap-2 text-white"
                >
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDeleteAccount}
                  className="w-full p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2 text-red-400"
                >
                  <Trash2 size={18} />
                  <span>Delete Account</span>
                </motion.button>
              </div>
            </div>

            {/* Account Info */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Account Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/50">Member since</span>
                  <span>
                    {new Date(user?.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Account type</span>
                  <span className="capitalize">{profile?.role}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Password Change Modal */}
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPasswordModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold mb-6">Change Password</h3>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value,
                        })
                      }
                      required
                      className="glass-input pr-12"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword({ ...showPassword, new: !showPassword.new })
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50"
                    >
                      {showPassword.new ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value,
                        })
                      }
                      required
                      className="glass-input pr-12"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword({
                          ...showPassword,
                          confirm: !showPassword.confirm,
                        })
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50"
                    >
                      {showPassword.confirm ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 glass-button-secondary"
                  >
                    Cancel
                  </button>
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 glass-button flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>
                        <Key size={18} />
                        <span>Update</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
