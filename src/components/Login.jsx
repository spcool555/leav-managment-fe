import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock,Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoginHeader from './LoginHeader';
import toast from 'react-hot-toast';

const Login = () => {
  const [formData, setFormData] = useState({
    employee_id: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employee_id || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const success = await login(formData.employee_id, formData.password);
      if (success) {
        toast.success('Login successful!');
        // Navigation will be handled by the AuthContext
      }
    } catch (error) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
  <div
  className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat px-4"
  style={{ backgroundImage: "url('/login.png')" }}
>   
    <div className="absolute left-8 bottom-10 hidden lg:block z-0 opacity-80">
        <div className="w-7 h-16 bg-[#315743] rounded-md p-1 flex flex-col justify-between">
        <span className="w-5 h-5 rounded-full bg-[#ef7770]"></span>
        <span className="w-5 h-5 rounded-full bg-[#f2c94c]"></span>
        <span className="w-5 h-5 rounded-full bg-[#67ad78]"></span>
     </div>

  <div className="w-1 h-14 bg-[#789887] ml-3"></div>

  <div className="w-8 h-1 bg-[#789887] rounded-full"></div>
  </div>
      <div className="max-w-md w-full space-y-8">
        
        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <LoginHeader />
          
          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            {/* Employee ID Field */}
            <div>
              <label htmlFor="employee_id" className="block text-sm font-medium text-gray-700 mb-2">
                Employee ID / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="employee_id"
                  name="employee_id"
                  type="text"
                  required
                  value={formData.employee_id}
                  onChange={handleChange}
                  className="input-field-with-icon"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            {/* Password Field */}
           {/* Password Field */}
<div>
  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
    Password
  </label>

  <div className="relative">
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <Lock className="h-5 w-5 text-gray-400" />
    </div>

    <input
      id="password"
      name="password"
      type={showPassword ? "text" : "password"}
      required
      value={formData.password}
      onChange={handleChange}
      className="input-field-with-icon pr-12"
      placeholder="Enter your password"
    />

    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
    >
      {showPassword ? (
  <Eye className="h-5 w-5" />
) : (
  <EyeOff className="h-5 w-5" />
)}
    </button>
  </div>
</div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full btn-primary py-3 text-lg font-semibold ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
