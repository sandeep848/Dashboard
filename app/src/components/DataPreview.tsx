import { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Database, 
  Hash, 
  Type, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2,
  BarChart3,
  Columns
} from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import type { ColumnInfo } from '@/types';

const DataPreview = () => {
  const { schema, preview, llmInsights, fileName } = useDashboardStore();
  const [activeTab, setActiveTab] = useState('preview');

  if (!schema) return null;

  const getColumnIcon = (column: ColumnInfo) => {
    if (column.is_datetime) return <Calendar className="h-4 w-4 text-blue-500" />;
    if (column.is_numeric) return <Hash className="h-4 w-4 text-green-500" />;
    if (column.is_categorical) return <BarChart3 className="h-4 w-4 text-purple-500" />;
    return <Type className="h-4 w-4 text-gray-500" />;
  };

  const getColumnBadge = (column: ColumnInfo) => {
    if (column.is_datetime) return <Badge variant="secondary" className="bg-blue-100 text-blue-800">DateTime</Badge>;
    if (column.is_numeric) return <Badge variant="secondary" className="bg-green-100 text-green-800">Numeric</Badge>;
    if (column.is_categorical) return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Categorical</Badge>;
    return <Badge variant="secondary">Text</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* File Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Database className="h-5 w-5" />
                {fileName}
              </CardTitle>
              <CardDescription>
                {schema.row_count.toLocaleString()} rows × {schema.column_count} columns
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Memory Usage</div>
              <div className="font-medium">{schema.memory_usage_mb.toFixed(2)} MB</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* LLM Insights */}
      {llmInsights && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              AI Analysis Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{llmInsights.summary}</p>
            
            {llmInsights.key_observations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Key Observations</h4>
                <ul className="space-y-1">
                  {llmInsights.key_observations.map((obs, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {obs}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {llmInsights.potential_use_cases.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Suggested Use Cases</h4>
                <div className="flex flex-wrap gap-2">
                  {llmInsights.potential_use_cases.map((useCase, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {useCase}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {llmInsights.data_quality_issues.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="h-4 w-4" />
                  Data Quality Issues
                </h4>
                <ul className="space-y-1">
                  {llmInsights.data_quality_issues.map((issue, idx) => (
                    <li key={idx} className="text-sm text-yellow-700 flex items-start gap-2">
                      <span>•</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Data Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preview">Data Preview</TabsTrigger>
          <TabsTrigger value="schema">Schema Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="preview" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">First 10 Rows</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <div className="min-w-max">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {schema.columns.map((col) => (
                          <TableHead key={col.name} className="font-semibold">
                            <div className="flex items-center gap-2">
                              {getColumnIcon(col)}
                              {col.name}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((row, idx) => (
                        <TableRow key={idx}>
                          {schema.columns.map((col) => (
                            <TableCell key={col.name} className="max-w-[200px] truncate">
                              {row[col.name] !== null && row[col.name] !== undefined 
                                ? String(row[col.name]) 
                                : <span className="text-muted-foreground italic">null</span>
                              }
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="schema" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Columns className="h-5 w-5" />
                Column Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {schema.columns.map((col) => (
                  <div 
                    key={col.name} 
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {getColumnIcon(col)}
                      <div>
                        <div className="font-medium">{col.name}</div>
                        <div className="text-sm text-muted-foreground">{col.dtype}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-sm font-medium">{col.unique_count.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Unique Values</div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-sm font-medium ${col.null_count > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {col.null_count.toLocaleString()} ({col.null_percentage}%)
                        </div>
                        <div className="text-xs text-muted-foreground">Nulls</div>
                      </div>
                      
                      {getColumnBadge(col)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataPreview;
