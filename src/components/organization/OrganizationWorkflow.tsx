import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Building, CheckCircle, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface OrganizationData {
  orgName: string;
  country: string;
  entityType: string;
  industry: string;
  subIndustry: string;
  businessLegalName: string;
  businessRegistrationNumber: string;
  kybDocuments: File[];
  coManagerEmail: string;
}

const TOTAL_STEPS = 7;

const industries = [
  {
    name: 'Financial Products',
    subIndustries: [
      'Brokerage',
      'Charity & Not-for-profit',
      'Financial Products',
      'Fund Management, SPV & Family Offices',
      'Goods',
      'Holding Entities',
      'Marketplaces & Aggregators',
      'Services'
    ]
  },
  {
    name: 'Technology',
    subIndustries: [
      'Software Development',
      'IT Services',
      'Hardware Manufacturing',
      'Telecommunications',
      'E-commerce'
    ]
  },
  {
    name: 'Healthcare',
    subIndustries: [
      'Pharmaceuticals',
      'Medical Devices',
      'Healthcare Services',
      'Biotechnology'
    ]
  },
  {
    name: 'Manufacturing',
    subIndustries: [
      'Automotive',
      'Textiles',
      'Food & Beverages',
      'Chemicals',
      'Electronics'
    ]
  }
];

const entityTypes = [
  'Public Limited Company (PLC)',
  'Private Limited Company (PTE LTD)',
  'Sole Proprietorship',
  'Partnership',
  'Corporation',
  'Other'
];

export function OrganizationWorkflow() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OrganizationData>({
    orgName: '',
    country: '',
    entityType: '',
    industry: '',
    subIndustry: '',
    businessLegalName: '',
    businessRegistrationNumber: '',
    kybDocuments: [],
    coManagerEmail: '',
  });

  const updateData = (field: keyof OrganizationData, value: string | File[]) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        if (!data.orgName.trim()) {
          toast.error('Please enter your organization name');
          return false;
        }
        return true;
      case 2:
        if (!data.country) {
          toast.error('Please select where your business is incorporated');
          return false;
        }
        return true;
      case 3:
        if (!data.entityType) {
          toast.error('Please select your business entity type');
          return false;
        }
        return true;
      case 4:
        if (!data.industry || !data.subIndustry) {
          toast.error('Please select both industry and sub-industry');
          return false;
        }
        return true;
      case 5:
        if (!data.businessLegalName.trim() || !data.businessRegistrationNumber.trim()) {
          toast.error('Please fill in all business details');
          return false;
        }
        return true;
      case 6:
        if (!data.coManagerEmail.trim()) {
          toast.error('Please enter co-manager email');
          return false;
        }
        if (!isValidEmail(data.coManagerEmail)) {
          toast.error('Please enter a valid email address');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files);
      updateData('kybDocuments', [...data.kybDocuments, ...fileArray]);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = data.kybDocuments.filter((_, i) => i !== index);
    updateData('kybDocuments', newFiles);
  };

  const handleSubmit = async () => {
    try {
      // Here you would typically submit the data to your API
      toast.success('Organization created successfully!');
      setCurrentStep(TOTAL_STEPS);
    } catch {
      toast.error('Failed to create organization');
    }
  };

  const getSelectedIndustry = () => {
    return industries.find(ind => ind.name === data.industry);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Enter your organization details</h2>
              <p className="text-muted-foreground">Let's start by getting your organization name</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name *</Label>
                <Input
                  id="orgName"
                  placeholder="Enter your organization name"
                  value={data.orgName}
                  onChange={(e) => updateData('orgName', e.target.value)}
                  className="text-lg"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Where is your business incorporated?</h2>
              <p className="text-muted-foreground">Select the country where your business is legally registered</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Country of Incorporation *</Label>
                <Select value={data.country} onValueChange={(value) => updateData('country', value)}>
                  <SelectTrigger className="text-lg">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="india">India</SelectItem>
                    <SelectItem value="us">United States</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">What is your business entity type?</h2>
              <p className="text-muted-foreground">Select the legal structure of your business</p>
            </div>
            <div className="space-y-4">
              <RadioGroup
                value={data.entityType}
                onValueChange={(value) => updateData('entityType', value)}
                className="space-y-3"
              >
                {entityTypes.map((type) => (
                  <div key={type} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                    <RadioGroupItem value={type} id={type} />
                    <Label htmlFor={type} className="flex-1 cursor-pointer text-base">
                      {type}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">What industry is your business in?</h2>
              <p className="text-muted-foreground">Help us understand your business sector</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Industry *</Label>
                <Select 
                  value={data.industry} 
                  onValueChange={(value) => {
                    updateData('industry', value);
                    updateData('subIndustry', ''); // Reset sub-industry when industry changes
                  }}
                >
                  <SelectTrigger className="text-lg">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((industry) => (
                      <SelectItem key={industry.name} value={industry.name}>
                        {industry.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {data.industry && (
                <div className="space-y-2">
                  <Label>Sub-Industry *</Label>
                  <Select value={data.subIndustry} onValueChange={(value) => updateData('subIndustry', value)}>
                    <SelectTrigger className="text-lg">
                      <SelectValue placeholder="Select sub-industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {getSelectedIndustry()?.subIndustries.map((subIndustry) => (
                        <SelectItem key={subIndustry} value={subIndustry}>
                          {subIndustry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Add your business details</h2>
              <p className="text-muted-foreground">Provide your legal business information and documentation</p>
            </div>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessLegalName">Business Legal Name *</Label>
                  <Input
                    id="businessLegalName"
                    placeholder="Enter your business legal name"
                    value={data.businessLegalName}
                    onChange={(e) => updateData('businessLegalName', e.target.value)}
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessRegistrationNumber">Business Registration Number *</Label>
                  <Input
                    id="businessRegistrationNumber"
                    placeholder="Enter your business registration number"
                    value={data.businessRegistrationNumber}
                    onChange={(e) => updateData('businessRegistrationNumber', e.target.value)}
                    className="text-lg"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>KYB Documents</Label>
                  <p className="text-sm text-muted-foreground">
                    Upload your Know Your Business documents (Certificate of Incorporation, Tax Registration, etc.)
                  </p>
                </div>

                <div className="space-y-4">
                  <div
                    className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.multiple = true;
                      input.accept = '.pdf,.jpg,.jpeg,.png';
                      input.onchange = (e) => {
                        const files = (e.target as HTMLInputElement).files;
                        handleFileUpload(files);
                      };
                      input.click();
                    }}
                  >
                    <Upload className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <p className="text-lg font-medium mb-2">Upload KYB Documents</p>
                    <p className="text-sm text-muted-foreground">
                      Drag and drop your documents here, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Supported formats: PDF, JPG, PNG
                    </p>
                  </div>

                  {data.kybDocuments.length > 0 && (
                    <div className="space-y-2">
                      <Label>Uploaded Documents</Label>
                      <div className="space-y-2">
                        {data.kybDocuments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-3">
                              <Upload className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{file.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({(file.size / 1024 / 1024).toFixed(2)} MB)
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Add organization co-manager</h2>
              <p className="text-muted-foreground">
                Add a user who will help manage this organization
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="coManagerEmail">Co-Manager Email Address *</Label>
                <Input
                  id="coManagerEmail"
                  type="email"
                  placeholder="Enter co-manager email address"
                  value={data.coManagerEmail}
                  onChange={(e) => updateData('coManagerEmail', e.target.value)}
                  className="text-lg"
                />
                <p className="text-sm text-muted-foreground">
                  This person will receive an invitation to manage the organization
                </p>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6 text-center">
            <div className="space-y-4">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-green-600">Congratulations!</h2>
                <p className="text-xl font-semibold">Your organization is all set up</p>
                <p className="text-muted-foreground max-w-md mx-auto">
                  We've successfully created your organization "{data.orgName}". 
                  You can now start managing expenses and reports.
                </p>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold">What's next?</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Your co-manager will receive an invitation email</p>
                <p>• You can start creating expense policies</p>
                <p>• Begin adding team members to your organization</p>
                <p>• Set up approval workflows</p>
              </div>
            </div>

            <Button 
              onClick={() => navigate('/expenses')} 
              className="w-full max-w-md"
              size="lg"
            >
              Go to Dashboard
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return data.orgName.trim() !== '';
      case 2:
        return data.country !== '';
      case 3:
        return data.entityType !== '';
      case 4:
        return data.industry !== '' && data.subIndustry !== '';
      case 5:
        return data.businessLegalName.trim() !== '' && data.businessRegistrationNumber.trim() !== '';
      case 6:
        return data.coManagerEmail.trim() !== '' && isValidEmail(data.coManagerEmail);
      case 7:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="w-full">
      <div className="max-w-2xl mx-auto">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Organization Setup</h1>
              <p className="text-muted-foreground">Step {currentStep} of {TOTAL_STEPS}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round((currentStep / TOTAL_STEPS) * 100)}%</span>
            </div>
            <Progress value={(currentStep / TOTAL_STEPS) * 100} className="h-2" />
          </div>
        </div>

        {/* Main Content */}
        <Card className="border-0 shadow-xl">
          <CardContent className="p-8">
            {renderStep()}
          </CardContent>
        </Card>

        {/* Navigation */}
        {currentStep < TOTAL_STEPS && (
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <Button
              onClick={currentStep === 6 ? handleSubmit : handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2"
            >
              {currentStep === 6 ? 'Create Organization' : 'Continue'}
              {currentStep < 6 && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}