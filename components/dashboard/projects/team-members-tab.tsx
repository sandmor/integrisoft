"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar, MoreVertical, PlusCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { TeamMemberForm } from "./team-member-form";

type TeamMember = {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  allocationPercentage: number;
  startDate: Date | null;
  endDate: Date | null;
};

type Employee = {
  id: string;
  name: string;
};

type TeamMembersTabProps = {
  projectId: string;
  employees: Employee[];
  teamMembers: TeamMember[];
};

export function TeamMembersTab({
  projectId,
  employees,
  teamMembers: initialTeamMembers,
}: TeamMembersTabProps) {
  const router = useRouter();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(
    initialTeamMembers || []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Fetch team members when the component mounts or when the projectId changes
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/projects/${projectId}/team-members`);
        if (response.ok) {
          const data = await response.json();
          setTeamMembers(data);
        }
      } catch (error) {
        console.error("Error fetching team members:", error);
        toast.error("Failed to load team members");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamMembers();
  }, [projectId]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Present";
    return format(new Date(date), "MMM d, yyyy");
  };

  const handleAddMember = () => {
    setIsAddDialogOpen(true);
  };

  const handleEditMember = (member: TeamMember) => {
    setSelectedMember(member);
    setIsEditDialogOpen(true);
  };

  const handleDeleteMember = (member: TeamMember) => {
    setSelectedMember(member);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteMember = async () => {
    if (!selectedMember) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/projects/${projectId}/team-members/${selectedMember.id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        // Remove the member from the local state
        setTeamMembers((prev) =>
          prev.filter((m) => m.id !== selectedMember.id)
        );
        toast.success("Team member removed successfully");

        // Refresh the page data
        router.refresh();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to remove team member");
      }
    } catch (error) {
      console.error("Error removing team member:", error);
      toast.error("Failed to remove team member");
    } finally {
      setIsLoading(false);
      setIsDeleteDialogOpen(false);
      setSelectedMember(null);
    }
  };

  const handleFormSuccess = () => {
    setIsAddDialogOpen(false);
    setIsEditDialogOpen(false);
    setSelectedMember(null);
  };

  if (isLoading && teamMembers.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!teamMembers || teamMembers.length === 0) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Project Team</h2>
          <Button onClick={handleAddMember}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Team Member
          </Button>
        </div>

        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No Team Members</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This project doesn't have any team members assigned yet.
            </p>
          </div>
        </div>

        {/* Add Member Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Assign a new team member to this project.
              </DialogDescription>
            </DialogHeader>
            <TeamMemberForm
              projectId={projectId}
              employees={employees}
              onClose={() => setIsAddDialogOpen(false)}
              onSuccess={handleFormSuccess}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Project Team</h2>
        <Button onClick={handleAddMember}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Team Member
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {teamMembers.map((member) => (
          <Card key={member.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{member.name}</CardTitle>
                    <CardDescription>{member.role}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center">
                  <Badge className="mr-2">{member.allocationPercentage}%</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleEditMember(member)}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeleteMember(member)}
                      >
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground space-y-2">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>
                    {formatDate(member.startDate)} -{" "}
                    {formatDate(member.endDate)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Member Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Assign a new team member to this project.
            </DialogDescription>
          </DialogHeader>
          <TeamMemberForm
            projectId={projectId}
            employees={employees}
            onClose={() => setIsAddDialogOpen(false)}
            onSuccess={handleFormSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update the team member's information.
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <TeamMemberForm
              projectId={projectId}
              teamMemberId={selectedMember.id}
              employees={employees}
              onClose={() => setIsEditDialogOpen(false)}
              onSuccess={handleFormSuccess}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Removal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedMember?.name} from the
              project team? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteMember();
              }}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
