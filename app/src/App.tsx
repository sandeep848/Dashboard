import { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import FileUpload from '@/components/FileUpload';
import DataPreview from '@/components/DataPreview';
import UseCaseInput from '@/components/UseCaseInput';
import RecommendationCard from '@/components/RecommendationCard';
import Dashboard from '@/components/Dashboard';
import { useDashboardStore } from '@/store/dashboardStore';
import { analysisApi, uploadApi, authApi } from '@/services/api';
import { 
  Upload, 
  FileText, 
  Sparkles, 
  Settings, 
  BarChart3, 
  LayoutDashboard,
  ChevronRight,
  Loader2,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthPage from '@/components/AuthPage';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

function App() {
  const [auth, setAuth] = useState<{ token: string; user: { email: string; full_name: string } } | null>(() => {
    const remembered = localStorage.getItem('dashboard-auth');
    const session = sessionStorage.getItem('dashboard-auth');
    const raw = remembered || session;
    return raw ? JSON.parse(raw) : null;
  });

  const handleAuthenticated = (authState: { token: string; user: { email: string; full_name: string } }, rememberMe: boolean) => {
    setAuth(authState);
    if (rememberMe) {
      localStorage.setItem('dashboard-auth', JSON.stringify(authState));
      sessionStorage.removeItem('dashboard-auth');
    } else {
      sessionStorage.setItem('dashboard-auth', JSON.stringify(authState));
      localStorage.removeItem('dashboard-auth');
    }
  };

  const {
    sessionId,
    fileName,
    schema,
    processingRecommendations,
    visualizationRecommendations,
    processedData,
    isLoading,
    currentStep,
    setCurrentStep,
    setVisualizationRecommendations,
    setFileName,
    setSchema,
    setPreview,
    reset,
  } = useDashboardStore();

  useEffect(() => {
    const validateAuth = async () => {
      if (!auth?.token) return;
      try {
        await authApi.me(auth.token);
      } catch {
        setAuth(null);
        localStorage.removeItem('dashboard-auth');
        sessionStorage.removeItem('dashboard-auth');
      }
    };

    validateAuth();
  }, [auth?.token]);

  const handleLogout = async () => {
    try {
      if (auth?.token) {
        await authApi.logout(auth.token);
      }
    } catch {
      // Ignore remote logout failures, clear local session regardless.
    }

    setAuth(null);
    localStorage.removeItem('dashboard-auth');
    sessionStorage.removeItem('dashboard-auth');
    reset();
    toast.success('Logged out');
  };

  if (!auth) {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }


  // Validate persisted session on app load/reload
  useEffect(() => {
    const validateSession = async () => {
      if (!sessionId) return;

      try {
        const sessionData = await uploadApi.getSessionData(sessionId);

        // Rehydrate basic context in case page was refreshed
        setFileName(sessionData.file_name ?? null);
        setSchema(sessionData.schema ?? null);
        setPreview(sessionData.preview ?? []);
      } catch {
        toast.error('Previous session expired. Please upload your file again.');
        reset();
      }
    };

    validateSession();
  }, [sessionId, setFileName, setSchema, setPreview, reset]);

  // Fetch visualization recommendations when processed data is available
  useEffect(() => {
    const fetchVisualizations = async () => {
      if (processedData && sessionId && !visualizationRecommendations) {
        try {
          const response = await analysisApi.getVisualizationSuggestions(sessionId);
          setVisualizationRecommendations(response);
        } catch {
          toast.error('Failed to load visualization suggestions');
        }
      }
    };

    fetchVisualizations();
  }, [processedData, sessionId, visualizationRecommendations, setVisualizationRecommendations]);

  const handleReset = () => {
    if (confirm('Are you sure you want to start over? All progress will be lost.')) {
      reset();
      toast.success('Dashboard reset');
    }
  };

  const steps = [
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'analysis', label: 'Analysis', icon: FileText },
    { id: 'processing', label: 'Processing', icon: Settings },
    { id: 'visualization', label: 'Visualize', icon: BarChart3 },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  const getStepIndex = (step: string) => steps.findIndex((s) => s.id === step);
  const currentStepIndex = getStepIndex(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <div className="py-8">
            <FileUpload onUploadSuccess={() => {}} />
          </div>
        );

      case 'analysis':
        return (
          <div className="space-y-6 py-4">
            <DataPreview />
            <Separator />
            <UseCaseInput />
          </div>
        );

      case 'processing':
        return (
          <div className="py-4">
            {processingRecommendations ? (
              <RecommendationCard recommendations={processingRecommendations} />
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
        );

      case 'visualization':
        return (
          <div className="py-4">
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Data Processing Complete!</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Your data has been processed successfully. The AI is now generating visualization recommendations based on your analysis goal.
              </p>
              
              {processedData && (
                <div className="flex justify-center gap-8 mb-8">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{processedData.row_count.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Rows</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{processedData.column_count}</div>
                    <div className="text-sm text-muted-foreground">Columns</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{processedData.processing_log.length}</div>
                    <div className="text-sm text-muted-foreground">Operations</div>
                  </div>
                </div>
              )}

              <Button 
                size="lg" 
                onClick={() => setCurrentStep('dashboard')}
                disabled={!visualizationRecommendations}
              >
                {visualizationRecommendations ? (
                  <>
                    View Dashboard
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Visualizations...
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'dashboard':
        return (
          <div className="py-4">
            <Dashboard />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary">
                <Database className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">LLM Data Dashboard</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  AI-Powered Data Analysis & Visualization
                </p>
              </div>
            </div>
            
            {sessionId && (
              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="truncate max-w-[150px]">{fileName}</span>
                  {schema && (
                    <span className="text-xs">
                      ({schema.row_count.toLocaleString()} rows)
                    </span>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  New Analysis
                </Button>
                <Button variant="secondary" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        {sessionId && (
          <div className="border-t">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-muted-foreground">
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              
              {/* Step Indicators */}
              <div className="hidden sm:flex items-center justify-between mt-3">
                {steps.map((step, idx) => {
                  const Icon = step.icon;
                  const isActive = idx === currentStepIndex;
                  const isCompleted = idx < currentStepIndex;
                  
                  return (
                    <button
                      key={step.id}
                      onClick={() => {
                        // Only allow navigation to completed steps or current step
                        if (isCompleted || isActive) {
                          setCurrentStep(step.id as any);
                        }
                      }}
                      disabled={!isCompleted && !isActive}
                      className={`
                        flex items-center gap-2 text-sm transition-colors
                        ${isActive ? 'text-primary font-medium' : ''}
                        ${isCompleted ? 'text-muted-foreground hover:text-foreground' : 'text-muted-foreground/50 cursor-not-allowed'}
                      `}
                    >
                      <div className={`
                        p-1.5 rounded-md
                        ${isActive ? 'bg-primary text-primary-foreground' : ''}
                        ${isCompleted ? 'bg-muted' : 'bg-muted/50'}
                      `}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="hidden lg:inline">{step.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Processing...</p>
            </div>
          </div>
        )}
        
        {renderStepContent()}
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Powered by{' '}
              <span className="font-medium">Hugging Face LLM</span>
            </div>
            <div>
              Built with{' '}
              <span className="font-medium">React + FastAPI</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
