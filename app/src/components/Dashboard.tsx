import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  LayoutDashboard, 
  Plus, 
  BarChart3, 
  Download, 
  Settings,
  Loader2,
  Sparkles,
  Database,
  TrendingUp,
  PieChart,
  Activity
} from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { visualizationApi } from '@/services/api';
import ChartContainer from './ChartContainer';
import type { ChartRecommendation } from '@/types';

const Dashboard = () => {
  const [isLoadingCharts, setIsLoadingCharts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('charts');
  const [showChartDialog, setShowChartDialog] = useState(false);
  
  const {
    sessionId,
    fileName,
    processedData,
    visualizationRecommendations,
    charts,
    addChart,
    removeChart,
    updateChart,
    useCase,
  } = useDashboardStore();

  useEffect(() => {
    if (visualizationRecommendations && charts.length === 0) {
      // Auto-create first recommended chart
      const firstRec = visualizationRecommendations.charts[0];
      if (firstRec) {
        handleCreateChartFromRecommendation(firstRec);
      }
    }
  }, [visualizationRecommendations]);

  const handleCreateChartFromRecommendation = async (recommendation: ChartRecommendation) => {
    if (!sessionId) return;
    
    setIsLoadingCharts(true);
    setError(null);
    
    try {
      const chart = await visualizationApi.createChart(
        sessionId,
        recommendation.chart_type,
        recommendation.title,
        recommendation.x_axis,
        recommendation.y_axis
      );
      
      addChart(chart);
      setShowChartDialog(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create chart');
    } finally {
      setIsLoadingCharts(false);
    }
  };

  const getChartIcon = (type: string) => {
    switch (type) {
      case 'line':
      case 'area':
        return <TrendingUp className="h-4 w-4" />;
      case 'bar':
      case 'horizontal_bar':
      case 'stacked_bar':
      case 'grouped_bar':
        return <BarChart3 className="h-4 w-4" />;
      case 'pie':
      case 'donut':
        return <PieChart className="h-4 w-4" />;
      case 'scatter':
      case 'bubble':
        return <Activity className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6" />
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            {fileName} • {processedData?.row_count.toLocaleString()} rows • {useCase}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="charts">
            <BarChart3 className="mr-2 h-4 w-4" />
            Charts ({charts.length})
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            <Sparkles className="mr-2 h-4 w-4" />
            AI Suggestions
          </TabsTrigger>
          <TabsTrigger value="data">
            <Database className="mr-2 h-4 w-4" />
            Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-4">
          {/* Add Chart Button */}
          <Dialog open={showChartDialog} onOpenChange={setShowChartDialog}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Chart
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Add New Chart</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* AI Recommendations */}
                {visualizationRecommendations && visualizationRecommendations.charts.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      AI Recommended Charts
                    </h3>
                    <div className="grid gap-3">
                      {visualizationRecommendations.charts.map((rec, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleCreateChartFromRecommendation(rec)}
                          disabled={isLoadingCharts}
                          className="flex items-start gap-3 p-4 rounded-lg border text-left hover:bg-muted/50 hover:border-primary/50 transition-all"
                        >
                          <div className="p-2 rounded-md bg-primary/10">
                            {getChartIcon(rec.chart_type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{rec.title}</span>
                              <Badge variant="outline" className="text-xs capitalize">
                                {rec.chart_type.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <span>X: {rec.x_axis}</span>
                              <span>•</span>
                              <span>Y: {rec.y_axis.join(', ')}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Custom Chart */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Create Custom Chart</h3>
                  <p className="text-sm text-muted-foreground">
                    Custom chart creation will be available in a future update.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Charts Grid */}
          {charts.length === 0 ? (
            <Card className="p-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No charts yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first chart to start visualizing your data
              </p>
              <Button onClick={() => setShowChartDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Chart
              </Button>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {charts.map((chart) => (
                <ChartContainer
                  key={chart.chart_id}
                  chart={chart}
                  onDelete={removeChart}
                  onUpdate={updateChart}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recommendations">
          {visualizationRecommendations ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Visualization Strategy
                  </CardTitle>
                  <CardDescription>{visualizationRecommendations.summary}</CardDescription>
                </CardHeader>
              </Card>

              <div className="grid gap-4">
                {visualizationRecommendations.charts.map((rec, idx) => (
                  <Card key={idx}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            {getChartIcon(rec.chart_type)}
                            <CardTitle className="text-lg">{rec.title}</CardTitle>
                          </div>
                          <CardDescription>{rec.description}</CardDescription>
                        </div>
                        <Badge variant="secondary" className="capitalize">
                          {rec.chart_type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">X-axis:</span>{' '}
                          <Badge variant="outline">{rec.x_axis}</Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Y-axis:</span>{' '}
                          {rec.y_axis.map((y) => (
                            <Badge key={y} variant="outline" className="mr-1">{y}</Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm">
                          <span className="font-medium">Why this chart:</span>{' '}
                          {rec.reasoning}
                        </p>
                      </div>

                      {rec.compatible_types.length > 0 && (
                        <div>
                          <span className="text-sm text-muted-foreground">Alternative types:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {rec.compatible_types.map((type) => (
                              <Badge key={type} variant="secondary" className="text-xs capitalize">
                                {type.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button 
                        onClick={() => handleCreateChartFromRecommendation(rec)}
                        disabled={isLoadingCharts}
                        className="w-full"
                      >
                        {isLoadingCharts ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4" />
                        )}
                        Create This Chart
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No recommendations yet</h3>
              <p className="text-muted-foreground">
                Complete the analysis steps to get AI-powered visualization suggestions
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="data">
          {processedData ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Processed Data Preview
                </CardTitle>
                <CardDescription>
                  {processedData.row_count.toLocaleString()} rows × {processedData.column_count} columns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full">
                  <div className="min-w-max">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          {processedData.columns.map((col) => (
                            <th key={col} className="text-left p-2 font-semibold">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {processedData.preview.map((row, idx) => (
                          <tr key={idx} className="border-b hover:bg-muted/50">
                            {processedData.columns.map((col) => (
                              <td key={col} className="p-2 max-w-[200px] truncate">
                                {row[col] !== null && row[col] !== undefined 
                                  ? String(row[col]) 
                                  : <span className="text-muted-foreground italic">null</span>
                                }
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-12 text-center">
              <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No processed data</h3>
              <p className="text-muted-foreground">
                Process your data to see the results here
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
