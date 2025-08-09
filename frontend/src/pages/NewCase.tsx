import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Textarea, Select } from '@/components/ui';
import { caseService } from '@/services/caseService';
import { ApplicationData } from '@/types';

interface NewCaseFormData {
  // Applicant Information
  applicantName: string;
  applicantFirm: string;
  applicantEmail: string;
  phoneNumber: string;
  dateOfBirth: string;
  
  // Address Fields
  streetAddress: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  
  // Application Details
  applicationType: string;
  applicationCategory: string;
  
  // Case Description
  caseSummary: string;
  
  // Documents
  documents: File[];
  documentDescriptions: string[];
}

interface ValidationErrors {
  [key: string]: string;
}

interface FileUploadStatus {
  [key: string]: {
    progress: number;
    status: 'uploading' | 'success' | 'error';
    error?: string;
  };
}

const NewCase = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<NewCaseFormData>({
    applicantName: '',
    applicantFirm: '',
    applicantEmail: '',
    phoneNumber: '',
    dateOfBirth: '',
    streetAddress: '',
    city: '',
    stateProvince: '',
    postalCode: '',
    country: '',
    applicationType: '',
    applicationCategory: '',
    caseSummary: '',
    documents: [],
    documentDescriptions: []
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileUploadStatus, setFileUploadStatus] = useState<FileUploadStatus>({});
  const [filePreviewUrls, setFilePreviewUrls] = useState<{ [key: string]: string }>({});
  const [aiInsights, setAiInsights] = useState<{
    completeness: number;
    suggestions: string[];
    riskLevel: 'low' | 'medium' | 'high';
    estimatedProcessingTime: string;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Form steps for progress indicator
  const formSteps = [
    'Applicant Info',
    'Application Details', 
    'Case Description',
    'Documents',
    'AI Review'
  ];

  // Validation rules
  const validationRules = {
    applicantName: (value: string) => {
      if (!value.trim()) return 'Applicant name is required';
      if (value.trim().length < 2) return 'Name must be at least 2 characters';
      return '';
    },
    applicantFirm: (value: string) => {
      if (!value.trim()) return 'Applicant firm is required';
      if (value.trim().length < 2) return 'Firm name must be at least 2 characters';
      return '';
    },
    applicantEmail: (value: string) => {
      if (!value.trim()) return 'Email is required';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) return 'Please enter a valid email address';
      return '';
    },
    phoneNumber: (value: string) => {
      if (value && value.trim()) {
        const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
        const cleanPhone = value.replace(/[\s\-()]/g, '');
        if (!phoneRegex.test(cleanPhone)) return 'Please enter a valid phone number';
      }
      return '';
    },
    dateOfBirth: (value: string) => {
      if (value) {
        const date = new Date(value);
        const today = new Date();
        if (date > today) return 'Date of birth cannot be in the future';
        if (date < new Date('1900-01-01')) return 'Please enter a valid date of birth';
      }
      return '';
    },
    applicationType: (value: string) => {
      if (!value.trim()) return 'Application type is required';
      return '';
    },
    applicationCategory: (value: string) => {
      if (!value.trim()) return 'Application category is required';
      return '';
    },
    caseSummary: (value: string) => {
      if (!value.trim()) return 'Case summary is required';
      if (value.trim().length < 10) return 'Case summary must be at least 10 characters';
      if (value.trim().length > 2000) return 'Case summary must be less than 2000 characters';
      return '';
    },
    documents: (files: File[]) => {
      if (files.length === 0) return 'At least one document is required';
      
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      for (const file of files) {
        if (!allowedTypes.includes(file.type)) {
          return 'Only PDF, DOC, DOCX, JPG, and PNG files are allowed';
        }
        if (file.size > maxSize) {
          return 'Each file must be less than 10MB';
        }
      }
      return '';
    }
  };

  // Real-time validation
  const validateField = (field: string, value: any) => {
    const rule = validationRules[field as keyof typeof validationRules];
    return rule ? rule(value) : '';
  };

  // Check if field is completed
  const isFieldCompleted = (field: string, value: any) => {
    if (field === 'documents') {
      return Array.isArray(value) && value.length > 0 && !validateField(field, value);
    }
    if (typeof value === 'string' && !value.trim()) return false;
    const error = validateField(field, value);
    return !error;
  };

  // Handle input change with validation
  const handleInputChange = (field: keyof NewCaseFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Reset application category when application type changes
    if (field === 'applicationType') {
      setFormData(prev => ({ ...prev, applicationCategory: '' }));
      setErrors(prev => ({ ...prev, applicationCategory: '' }));
    }
    
    // Mark field as touched
    setTouched(prev => new Set(prev).add(field));
    
    // Validate field
    const error = validateField(field, value);
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));

    // Clear any submit errors when user starts typing
    if (submitError) {
      setSubmitError(null);
    }
  };

  // Handle field blur
  const handleFieldBlur = (field: string) => {
    setTouched(prev => new Set(prev).add(field));
  };

  // Format phone number
  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      const parts = [match[1], match[2], match[3]].filter(Boolean);
      return parts.join('-');
    }
    return cleaned;
  };

  // Handle phone number change with formatting
  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    handleInputChange('phoneNumber', formatted);
  };

  // File handling functions
  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files);
    const updatedFiles = [...formData.documents, ...newFiles];
    
    setFormData(prev => ({ ...prev, documents: updatedFiles }));
    setTouched(prev => new Set(prev).add('documents'));
    
    // Generate preview URLs for images
    newFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreviewUrls(prev => ({
            ...prev,
            [file.name]: e.target?.result as string
          }));
        };
        reader.readAsDataURL(file);
      }
    });
    
    // Simulate upload progress for each file
    newFiles.forEach(file => {
      const fileName = file.name;
      setFileUploadStatus(prev => ({
        ...prev,
        [fileName]: { progress: 0, status: 'uploading' }
      }));
      
      // Simulate upload progress with proper state management
      let progress = 0;
      const simulateUpload = () => {
        progress += 10;
        setFileUploadStatus(prev => {
          if (progress >= 100) {
            return {
              ...prev,
              [fileName]: { progress: 100, status: 'success' }
            };
          } else {
            return {
              ...prev,
              [fileName]: { progress, status: 'uploading' }
            };
          }
        });
        
        if (progress < 100) {
          setTimeout(simulateUpload, 200);
        }
      };
      
      // Start the simulation immediately
      simulateUpload();
    });
    
    // Validate files
    const error = validateField('documents', updatedFiles);
    setErrors(prev => ({
      ...prev,
      documents: error
    }));
  };

  const handleFileRemove = (index: number) => {
    const fileToRemove = formData.documents[index];
    const updatedFiles = formData.documents.filter((_, i) => i !== index);
    const updatedDescriptions = formData.documentDescriptions.filter((_, i) => i !== index);
    
    // Clean up preview URL and upload status
    if (fileToRemove) {
      setFilePreviewUrls(prev => {
        const newUrls = { ...prev };
        delete newUrls[fileToRemove.name];
        return newUrls;
      });
      setFileUploadStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[fileToRemove.name];
        return newStatus;
      });
    }
    
    setFormData(prev => ({ 
      ...prev, 
      documents: updatedFiles,
      documentDescriptions: updatedDescriptions
    }));
    
    // Validate files
    const error = validateField('documents', updatedFiles);
    setErrors(prev => ({
      ...prev,
      documents: error
    }));
  };

  const handleDescriptionChange = (index: number, description: string) => {
    const updatedDescriptions = [...formData.documentDescriptions];
    updatedDescriptions[index] = description;
    setFormData(prev => ({ ...prev, documentDescriptions: updatedDescriptions }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('image')) return '🖼️';
    return '📎';
  };

  const renderFilePreview = React.useMemo(() => {
    return (file: File) => {
      const previewUrl = filePreviewUrls[file.name];
      
      if (file.type.startsWith('image/') && previewUrl) {
        return (
          <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
            <img 
              src={previewUrl} 
              alt={file.name}
              className="w-full h-full object-cover"
            />
          </div>
        );
      }
      
      return (
        <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
          <span className="text-2xl">{getFileIcon(file.type)}</span>
        </div>
      );
    };
  }, [filePreviewUrls]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploading': return 'text-emerald-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading': return '⏳';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '📎';
    }
  };

  // Validate entire form
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    Object.keys(validationRules).forEach(field => {
      const value = formData[field as keyof NewCaseFormData] as string;
      const error = validateField(field, value);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any previous errors
    setSubmitError(null);
    setSubmitSuccess(null);
    
    // Mark all fields as touched
    const allFields = Object.keys(formData);
    setTouched(new Set(allFields));
    
    // Validate form
    if (!validateForm()) {
      console.log('Form validation failed:', errors);
      setSubmitError('Please fix the validation errors before submitting.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Transform form data to match backend ApplicationData interface
      const applicationData: ApplicationData = {
        applicantName: formData.applicantName,
        applicantEmail: formData.applicantEmail,
        applicationType: formData.applicationType,
        submissionDate: new Date(),
        documents: formData.documents.map((file, index) => ({
          id: `doc_${Date.now()}_${index}`,
          filename: file.name,
          path: `/uploads/${file.name}`, // This would be set by backend after upload
          uploadedAt: new Date(),
          size: file.size,
          mimeType: file.type
        })),
        formData: {
          applicantFirm: formData.applicantFirm,
          phoneNumber: formData.phoneNumber,
          dateOfBirth: formData.dateOfBirth,
          streetAddress: formData.streetAddress,
          city: formData.city,
          stateProvince: formData.stateProvince,
          postalCode: formData.postalCode,
          country: formData.country,
          applicationCategory: formData.applicationCategory,
          caseSummary: formData.caseSummary,
          documentDescriptions: formData.documentDescriptions
        }
      };

      console.log('Submitting application data:', applicationData);
      
      // Submit to backend API with timeout handling
      const newCase = await caseService.createCase(applicationData);
      
      console.log('Case created successfully:', newCase);
      
      // Show success message
      setSubmitSuccess(`Case created successfully! Case ID: ${newCase.id}`);
      
      // Redirect to case detail page after a short delay
      setTimeout(() => {
        navigate(`/cases/${newCase.id}`);
      }, 2000);
      
    } catch (error) {
      console.error('Form submission failed:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to submit application. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. The server is processing your application. Please wait a moment and check if your case was created.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      applicantName: '',
      applicantFirm: '',
      applicantEmail: '',
      phoneNumber: '',
      dateOfBirth: '',
      streetAddress: '',
      city: '',
      stateProvince: '',
      postalCode: '',
      country: '',
      applicationType: '',
      applicationCategory: '',
      caseSummary: '',
      documents: [],
      documentDescriptions: []
    });
    setErrors({});
    setTouched(new Set());
    setFileUploadStatus({});
    setFilePreviewUrls({});
    setAiInsights(null);
    setIsAnalyzing(false);
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  // Calculate completion percentage for current step
  const currentStepFields = ['applicantName', 'applicantFirm', 'applicantEmail', 'phoneNumber', 'dateOfBirth', 'streetAddress', 'city', 'stateProvince', 'postalCode', 'country', 'applicationType', 'applicationCategory', 'caseSummary', 'documents'];
  const completedFields = currentStepFields.filter(field => 
    isFieldCompleted(field, formData[field as keyof NewCaseFormData] as string)
  );
  const completionPercentage = Math.round((completedFields.length / currentStepFields.length) * 100);

  // Helper function to get category options based on application type
  const getCategoryOptions = (applicationType: string) => {
    switch (applicationType) {
      case 'visa':
        return [
          { value: "tourist", label: "Tourist Visa" },
          { value: "business", label: "Business Visa" },
          { value: "student", label: "Student Visa" },
          { value: "work", label: "Work Visa" },
          { value: "family", label: "Family Visa" }
        ];
      case 'work_permit':
        return [
          { value: "skilled_worker", label: "Skilled Worker" },
          { value: "temporary_worker", label: "Temporary Worker" },
          { value: "seasonal_worker", label: "Seasonal Worker" },
          { value: "intracompany", label: "Intra-company Transfer" }
        ];
      case 'residence_permit':
        return [
          { value: "permanent", label: "Permanent Residence" },
          { value: "temporary", label: "Temporary Residence" },
          { value: "family", label: "Family Residence" },
          { value: "refugee", label: "Refugee Status" }
        ];
      case 'citizenship':
        return [
          { value: "naturalization", label: "Naturalization" },
          { value: "birth", label: "Birth Right" },
          { value: "marriage", label: "Marriage" },
          { value: "investment", label: "Investment" }
        ];
      case 'other':
        return [
          { value: "special_case", label: "Special Case" },
          { value: "appeal", label: "Appeal" },
          { value: "renewal", label: "Renewal" }
        ];
      default:
        return [];
    }
  };

  // Helper function to get processing time based on type and category
  const getProcessingTime = (applicationType: string, applicationCategory: string) => {
    const processingTimes: { [key: string]: { [key: string]: string } } = {
      visa: {
        tourist: "2-4 weeks",
        business: "4-8 weeks",
        student: "6-12 weeks",
        work: "8-16 weeks"
      },
      work_permit: {
        skilled_worker: "8-16 weeks",
        temporary_worker: "4-8 weeks",
        seasonal_worker: "2-6 weeks",
        intracompany: "6-12 weeks"
      },
      residence_permit: {
        permanent: "12-24 months",
        temporary: "6-12 months",
        family: "8-16 months",
        refugee: "18-36 months"
      },
      citizenship: {
        naturalization: "12-18 months",
        birth: "6-12 months",
        marriage: "8-16 months",
        investment: "12-24 months"
      },
      other: {
        special_case: "Varies",
        appeal: "6-12 months",
        renewal: "2-4 weeks"
      }
    };
    
    return processingTimes[applicationType]?.[applicationCategory] || "Processing time varies";
  };

  // AI Analysis function
  const analyzeApplication = async () => {
    setIsAnalyzing(true);
    setSubmitError(null);
    
    try {
      // Transform form data to match backend ApplicationData interface
      // Flatten the structure instead of nesting in formData
      const applicationData: ApplicationData = {
        applicantName: formData.applicantName,
        applicantEmail: formData.applicantEmail,
        applicationType: formData.applicationType,
        submissionDate: new Date(),
        documents: formData.documents.map((file, index) => ({
          id: `doc_${Date.now()}_${index}`,
          filename: file.name,
          path: `/uploads/${file.name}`,
          uploadedAt: new Date(),
          size: file.size,
          mimeType: file.type
        })),
        // Flatten all form fields into formData instead of nesting
        formData: {
          applicantFirm: formData.applicantFirm,
          phoneNumber: formData.phoneNumber,
          dateOfBirth: formData.dateOfBirth,
          streetAddress: formData.streetAddress,
          city: formData.city,
          stateProvince: formData.stateProvince,
          postalCode: formData.postalCode,
          country: formData.country,
          applicationCategory: formData.applicationCategory,
          caseSummary: formData.caseSummary,
          documentDescriptions: formData.documentDescriptions
        }
      };

      console.log('Sending application data to backend:', applicationData);

      // Call the real AI analysis endpoint
      const analysis = await caseService.analyzeApplication(applicationData);
      
      console.log('Received analysis from backend:', analysis);
      
      // Transform the analysis response to match our frontend format
      // The backend returns ApplicationAnalysis interface
      const completeness = analysis.completenessScore || 
                         (analysis.requiredDocuments ? 
                          Math.max(0, 100 - (analysis.requiredDocuments.length * 10)) : 0);
      const suggestions = analysis.recommendedActions || [];
      const riskLevel = analysis.priorityLevel === 'urgent' ? 'high' : 
                       analysis.priorityLevel === 'high' ? 'high' : 
                       analysis.priorityLevel === 'medium' ? 'medium' : 'low';
      
      setAiInsights({
        completeness,
        suggestions,
        riskLevel,
        estimatedProcessingTime: analysis.estimatedProcessingTime || getProcessingTime(formData.applicationType, formData.applicationCategory)
      });
      
    } catch (error) {
      console.error('AI analysis failed:', error);
      
      // Show error message to user
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to analyze application. Please try again.';
      
      setSubmitError(`AI Analysis failed: ${errorMessage}`);
      
      // Fallback to simulation if AI analysis fails
      const requiredFields = [
        'applicantName', 'applicantFirm', 'applicantEmail', 'phoneNumber',
        'dateOfBirth', 'streetAddress', 'city', 'stateProvince', 'postalCode',
        'country', 'applicationType', 'applicationCategory', 'caseSummary'
      ];
      
      const completedFields = requiredFields.filter(field => {
        const value = formData[field as keyof NewCaseFormData];
        return typeof value === 'string' ? value.trim() !== '' : Array.isArray(value) ? value.length > 0 : false;
      });
      
      const completeness = Math.round((completedFields.length / requiredFields.length) * 100);
      
      const suggestions: string[] = [];
      if (!formData.applicantName.trim()) suggestions.push('Add the applicant\'s full name');
      if (!formData.applicantFirm.trim()) suggestions.push('Include the applicant\'s firm or organization');
      if (!formData.applicantEmail.trim()) suggestions.push('Include a valid email address for communication');
      if (!formData.phoneNumber.trim()) suggestions.push('Add a contact phone number');
      if (!formData.dateOfBirth.trim()) suggestions.push('Provide the applicant\'s date of birth');
      if (!formData.streetAddress.trim()) suggestions.push('Complete the address information');
      if (!formData.city.trim()) suggestions.push('Specify the city');
      if (!formData.stateProvince.trim()) suggestions.push('Specify the state or province');
      if (!formData.postalCode.trim()) suggestions.push('Include the postal code');
      if (!formData.country.trim()) suggestions.push('Specify the country');
      if (!formData.applicationCategory.trim()) suggestions.push('Select an application category');
      if (!formData.caseSummary.trim()) suggestions.push('Provide a detailed case summary');
      if (formData.documents.length === 0) suggestions.push('Upload supporting documents');
      if (formData.caseSummary.trim().length < 50) suggestions.push('Expand the case summary with more details');
      
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (completeness < 60) riskLevel = 'high';
      else if (completeness < 80) riskLevel = 'medium';
      
      if (!formData.applicantEmail.trim() || !formData.phoneNumber.trim()) {
        riskLevel = riskLevel === 'low' ? 'medium' : 'high';
      }
      if (formData.documents.length === 0) {
        riskLevel = 'high';
      }
      
      setAiInsights({
        completeness,
        suggestions,
        riskLevel,
        estimatedProcessingTime: getProcessingTime(formData.applicationType, formData.applicationCategory)
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <style dangerouslySetInnerHTML={{
        __html: `
          .newcase-form input:focus {
            --tw-ring-color: rgb(22 163 74) !important;
            --tw-ring-opacity: 1 !important;
          }
          .newcase-form textarea:focus {
            --tw-ring-color: rgb(22 163 74) !important;
            --tw-ring-opacity: 1 !important;
          }
          .field-completed {
            --tw-ring-color: rgb(34 197 94) !important;
            --tw-border-opacity: 1 !important;
            border-color: rgb(34 197 94) !important;
          }
        `
      }} />
      <div className="relative">
        <div className="relative px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">Send in an application</h2>
            <p className="text-gray-600 text-center">Submit a new application for processing</p>
          </div>

          {/* Success/Error Messages */}
          {submitSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{submitSuccess}</p>
                  <p className="text-sm text-green-700 mt-1">Redirecting to case details...</p>
                </div>
              </div>
            </div>
          )}

          {submitError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{submitError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {formSteps.map((_, index) => (
                <div key={index} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                    index <= 4 
                      ? 'bg-green-600 text-white shadow-lg' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  {index < formSteps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-3 transition-all duration-200 ${
                      index <= 3 ? 'bg-green-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center mt-4">
              <span className="text-sm font-medium text-green-600">Step 5 of 5: {formSteps[4]}</span>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 mt-1 block">
                  {completedFields.length} of {currentStepFields.length} fields completed
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 newcase-form">
            {/* Section 1: Applicant Information */}
            <Card className="relative overflow-hidden border-0 shadow-xl">
              {/* Accent border */}
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-600 to-emerald-600" />
              
              <div className="px-8 py-8">
                {/* Section Header */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">1. Applicant Information</h3>
                  <p className="text-gray-600">Provide the applicant's personal and contact details</p>
                </div>
                
                {/* Personal Information Subsection */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Applicant Name */}
                    <div className="relative">
                      <label htmlFor="applicantName" className="block text-sm font-semibold text-gray-700 mb-2">
                        Applicant Name *
                      </label>
                      <div className="relative">
                        <Input
                          id="applicantName"
                          type="text"
                          value={formData.applicantName}
                          onChange={(e) => handleInputChange('applicantName', e.target.value)}
                          onBlur={() => handleFieldBlur('applicantName')}
                          placeholder="Enter applicant's full name"
                          required
                          error={touched.has('applicantName') ? errors.applicantName : undefined}
                          className={isFieldCompleted('applicantName', formData.applicantName) ? 'field-completed' : ''}
                        />
                        {isFieldCompleted('applicantName', formData.applicantName) && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <span className="text-green-600 text-lg">✓</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Applicant Firm */}
                    <div className="relative">
                      <label htmlFor="applicantFirm" className="block text-sm font-semibold text-gray-700 mb-2">
                        Applicant Firm *
                      </label>
                      <div className="relative">
                        <Input
                          id="applicantFirm"
                          type="text"
                          value={formData.applicantFirm}
                          onChange={(e) => handleInputChange('applicantFirm', e.target.value)}
                          onBlur={() => handleFieldBlur('applicantFirm')}
                          placeholder="Enter firm or company name"
                          required
                          error={touched.has('applicantFirm') ? errors.applicantFirm : undefined}
                          className={isFieldCompleted('applicantFirm', formData.applicantFirm) ? 'field-completed' : ''}
                        />
                        {isFieldCompleted('applicantFirm', formData.applicantFirm) && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <span className="text-green-600 text-lg">✓</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Applicant Email */}
                    <div className="relative">
                      <label htmlFor="applicantEmail" className="block text-sm font-semibold text-gray-700 mb-2">
                        Applicant Email *
                      </label>
                      <div className="relative">
                        <Input
                          id="applicantEmail"
                          type="email"
                          value={formData.applicantEmail}
                          onChange={(e) => handleInputChange('applicantEmail', e.target.value)}
                          onBlur={() => handleFieldBlur('applicantEmail')}
                          placeholder="Enter email address"
                          required
                          error={touched.has('applicantEmail') ? errors.applicantEmail : undefined}
                          className={isFieldCompleted('applicantEmail', formData.applicantEmail) ? 'field-completed' : ''}
                        />
                        {isFieldCompleted('applicantEmail', formData.applicantEmail) && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <span className="text-green-600 text-lg">✓</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div className="relative">
                      <label htmlFor="phoneNumber" className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Input
                          id="phoneNumber"
                          type="tel"
                          value={formData.phoneNumber}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          onBlur={() => handleFieldBlur('phoneNumber')}
                          placeholder="Enter phone number"
                          error={touched.has('phoneNumber') ? errors.phoneNumber : undefined}
                          className={isFieldCompleted('phoneNumber', formData.phoneNumber) ? 'field-completed' : ''}
                        />
                        {isFieldCompleted('phoneNumber', formData.phoneNumber) && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <span className="text-green-600 text-lg">✓</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Date of Birth */}
                    <div className="relative">
                      <label htmlFor="dateOfBirth" className="block text-sm font-semibold text-gray-700 mb-2">
                        Date of Birth
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none">
                          <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z"/>
                          </svg>
                        </div>
                        <Input
                          id="dateOfBirth"
                          type="text"
                          value={formData.dateOfBirth}
                          onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                          onBlur={() => handleFieldBlur('dateOfBirth')}
                          placeholder="mm/dd/yyyy"
                          error={touched.has('dateOfBirth') ? errors.dateOfBirth : undefined}
                          className={`ps-10 ${isFieldCompleted('dateOfBirth', formData.dateOfBirth) ? 'field-completed' : ''}`}
                        />
                        {isFieldCompleted('dateOfBirth', formData.dateOfBirth) && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <span className="text-green-600 text-lg">✓</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address Information Subsection */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h4>
                  
                  {/* Street Address */}
                  <div className="mb-4">
                    <label htmlFor="streetAddress" className="block text-sm font-semibold text-gray-700 mb-2">
                      Street Address *
                    </label>
                    <div className="relative">
                      <Textarea
                        id="streetAddress"
                        value={formData.streetAddress}
                        onChange={(e) => handleInputChange('streetAddress', e.target.value)}
                        onBlur={() => handleFieldBlur('streetAddress')}
                        placeholder="Enter street address"
                        rows={2}
                        error={touched.has('streetAddress') ? errors.streetAddress : undefined}
                        className={isFieldCompleted('streetAddress', formData.streetAddress) ? 'field-completed' : ''}
                      />
                      {isFieldCompleted('streetAddress', formData.streetAddress) && (
                        <div className="absolute right-3 top-3">
                          <span className="text-green-600 text-lg">✓</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* City, State, Postal Code Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* City */}
                    <div className="relative">
                      <label htmlFor="city" className="block text-sm font-semibold text-gray-700 mb-2">
                        City *
                      </label>
                      <div className="relative">
                        <Input
                          id="city"
                          type="text"
                          value={formData.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          onBlur={() => handleFieldBlur('city')}
                          placeholder="Enter city"
                          error={touched.has('city') ? errors.city : undefined}
                          className={isFieldCompleted('city', formData.city) ? 'field-completed' : ''}
                        />
                        {isFieldCompleted('city', formData.city) && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <span className="text-green-600 text-lg">✓</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* State/Province */}
                    <div className="relative">
                      <label htmlFor="stateProvince" className="block text-sm font-semibold text-gray-700 mb-2">
                        State/Province *
                      </label>
                      <div className="relative">
                        <Input
                          id="stateProvince"
                          type="text"
                          value={formData.stateProvince}
                          onChange={(e) => handleInputChange('stateProvince', e.target.value)}
                          onBlur={() => handleFieldBlur('stateProvince')}
                          placeholder="Enter state/province"
                          error={touched.has('stateProvince') ? errors.stateProvince : undefined}
                          className={isFieldCompleted('stateProvince', formData.stateProvince) ? 'field-completed' : ''}
                        />
                        {isFieldCompleted('stateProvince', formData.stateProvince) && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <span className="text-green-600 text-lg">✓</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Postal Code */}
                    <div className="relative">
                      <label htmlFor="postalCode" className="block text-sm font-semibold text-gray-700 mb-2">
                        Postal Code *
                      </label>
                      <div className="relative">
                        <Input
                          id="postalCode"
                          type="text"
                          value={formData.postalCode}
                          onChange={(e) => handleInputChange('postalCode', e.target.value)}
                          onBlur={() => handleFieldBlur('postalCode')}
                          placeholder="Enter postal code"
                          error={touched.has('postalCode') ? errors.postalCode : undefined}
                          className={isFieldCompleted('postalCode', formData.postalCode) ? 'field-completed' : ''}
                        />
                        {isFieldCompleted('postalCode', formData.postalCode) && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <span className="text-green-600 text-lg">✓</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Country */}
                  <div className="relative">
                    <label htmlFor="country" className="block text-sm font-semibold text-gray-700 mb-2">
                      Country *
                    </label>
                    <div className="relative">
                      <Select
                        id="country"
                        value={formData.country}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        onBlur={() => handleFieldBlur('country')}
                        error={touched.has('country') ? errors.country : undefined}
                        className={isFieldCompleted('country', formData.country) ? 'field-completed' : ''}
                        placeholder="Select country"
                        options={[
                          { value: "US", label: "United States" },
                          { value: "CA", label: "Canada" },
                          { value: "GB", label: "United Kingdom" },
                          { value: "DE", label: "Germany" },
                          { value: "FR", label: "France" },
                          { value: "AU", label: "Australia" },
                          { value: "JP", label: "Japan" },
                          { value: "CN", label: "China" },
                          { value: "IN", label: "India" },
                          { value: "BR", label: "Brazil" },
                          { value: "MX", label: "Mexico" },
                          { value: "OTHER", label: "Other" }
                        ]}
                      />
                      {isFieldCompleted('country', formData.country) && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <span className="text-green-600 text-lg">✓</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Section 2: Application Details */}
            <Card className="relative overflow-hidden border-0 shadow-xl">
              {/* Accent border */}
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-600 to-emerald-600" />
              
              <div className="px-8 py-8">
                {/* Section Header */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">2. Application Details</h3>
                  <p className="text-gray-600">Specify the type and category of your application</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Application Type */}
                  <div className="relative">
                    <label htmlFor="applicationType" className="block text-sm font-semibold text-gray-700 mb-2">
                      Application Type *
                    </label>
                    <div className="relative">
                      <Select
                        id="applicationType"
                        value={formData.applicationType}
                        onChange={(e) => handleInputChange('applicationType', e.target.value)}
                        onBlur={() => handleFieldBlur('applicationType')}
                        error={touched.has('applicationType') ? errors.applicationType : undefined}
                        className={isFieldCompleted('applicationType', formData.applicationType) ? 'field-completed' : ''}
                        placeholder="Select application type"
                        options={[
                          { value: "visa", label: "Visa Application" },
                          { value: "work_permit", label: "Work Permit" },
                          { value: "residence_permit", label: "Residence Permit" },
                          { value: "citizenship", label: "Citizenship" },
                          { value: "other", label: "Other" }
                        ]}
                      />
                      {isFieldCompleted('applicationType', formData.applicationType) && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <span className="text-green-600 text-lg">✓</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Application Category */}
                  <div className="relative">
                    <label htmlFor="applicationCategory" className="block text-sm font-semibold text-gray-700 mb-2">
                      Application Category *
                    </label>
                    <div className="relative">
                      <Select
                        id="applicationCategory"
                        value={formData.applicationCategory}
                        onChange={(e) => handleInputChange('applicationCategory', e.target.value)}
                        onBlur={() => handleFieldBlur('applicationCategory')}
                        error={touched.has('applicationCategory') ? errors.applicationCategory : undefined}
                        className={isFieldCompleted('applicationCategory', formData.applicationCategory) ? 'field-completed' : ''}
                        placeholder="Select category"
                        options={getCategoryOptions(formData.applicationType)}
                      />
                      {isFieldCompleted('applicationCategory', formData.applicationCategory) && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <span className="text-green-600 text-lg">✓</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                                 {/* Expected Processing Time */}
                 <div className="mt-6">
                   <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                     <div className="flex items-center">
                       <div className="flex-shrink-0">
                         <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                           <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                         </svg>
                       </div>
                       <div className="ml-3">
                         <h4 className="text-sm font-medium text-green-800">Expected Processing Time</h4>
                         <p className="text-sm text-green-700 mt-1">
                           {getProcessingTime(formData.applicationType, formData.applicationCategory)}
                         </p>
                       </div>
                     </div>
                   </div>
                 </div>
              </div>
            </Card>

            {/* Section 3: Case Description */}
            <Card className="relative overflow-hidden border-0 shadow-xl">
              {/* Accent border */}
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-600 to-emerald-600" />
              
              <div className="px-8 py-8">
                {/* Section Header */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">3. Case Description</h3>
                  <p className="text-gray-600">Provide a detailed description of your case and circumstances</p>
                </div>
                
                {/* Case Summary */}
                <div className="relative">
                  <label htmlFor="caseSummary" className="block text-sm font-semibold text-gray-700 mb-2">
                    Case Summary *
                  </label>
                  <div className="relative">
                    <Textarea
                      id="caseSummary"
                      value={formData.caseSummary}
                      onChange={(e) => handleInputChange('caseSummary', e.target.value)}
                      onBlur={() => handleFieldBlur('caseSummary')}
                      placeholder="Describe your case in detail, including the circumstances, reasons for application, and any relevant background information..."
                      rows={6}
                      error={touched.has('caseSummary') ? errors.caseSummary : undefined}
                      className={isFieldCompleted('caseSummary', formData.caseSummary) ? 'field-completed' : ''}
                    />
                    {isFieldCompleted('caseSummary', formData.caseSummary) && (
                      <div className="absolute right-3 top-3">
                        <span className="text-green-600 text-lg">✓</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Character count */}
                  <div className="mt-2 text-xs text-gray-500">
                    {formData.caseSummary.length}/2000 characters
                  </div>
                </div>
              </div>
            </Card>

            {/* Section 4: Document Upload */}
            <Card className="relative overflow-hidden border-0 shadow-xl">
              {/* Accent border */}
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-600 to-emerald-600" />
              
              <div className="px-8 py-8">
                {/* Section Header */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">4. Document Upload</h3>
                  <p className="text-gray-600">Upload supporting documents for your application</p>
                </div>
                
                {/* File Upload Area */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Supporting Documents *
                  </label>
                  
                  {/* Upload Zone */}
                  <div 
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                      touched.has('documents') && errors.documents 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('border-green-400', 'bg-green-50');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-green-400', 'bg-green-50');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-green-400', 'bg-green-50');
                      handleFileUpload(e.dataTransfer.files);
                    }}
                  >
                    <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                      <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      Drop files here or click to upload
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      PDF, DOC, DOCX, JPG, PNG files up to 10MB each
                    </p>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e.target.files)}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 cursor-pointer"
                    >
                      Choose Files
                    </label>
                  </div>
                  
                  {/* Error Message */}
                  {touched.has('documents') && errors.documents && (
                    <p className="mt-2 text-sm text-red-600">{errors.documents}</p>
                  )}
                </div>
                
                {/* File List */}
                {formData.documents.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900">Uploaded Documents</h4>
                    {formData.documents.map((file, index) => {
                      const uploadStatus = fileUploadStatus[file.name];
                      const isUploading = uploadStatus?.status === 'uploading';
                      const isSuccess = uploadStatus?.status === 'success';
                      const isError = uploadStatus?.status === 'error';
                      
                      return (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                          <div className="flex items-start space-x-4">
                            {/* File Preview */}
                            <div className="flex-shrink-0">
                              {renderFilePreview(file)}
                            </div>
                            
                            {/* File Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                </div>
                                
                                {/* Status Indicator */}
                                <div className="flex items-center space-x-2 ml-4">
                                  <span className={`text-sm ${getStatusColor(uploadStatus?.status || 'default')}`}>
                                    {getStatusIcon(uploadStatus?.status || 'default')}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleFileRemove(index)}
                                    className="text-red-600 hover:text-red-800 p-1"
                                  >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              
                              {/* Progress Bar */}
                              {isUploading && (
                                <div className="mb-3">
                                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                    <span>Uploading...</span>
                                    <span>{uploadStatus?.progress || 0}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-emerald-600 h-2 rounded-full transition-all duration-300" 
                                      style={{ width: `${uploadStatus?.progress || 0}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                              
                              {/* Success/Error Message */}
                              {isSuccess && (
                                <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-md">
                                  <div className="flex items-center">
                                    <span className="text-green-600 mr-2">✅</span>
                                    <span className="text-sm text-green-800">Upload complete</span>
                                  </div>
                                </div>
                              )}
                              
                              {isError && (
                                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md">
                                  <div className="flex items-center">
                                    <span className="text-red-600 mr-2">❌</span>
                                    <span className="text-sm text-red-800">{uploadStatus?.error || 'Upload failed'}</span>
                                  </div>
                                </div>
                              )}
                              
                              {/* Description Input */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Document Description (optional)
                                </label>
                                <Input
                                  type="text"
                                  value={formData.documentDescriptions[index] || ''}
                                  onChange={(e) => handleDescriptionChange(index, e.target.value)}
                                  placeholder="Brief description of this document..."
                                  className="text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Upload Summary */}
                {formData.documents.length > 0 && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3 flex-1">
                        <h4 className="text-sm font-medium text-green-800">Documents Ready</h4>
                        <div className="text-sm text-green-700 mt-1">
                          <p>{formData.documents.length} document{formData.documents.length !== 1 ? 's' : ''} uploaded successfully</p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {(() => {
                              const fileTypes = formData.documents.reduce((acc, file) => {
                                const type = file.type.split('/')[1]?.toUpperCase() || 'OTHER';
                                acc[type] = (acc[type] || 0) + 1;
                                return acc;
                              }, {} as { [key: string]: number });
                              
                              return Object.entries(fileTypes).map(([type, count]) => (
                                <span key={type} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {count} {type}
                                </span>
                              ));
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Section 5: AI Review */}
            <Card className="relative overflow-hidden border-0 shadow-xl">
              {/* Accent border */}
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-600 to-green-600" />
              
              <div className="px-8 py-8">
                {/* Section Header */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">5. AI Review</h3>
                  <p className="text-gray-600">Get intelligent insights about your application completeness and recommendations</p>
                </div>

                {/* AI Analysis Trigger */}
                <div className="mb-6">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={analyzeApplication}
                    disabled={isAnalyzing}
                    className="flex items-center space-x-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Analyzing Application...</span>
                      </>
                    ) : (
                      <>
                        <span>🤖</span>
                        <span>Analyze Application</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* AI Insights Display */}
                {aiInsights && (
                  <div className="space-y-6">
                    {/* Completeness Score */}
                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-6 border border-emerald-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900">Application Completeness</h4>
                        <span className="text-2xl font-bold text-emerald-600">{aiInsights.completeness}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-500 ${
                            aiInsights.completeness >= 80 ? 'bg-green-500' :
                            aiInsights.completeness >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${aiInsights.completeness}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        {aiInsights.completeness >= 80 ? 'Excellent! Your application is well-prepared.' :
                         aiInsights.completeness >= 60 ? 'Good progress, but some improvements needed.' :
                         'Please complete the missing information to improve your application.'}
                      </p>
                    </div>

                    {/* Risk Assessment */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900">Risk Assessment</h4>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          aiInsights.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                          aiInsights.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {aiInsights.riskLevel.toUpperCase()} RISK
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {aiInsights.riskLevel === 'low' ? 'Your application has a low risk of delays or issues.' :
                         aiInsights.riskLevel === 'medium' ? 'Your application has moderate risk factors that could be improved.' :
                         'Your application has several risk factors that should be addressed before submission.'}
                      </p>
                    </div>

                    {/* Processing Time Estimate */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Estimated Processing Time</h4>
                      <p className="text-2xl font-bold text-green-600 mb-2">{aiInsights.estimatedProcessingTime}</p>
                      <p className="text-sm text-gray-600">
                        Based on your application type and category selection
                      </p>
                    </div>

                    {/* Suggestions */}
                    {aiInsights.suggestions.length > 0 && (
                      <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h4>
                        <div className="space-y-3">
                          {aiInsights.suggestions.map((suggestion, index) => (
                            <div key={index} className="flex items-start space-x-3">
                              <div className="flex-shrink-0 mt-1">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                              </div>
                              <p className="text-sm text-gray-700">{suggestion}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Success Message */}
                    {aiInsights.completeness >= 80 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h4 className="text-sm font-medium text-green-800">Ready for Submission</h4>
                            <p className="text-sm text-green-700 mt-1">
                              Your application looks complete and well-prepared for submission!
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Initial State */}
                {!aiInsights && !isAnalyzing && (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">🤖</div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">AI-Powered Review</h4>
                    <p className="text-gray-600 mb-6">
                      Get intelligent insights about your application completeness, risk assessment, and personalized recommendations.
                    </p>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <p className="text-sm text-emerald-800">
                        <strong>What the AI will analyze:</strong><br />
                        • Application completeness score<br />
                        • Missing information and documents<br />
                        • Risk assessment for processing delays<br />
                        • Personalized improvement suggestions<br />
                        • Estimated processing time
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Enhanced Form Actions */}
            <div className="bg-gray-50 rounded-lg p-6 flex justify-between items-center shadow-sm">
              <Button
                type="button"
                variant="secondary"
                onClick={handleReset}
                className="flex items-center space-x-2"
                disabled={isSubmitting}
              >
                <span>↺</span>
                <span>Clear Form</span>
              </Button>
              
              <div className="flex space-x-3">
                <Button variant="secondary" disabled={isSubmitting}>
                  <span className="mr-2">💾</span>
                  Save Draft
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex items-center space-x-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Application</span>
                      <span>→</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewCase;