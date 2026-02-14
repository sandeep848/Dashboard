import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Lightbulb, 
  Send, 
  Loader2, 
  TrendingUp, 
  Users, 
  BarChart3, 
  PieChart,
  Calendar,
  Target
} from 'lucide-react';
import { analysisApi } from '@/services/api';
import { useDashboardStore } from '@/store/dashboardStore';

const suggestionExamples = [
  {
    icon: TrendingUp,
    text: "Analyze sales trends over the last quarter and identify top-performing products",
    category: "Sales"
  },
  {
    icon: Users,
    text: "Segment customers by region and analyze their purchasing behavior",
    category: "Customer"
  },
  {
    icon: BarChart3,
    text: "Compare revenue across different product categories and time periods",
    category: "Revenue"
  },
  {
    icon: PieChart,
    text: "Show the distribution of orders by status and payment method",
    category: "Distribution"
  },
  {
    icon: Calendar,
    text: "Identify seasonal patterns in website traffic and conversions",
    category: "Seasonality"
  },
  {
    icon: Target,
    text: "Find correlations between marketing spend and customer acquisition",
    category: "Marketing"
  }
];

const UseCaseInput = () => {
  const [useCase, setUseCase] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    sessionId, 
    schema,
    setUseCase: setStoreUseCase,
    setProcessingRecommendations,
    setCurrentStep,
    setLoading 
  } = useDashboardStore();

  const handleSubmit = async () => {
    if (!useCase.trim() || useCase.length < 10) {
      setError('Please provide a more detailed description (at least 10 characters)');
      return;
    }
    
    if (!sessionId) {
      setError('No active session. Please upload data first.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setLoading(true);
    
    try {
      const response = await analysisApi.submitUseCase(sessionId, useCase);
      
      setStoreUseCase(useCase);
      setProcessingRecommendations(response.recommendations);
      setCurrentStep('processing');
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit use case. Please try again.');
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const handleSuggestionClick = (text: string) => {
    setUseCase(text);
    setError(null);
  };

  const getCharacterCount = () => useCase.length;
  const getMinCharacters = () => 10;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Describe Your Analysis Goal
          </CardTitle>
          <CardDescription>
            Tell us what you want to analyze, and our AI will recommend the best approach
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="use-case">
              What would you like to analyze?
              <span className="text-muted-foreground font-normal ml-2">
                (min {getMinCharacters()} characters)
              </span>
            </Label>
            <Textarea
              id="use-case"
              placeholder="Example: I want to analyze sales trends over the last quarter and identify which product categories are performing best..."
              value={useCase}
              onChange={(e) => {
                setUseCase(e.target.value);
                setError(null);
              }}
              className="min-h-[120px] resize-none"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{getCharacterCount()} characters</span>
              <span className={getCharacterCount() >= getMinCharacters() ? 'text-green-600' : ''}>
                {getCharacterCount() >= getMinCharacters() ? '✓ Minimum reached' : `${getMinCharacters() - getCharacterCount()} more needed`}
              </span>
            </div>
          </div>
          
          {schema && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Available columns:</span>
              {schema.columns.slice(0, 8).map((col) => (
                <Badge key={col.name} variant="secondary" className="text-xs">
                  {col.name}
                </Badge>
              ))}
              {schema.columns.length > 8 && (
                <Badge variant="secondary" className="text-xs">
                  +{schema.columns.length - 8} more
                </Badge>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || getCharacterCount() < getMinCharacters()}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing your request...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Get AI Recommendations
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Suggestions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Need inspiration?</CardTitle>
          <CardDescription>Click on any suggestion to use it as a starting point</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {suggestionExamples.map((suggestion, idx) => {
              const Icon = suggestion.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className="flex items-start gap-3 p-4 rounded-lg border text-left hover:bg-muted/50 hover:border-primary/50 transition-all"
                >
                  <div className="p-2 rounded-md bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Badge variant="outline" className="mb-2 text-xs">
                      {suggestion.category}
                    </Badge>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {suggestion.text}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UseCaseInput;
