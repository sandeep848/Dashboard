import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Sparkles, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp,
  Trash2,
  Wand2,
  Filter,
  Calculator,
  Loader2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { processingApi } from '@/services/api';
import { useDashboardStore } from '@/store/dashboardStore';
import type { ProcessingRecommendations } from '@/types';

interface RecommendationCardProps {
  recommendations: ProcessingRecommendations;
}

const RecommendationCard = ({ recommendations }: RecommendationCardProps) => {
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  
  const { 
    sessionId, 
    setProcessedData, 
    setCurrentStep,
    setLoading 
  } = useDashboardStore();

  const handleApplyRecommendations = async () => {
    if (!sessionId) {
      setError('No active session');
      return;
    }
    
    setIsApplying(true);
    setError(null);
    setLoading(true);
    
    try {
      const response = await processingApi.applyProcessing(sessionId, recommendations);
      setProcessedData(response);
      setCurrentStep('visualization');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to apply recommendations');
    } finally {
      setIsApplying(false);
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'fill_nulls': return <Wand2 className="h-4 w-4" />;
      case 'remove_outliers': return <Filter className="h-4 w-4" />;
      case 'convert_type': return <Calculator className="h-4 w-4" />;
      case 'drop_column': return <Trash2 className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'fill_nulls': return 'Fill Missing Values';
      case 'remove_outliers': return 'Remove Outliers';
      case 'convert_type': return 'Convert Data Type';
      case 'drop_column': return 'Drop Column';
      case 'drop_nulls': return 'Drop Null Rows';
      default: return action;
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Processing Recommendations
            </CardTitle>
            <CardDescription className="mt-2">
              {recommendations.explanation}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {recommendations.cleaning_steps.length + recommendations.feature_engineering.length} Actions
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Columns to Keep */}
        {recommendations.columns_to_keep.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Columns to Keep ({recommendations.columns_to_keep.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {recommendations.columns_to_keep.map((col) => (
                <Badge key={col} variant="secondary" className="bg-green-50 text-green-700">
                  {col}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Columns to Drop */}
        {recommendations.columns_to_drop.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <X className="h-4 w-4 text-red-500" />
              Columns to Remove ({recommendations.columns_to_drop.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {recommendations.columns_to_drop.map((col) => (
                <Badge key={col} variant="secondary" className="bg-red-50 text-red-700">
                  {col}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Cleaning Steps */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-blue-500" />
              Data Cleaning Steps ({recommendations.cleaning_steps.length})
            </h4>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-2">
            {recommendations.cleaning_steps.map((step, idx) => (
              <div 
                key={idx} 
                className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
              >
                <div className="p-2 rounded-md bg-primary/10">
                  {getActionIcon(step.action)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getActionLabel(step.action)}</span>
                    <span className="text-muted-foreground">on</span>
                    <Badge variant="outline">{step.column_name}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{step.reason}</p>
                  {step.parameters && Object.keys(step.parameters).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(step.parameters).map(([key, value]) => (
                        <Badge key={key} variant="secondary" className="text-xs">
                          {key}: {String(value)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {recommendations.cleaning_steps.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No cleaning steps recommended</p>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Feature Engineering */}
        {recommendations.feature_engineering.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-purple-500" />
                New Features to Create ({recommendations.feature_engineering.length})
              </h4>
              <div className="space-y-2">
                {recommendations.feature_engineering.map((feature, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start gap-3 p-3 rounded-lg border bg-purple-50/50"
                  >
                    <div className="p-2 rounded-md bg-purple-100">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-100 text-purple-700">{feature.new_column_name}</Badge>
                        <span className="text-muted-foreground">=</span>
                        <span className="text-sm">{feature.operation}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {feature.source_columns.map((col) => (
                          <Badge key={col} variant="outline" className="text-xs">
                            from: {col}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Filtering Criteria */}
        {recommendations.filtering_criteria.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Filter className="h-4 w-4 text-orange-500" />
                Filtering Criteria
              </h4>
              <div className="space-y-2">
                {recommendations.filtering_criteria.map((criteria, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-2 p-2 rounded-lg border bg-orange-50/50"
                  >
                    <Filter className="h-4 w-4 text-orange-500" />
                    <code className="text-sm">{criteria}</code>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
      
      <CardFooter className="flex gap-3">
        <Button 
          onClick={handleApplyRecommendations}
          disabled={isApplying}
          className="flex-1"
        >
          {isApplying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Applying Changes...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Apply All Recommendations
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default RecommendationCard;
