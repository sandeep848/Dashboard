import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, FileText, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { uploadApi } from '@/services/api';
import { useDashboardStore } from '@/store/dashboardStore';
import type { LLMInsights } from '@/types';

interface FileUploadProps {
  onUploadSuccess: () => void;
}

const FileUpload = ({ onUploadSuccess }: FileUploadProps) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const { 
    setSessionId, 
    setFileName, 
    setSchema, 
    setPreview, 
    setLLMInsights,
    setCurrentStep,
    setLoading 
  } = useDashboardStore();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    const validTypes = ['.csv', '.xlsx', '.xls', '.json'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(fileExtension)) {
      setUploadError(`Invalid file type. Please upload: ${validTypes.join(', ')}`);
      return;
    }
    
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File size exceeds 50MB limit');
      return;
    }
    
    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90));
    }, 200);
    
    try {
      setLoading(true);
      const response = await uploadApi.uploadFile(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Update store
      setSessionId(response.session_id);
      setFileName(response.file_name);
      setSchema(response.schema);
      setPreview(response.preview);
      
      // Parse LLM insights
      try {
        const insights: LLMInsights = JSON.parse(response.llm_insights);
        setLLMInsights(insights);
      } catch {
        setLLMInsights(null);
      }
      
      // Move to next step
      setTimeout(() => {
        setCurrentStep('analysis');
        onUploadSuccess();
        setIsUploading(false);
        setLoading(false);
      }, 500);
      
    } catch (error: any) {
      clearInterval(progressInterval);
      setIsUploading(false);
      setLoading(false);
      setUploadError(error.response?.data?.detail || 'Upload failed. Please try again.');
    }
  }, [setSessionId, setFileName, setSchema, setPreview, setLLMInsights, setCurrentStep, setLoading, onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json'],
    },
    multiple: false,
  });

  const getFileIcon = () => {
    if (isUploading) return <Loader2 className="h-16 w-16 animate-spin text-primary" />;
    if (isDragActive) return <Upload className="h-16 w-16 text-primary" />;
    return <FileSpreadsheet className="h-16 w-16 text-muted-foreground" />;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Upload className="h-6 w-6" />
          Upload Your Data
        </CardTitle>
        <CardDescription>
          Upload a CSV, Excel, or JSON file to start your AI-powered data analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {uploadError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}
        
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
            transition-all duration-200 ease-in-out
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            ${isDragReject ? 'border-destructive bg-destructive/5' : ''}
            ${isUploading ? 'pointer-events-none opacity-70' : 'hover:border-primary/50 hover:bg-muted/50'}
          `}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center gap-4">
            {getFileIcon()}
            
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isDragActive 
                  ? 'Drop your file here' 
                  : isUploading 
                    ? 'Uploading...' 
                    : 'Drag & drop your file here'}
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse files
              </p>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>Supported: CSV, Excel (.xlsx, .xls), JSON</span>
              <span className="mx-1">•</span>
              <span>Max 50MB</span>
            </div>
          </div>
        </div>
        
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}
        
        <div className="grid grid-cols-3 gap-4 pt-4">
          <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-primary">1</div>
            <div className="text-sm text-muted-foreground text-center">Upload Data</div>
          </div>
          <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-muted-foreground">2</div>
            <div className="text-sm text-muted-foreground text-center">Describe Goal</div>
          </div>
          <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-muted-foreground">3</div>
            <div className="text-sm text-muted-foreground text-center">Get Insights</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUpload;
