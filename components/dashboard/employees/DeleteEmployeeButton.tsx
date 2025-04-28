"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDeleteEmployeeMutation } from "@/lib/redux/employeesApi";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";

interface DeleteEmployeeButtonProps {
  employeeId: string;
}

export default function DeleteEmployeeButton({
  employeeId,
}: DeleteEmployeeButtonProps) {
  const [open, setOpen] = useState(false);
  const [deleteEmployee, { isLoading }] = useDeleteEmployeeMutation();
  const router = useRouter();

  const handleDelete = async () => {
    try {
      await deleteEmployee(employeeId).unwrap();
      toast.success("Employee deleted successfully");
      router.push("/dashboard/employees");
    } catch (error: any) {
      toast.error(
        `Failed to delete employee. ${error.data?.error || error.message}`
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          {isLoading ? (
            "Deleting..."
          ) : (
            <>
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Employee</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this employee? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? (
              "Deleting..."
            ) : (
              <>
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
