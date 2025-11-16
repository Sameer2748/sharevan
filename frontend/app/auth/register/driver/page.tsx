'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { TruckIcon, Loader2, Upload, CheckCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function DriverRegistrationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    mobile: '',
    name: '',
    email: '',
    vehicleType: 'BIKE' as 'BIKE' | 'SCOOTER' | 'CAR' | 'VAN' | 'TRUCK',
    vehicleNumber: '',
    vehicleModel: '',
    vehicleColor: '',
    licenseNumber: '',
    aadharNumber: '',
    panNumber: '',
  });

  // File uploads
  const [files, setFiles] = useState({
    licenseImage: null as File | null,
    vehicleRegImage: null as File | null,
    aadharImage: null as File | null,
    panImage: null as File | null,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [field]: file }));
  };

  const validateStep1 = () => {
    if (formData.mobile.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return false;
    }
    if (!formData.name.trim()) {
      toast.error('Please enter your full name');
      return false;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.vehicleNumber.trim()) {
      toast.error('Please enter vehicle number');
      return false;
    }
    if (!formData.licenseNumber.trim()) {
      toast.error('Please enter license number');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!files.licenseImage) {
      toast.error('Please upload driving license image');
      return false;
    }
    if (!files.vehicleRegImage) {
      toast.error('Please upload vehicle registration image');
      return false;
    }
    if (!files.aadharImage) {
      toast.error('Please upload Aadhar card image');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;

    setLoading(true);
    try {
      // Upload files first
      const uploadedUrls: any = {};

      for (const [key, file] of Object.entries(files)) {
        if (file) {
          const formData = new FormData();
          formData.append('file', file);

          const response = await axios.post(`${API_URL}/api/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });

          uploadedUrls[key] = response.data.data.url;
        }
      }

      // Register driver
      const registrationData = {
        mobile: `+91${formData.mobile}`,
        name: formData.name,
        email: formData.email || undefined,
        vehicleType: formData.vehicleType,
        vehicleNumber: formData.vehicleNumber.toUpperCase(),
        vehicleModel: formData.vehicleModel || undefined,
        vehicleColor: formData.vehicleColor || undefined,
        licenseNumber: formData.licenseNumber,
        licenseImage: uploadedUrls.licenseImage,
        vehicleRegImage: uploadedUrls.vehicleRegImage,
        aadharNumber: formData.aadharNumber || undefined,
        aadharImage: uploadedUrls.aadharImage,
        panNumber: formData.panNumber || undefined,
        panImage: uploadedUrls.panImage,
      };

      await axios.post(`${API_URL}/api/auth/register-driver`, registrationData);

      toast.success('Registration submitted! Wait for admin verification.');
      setTimeout(() => {
        router.push('/auth/login?role=driver');
      }, 2000);

    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="bg-primary/10 p-4 rounded-full">
                <TruckIcon className="w-12 h-12 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Driver Registration</h1>
            <p className="text-gray-600">Join Sharevan as a delivery partner</p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-6">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step >= num
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step > num ? <CheckCircle className="w-6 h-6" /> : num}
                </div>
                {num < 3 && (
                  <div
                    className={`w-16 h-1 ${
                      step > num ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Personal Information */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number *
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-4 bg-gray-100 border border-r-0 border-gray-300 rounded-l-xl text-gray-600 font-medium">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={formData.mobile}
                    onChange={(e) => handleInputChange('mobile', e.target.value.replace(/\D/g, ''))}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-r-xl focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="9876543210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="your.email@example.com"
                />
              </div>

              <button
                onClick={handleNext}
                className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-600"
              >
                Next: Vehicle Details
              </button>
            </div>
          )}

          {/* Step 2: Vehicle Information */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Vehicle Information</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Type *
                </label>
                <select
                  value={formData.vehicleType}
                  onChange={(e) => handleInputChange('vehicleType', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="BIKE">Bike</option>
                  <option value="SCOOTER">Scooter</option>
                  <option value="CAR">Car</option>
                  <option value="VAN">Van</option>
                  <option value="TRUCK">Truck</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Number *
                </label>
                <input
                  type="text"
                  value={formData.vehicleNumber}
                  onChange={(e) => handleInputChange('vehicleNumber', e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="DL01AB1234"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Model
                  </label>
                  <input
                    type="text"
                    value={formData.vehicleModel}
                    onChange={(e) => handleInputChange('vehicleModel', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Honda Activa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Color
                  </label>
                  <input
                    type="text"
                    value={formData.vehicleColor}
                    onChange={(e) => handleInputChange('vehicleColor', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driving License Number *
                </label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="DL-1234567890123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aadhar Number (Optional)
                </label>
                <input
                  type="text"
                  maxLength={12}
                  value={formData.aadharNumber}
                  onChange={(e) => handleInputChange('aadharNumber', e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="123456789012"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PAN Number (Optional)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={formData.panNumber}
                  onChange={(e) => handleInputChange('panNumber', e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="ABCDE1234F"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-600"
                >
                  Next: Documents
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Document Upload */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Upload Documents</h2>

              <FileUploadField
                label="Driving License *"
                file={files.licenseImage}
                onChange={(file) => handleFileChange('licenseImage', file)}
              />

              <FileUploadField
                label="Vehicle Registration (RC) *"
                file={files.vehicleRegImage}
                onChange={(file) => handleFileChange('vehicleRegImage', file)}
              />

              <FileUploadField
                label="Aadhar Card *"
                file={files.aadharImage}
                onChange={(file) => handleFileChange('aadharImage', file)}
              />

              <FileUploadField
                label="PAN Card (Optional)"
                file={files.panImage}
                onChange={(file) => handleFileChange('panImage', file)}
              />

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Your documents will be verified by our admin team. You'll be able to start accepting orders once verified.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  disabled={loading}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Registration'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Login Link */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-600">
              Already registered?{' '}
              <a
                href="/auth/login?role=driver"
                className="text-primary font-semibold hover:underline"
              >
                Login as Driver
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// File Upload Component
function FileUploadField({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-primary transition-colors">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onChange(e.target.files?.[0] || null)}
          className="hidden"
          id={label}
        />
        <label
          htmlFor={label}
          className="flex flex-col items-center cursor-pointer"
        >
          {file ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{file.name}</span>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-600">
                Click to upload or drag & drop
              </span>
              <span className="text-xs text-gray-500 mt-1">
                PNG, JPG up to 5MB
              </span>
            </>
          )}
        </label>
      </div>
    </div>
  );
}
