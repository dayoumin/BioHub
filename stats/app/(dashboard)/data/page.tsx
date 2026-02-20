"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileUpload, InlineFileUpload } from "@/components/ui/file-upload"
import { FileText, Database, Download, Eye, Trash2 } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { formatDistanceToNow } from "date-fns"

export default function DataPage() {
  const { datasets, removeDataset } = useAppStore()

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "processed": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "error": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Active"
      case "processed": return "Processed" 
      case "error": return "Error"
      default: return "Unknown"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Management</h1>
          <p className="text-muted-foreground">
            Upload, manage, and validate your datasets for statistical analysis.
          </p>
        </div>
        <InlineFileUpload />
      </div>

      {/* Upload Section */}
      <FileUpload onUploadComplete={() => {/* \ub370\uc774\ud130 \ud398\uc774\uc9c0\ub294 \uc790\ub3d9 \uc0c8\ub85c\uace0\uce68 */}} />

      {/* Existing Datasets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Your Datasets
          </CardTitle>
          <CardDescription>
            Manage and analyze your uploaded datasets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {datasets.length === 0 ? (
            <div className="text-center py-12">
              <Database className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No datasets uploaded yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload your first dataset to start analyzing data
              </p>
              <InlineFileUpload />
            </div>
          ) : (
            <div className="space-y-4">
              {datasets.map((dataset) => (
                <div key={dataset.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <FileText className="h-8 w-8 text-primary" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{dataset.name}</h4>
                        <Badge variant="outline" className={getStatusColor(dataset.status)}>
                          {getStatusLabel(dataset.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{dataset.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{dataset.format}</span>
                        <span>{dataset.size}</span>
                        <span>{dataset.rows.toLocaleString()} rows</span>
                        <span>{dataset.columns} columns</span>
                        <span>Uploaded {formatDistanceToNow(dataset.uploadedAt, { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" title="View data">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Download dataset">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      title="Delete dataset"
                      onClick={() => removeDataset(dataset.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      Analyze
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Validation */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Data Validation</CardTitle>
            <CardDescription>
              Ensure your data meets statistical analysis requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Missing value detection</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Outlier identification</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Data type verification</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Normality testing</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supported Formats</CardTitle>
            <CardDescription>
              File formats accepted by the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">CSV (Comma Separated Values)</span>
              <Badge variant="outline">Recommended</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">TSV (Tab Separated Values)</span>
              <Badge variant="outline">Supported</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Excel (.xlsx)</span>
              <Badge variant="outline">Supported</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Excel (.xls)</span>
              <Badge variant="outline">Legacy</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}