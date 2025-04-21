import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface BulkOperationsProps {
  selectedIds: string[];
  onBulkDelete: (ids: string[]) => Promise<void>;
  onBulkCategorize: (ids: string[], categoryId: string) => Promise<void>;
  onBulkApprove: (ids: string[]) => Promise<void>;
  onBulkExport: (
    ids: string[],
    format: "csv" | "pdf" | "excel"
  ) => Promise<void>;
  transactionCategories: { id: string; name: string }[];
}

export default function BulkTransactionOperations({
  selectedIds,
  onBulkDelete,
  onBulkCategorize,
  onBulkApprove,
  onBulkExport,
  transactionCategories,
}: BulkOperationsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCategorizeDialogOpen, setIsCategorizeDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf" | "excel">(
    "csv"
  );
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleBulkDelete = async () => {
    setIsLoading(true);
    try {
      await onBulkDelete(selectedIds);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkCategorize = async () => {
    if (!selectedCategory) return;

    setIsLoading(true);
    try {
      await onBulkCategorize(selectedIds, selectedCategory);
      setIsCategorizeDialogOpen(false);
    } catch (error) {
      console.error("Failed to categorize transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkExport = async () => {
    setIsLoading(true);
    try {
      await onBulkExport(selectedIds, exportFormat);
      setIsExportDialogOpen(false);
    } catch (error) {
      console.error("Failed to export transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle>Bulk Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm pb-2 mb-2 border-b">
            {selectedIds.length} transaction
            {selectedIds.length !== 1 ? "s" : ""} selected
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={!selectedIds.length}
            >
              Delete
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCategorizeDialogOpen(true)}
              disabled={!selectedIds.length}
            >
              Categorize
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onBulkApprove(selectedIds)}
              disabled={!selectedIds.length}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsExportDialogOpen(true)}
              disabled={!selectedIds.length}
            >
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.length} transaction
              {selectedIds.length !== 1 ? "s" : ""}? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Categorize Dialog */}
      <Dialog
        open={isCategorizeDialogOpen}
        onOpenChange={setIsCategorizeDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Categorize</DialogTitle>
            <DialogDescription>
              Choose a category for {selectedIds.length} transaction
              {selectedIds.length !== 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="category-select">Category</Label>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger id="category-select">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {transactionCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCategorizeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkCategorize}
              disabled={isLoading || !selectedCategory}
            >
              {isLoading ? "Processing..." : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Transactions</DialogTitle>
            <DialogDescription>
              Select the format for exporting {selectedIds.length} transaction
              {selectedIds.length !== 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="format-select">Export Format</Label>
            <Select
              value={exportFormat}
              onValueChange={(value) =>
                setExportFormat(value as "csv" | "pdf" | "excel")
              }
            >
              <SelectTrigger id="format-select">
                <SelectValue placeholder="Select a format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsExportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkExport} disabled={isLoading}>
              {isLoading ? "Exporting..." : "Export"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
