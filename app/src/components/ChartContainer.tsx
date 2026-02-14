import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts';
import { 
  MoreHorizontal, 
  Download, 
  Maximize2, 
  Trash2, 
  RefreshCw,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { visualizationApi } from '@/services/api';
import type { ChartData, ChartType } from '@/types';

interface ChartContainerProps {
  chart: ChartData;
  onDelete: (chartId: string) => void;
  onUpdate: (chartId: string, updates: Partial<ChartData>) => void;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

const ChartContainer = ({ chart, onDelete, onUpdate }: ChartContainerProps) => {
  const [isConverting, setIsConverting] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);

  const handleChartTypeChange = async (newType: ChartType) => {
    if (newType === chart.chart_type) return;
    
    setIsConverting(true);
    setConversionError(null);
    
    try {
      const response = await visualizationApi.convertChart(chart.chart_id, newType);
      
      if (response.success) {
        onUpdate(chart.chart_id, response.chart);
      } else {
        setConversionError(response.reason || 'Cannot convert to this chart type');
      }
    } catch (err: any) {
      setConversionError(err.response?.data?.detail?.message || err.response?.data?.detail || 'Conversion failed');
    } finally {
      setIsConverting(false);
    }
  };

  const getChartIcon = (type: ChartType) => {
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
        return <PieChartIcon className="h-4 w-4" />;
      case 'scatter':
      case 'bubble':
        return <Activity className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  const renderChart = () => {
    const data = chart.data;
    const xKey = chart.x_axis;
    const yKeys = chart.y_axis;

    switch (chart.chart_type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {yKeys.map((yKey, idx) => (
                <Line 
                  key={yKey} 
                  type="monotone" 
                  dataKey={yKey} 
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {yKeys.map((yKey, idx) => (
                <Area 
                  key={yKey} 
                  type="monotone" 
                  dataKey={yKey} 
                  fill={COLORS[idx % COLORS.length]}
                  stroke={COLORS[idx % COLORS.length]}
                  fillOpacity={0.3}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
      case 'horizontal_bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout={chart.chart_type === 'horizontal_bar' ? 'vertical' : 'horizontal'}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              {chart.chart_type === 'horizontal_bar' ? (
                <>
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey={xKey} type="category" tick={{ fontSize: 12 }} width={100} />
                </>
              ) : (
                <>
                  <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                </>
              )}
              <Tooltip />
              <Legend />
              {yKeys.map((yKey, idx) => (
                <Bar 
                  key={yKey} 
                  dataKey={yKey} 
                  fill={COLORS[idx % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'donut':
        const pieData = data.map((item) => ({
          name: item[xKey],
          value: item[yKeys[0]]
        }));
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                innerRadius={chart.chart_type === 'donut' ? 60 : 0}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} type="number" />
              <YAxis dataKey={yKeys[0]} tick={{ fontSize: 12 }} type="number" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter data={data} fill={COLORS[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Chart type "{chart.chart_type}" visualization coming soon
          </div>
        );
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {getChartIcon(chart.chart_type)}
              <CardTitle className="text-lg truncate">{chart.title}</CardTitle>
            </div>
            <CardDescription className="truncate">{chart.description}</CardDescription>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem disabled>
                <Maximize2 className="mr-2 h-4 w-4" />
                Full Screen
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Download className="mr-2 h-4 w-4" />
                Download PNG
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(chart.chart_id)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Chart
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary" className="text-xs">
            {chart.x_axis}
          </Badge>
          {chart.y_axis.map((y) => (
            <Badge key={y} variant="outline" className="text-xs">
              {y}
            </Badge>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        {conversionError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{conversionError}</AlertDescription>
          </Alert>
        )}
        
        {isConverting ? (
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          renderChart()
        )}
      </CardContent>
      
      {/* Chart Type Selector */}
      <div className="px-6 pb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Change Chart Type
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 max-h-80 overflow-auto">
            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
              Compatible Types
            </div>
            {chart.compatible_types.map((type) => (
              <DropdownMenuItem 
                key={type} 
                onClick={() => handleChartTypeChange(type)}
                className={chart.chart_type === type ? 'bg-accent' : ''}
              >
                {getChartIcon(type)}
                <span className="ml-2 capitalize">{type.replace('_', ' ')}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
};

export default ChartContainer;
