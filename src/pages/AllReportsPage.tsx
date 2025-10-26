import { useCallback, useEffect, useState } from 'react';
import { FileText, Search, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { GenerateReportDialog } from '@/components/reports/GenerateReportDialog';
import { reportService, ReportTemplate, GeneratedReport } from '@/services/reportService';
import { AllReportsTable } from '@/components/reports/AllReportsTable';

export function AllReportsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  // Template states
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [totalTemplates, setTotalTemplates] = useState(0);

  // Generated reports states
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [generatedReportsLoading, setGeneratedReportsLoading] = useState(true);


  const fetchTemplates = useCallback(async () => {
    try {
      setTemplatesLoading(true);
      const response = await reportService.getReportTemplates();
      
      if (response.success && response.data) {
        setTemplates(response.data);
        setTotalTemplates(response.total || 0);
      } else {
        toast.error(response.message || 'Failed to fetch templates');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to fetch templates');
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const fetchGeneratedReports = useCallback(async () => {
    try {
      setGeneratedReportsLoading(true);
      const response = await reportService.getGeneratedReports();

      if (response.success && response.data) {
        setGeneratedReports(response.data);
      } else {
        toast.error(response.message || 'Failed to fetch generated reports');
      }
    } catch (error) {
      console.error('Error fetching generated reports:', error);
      toast.error('Failed to fetch generated reports');
    } finally {
      setGeneratedReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchGeneratedReports();
  }, [fetchTemplates, fetchGeneratedReports]);

  const handleReportGenerated = () => {
    // Refresh generated reports list after new report is created
    setTimeout(() => {
      fetchGeneratedReports();
    }, 300);
    
    toast.success('Report generated and downloaded successfully!');
  };

  const handleDownloadGeneratedReport = async (id: number) => {
    try {
      await reportService.downloadGeneratedReport(id);
      toast.success('Download started successfully');
    } catch (error) {
      console.error('Error downloading generated report:', error);
      toast.error('Failed to download report');
    }
  };


  const handleTemplateSelect = (templateId: number) => {
    setSelectedTemplateId(templateId);
    setIsGenerateDialogOpen(true);
  };

  const truncateDescription = (description: string, maxLength: number = 80) => {
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + '...';
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Report Templates */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Report Templates</h2>
            <span className="text-sm text-muted-foreground">
              {totalTemplates} template{totalTemplates !== 1 ? 's' : ''} available
            </span>
          </div>
          
          {templatesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-muted rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-full"></div>
                        <div className="h-3 bg-muted rounded w-2/3"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No templates available</h3>
              <p className="text-muted-foreground">Contact your administrator to add report templates.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto">
              {templates.map((template) => (
                <Card 
                  key={template.id}
                  className="my-2 bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200 cursor-pointer hover:shadow-lg transition-all duration-200 min-w-[280px]"
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-teal-100 rounded-lg flex-shrink-0">
                        <FileText className="h-6 w-6 text-teal-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-teal-900 mb-2">{template.name}</h3>
                        <p className="text-sm text-teal-700 leading-relaxed">
                          {truncateDescription(template.description)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        
        {/* Generate Report Dialog */}
        <GenerateReportDialog
          open={isGenerateDialogOpen}
          onOpenChange={(open) => {
            setIsGenerateDialogOpen(open);
            if (!open) {
              setSelectedTemplateId(null);
            }
          }}
          onReportGenerated={handleReportGenerated}
          selectedTemplateId={selectedTemplateId}
        />

        {/* Generated Reports */}
        {templates.length !== 0 && <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Generated Reports</CardTitle>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search reports..."
                    className="pl-9 w-[250px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {generatedReportsLoading && generatedReports.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2">Loading generated reports...</span>
              </div>
            ) : generatedReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No generated reports found</h3>
                <p className="text-sm text-muted-foreground">
                  Generate a new report using the templates above to get started.
                </p>
              </div>
            ) : (
              <AllReportsTable reports={generatedReports} handleDownloadGeneratedReport={handleDownloadGeneratedReport} />
            )}
          </CardContent>
        </Card>}
      </div>
    </Layout>
  );
}