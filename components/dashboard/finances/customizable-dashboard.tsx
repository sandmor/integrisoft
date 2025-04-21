import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Check,
  ChevronsUpDown,
  GripVertical,
  Plus,
  Settings,
  X,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Widget types that can be added to dashboard
export type WidgetType =
  | "revenue-expense-chart"
  | "cash-flow-chart"
  | "budget-utilization"
  | "recent-transactions"
  | "upcoming-payments"
  | "expense-categories"
  | "financial-kpis"
  | "budget-alerts"
  | "department-costs"
  | "cost-centers-summary";

// Configuration for available widgets
export const AVAILABLE_WIDGETS = [
  {
    id: "revenue-expense-chart",
    name: "Revenue vs Expenses",
    description: "Compare income and expenses over time",
    defaultSize: "lg",
    availableSizes: ["md", "lg", "xl"],
  },
  {
    id: "cash-flow-chart",
    name: "Cash Flow",
    description: "Track cash inflows and outflows",
    defaultSize: "lg",
    availableSizes: ["md", "lg", "xl"],
  },
  {
    id: "budget-utilization",
    name: "Budget Utilization",
    description: "Track spending against budgets",
    defaultSize: "md",
    availableSizes: ["sm", "md", "lg"],
  },
  {
    id: "recent-transactions",
    name: "Recent Transactions",
    description: "View latest financial transactions",
    defaultSize: "md",
    availableSizes: ["sm", "md", "lg"],
  },
  {
    id: "upcoming-payments",
    name: "Upcoming Payments",
    description: "View scheduled payments and due dates",
    defaultSize: "md",
    availableSizes: ["sm", "md"],
  },
  {
    id: "expense-categories",
    name: "Expense Categories",
    description: "Breakdown of expenses by category",
    defaultSize: "md",
    availableSizes: ["sm", "md", "lg"],
  },
  {
    id: "financial-kpis",
    name: "Financial KPIs",
    description: "Key performance indicators for finance",
    defaultSize: "sm",
    availableSizes: ["sm", "md"],
  },
  {
    id: "budget-alerts",
    name: "Budget Alerts",
    description: "Alerts for budget exceptions",
    defaultSize: "sm",
    availableSizes: ["sm", "md"],
  },
  {
    id: "department-costs",
    name: "Department Costs",
    description: "Cost breakdown by department",
    defaultSize: "lg",
    availableSizes: ["md", "lg", "xl"],
  },
  {
    id: "cost-centers-summary",
    name: "Cost Centers Summary",
    description: "Performance metrics for cost centers",
    defaultSize: "lg",
    availableSizes: ["md", "lg"],
  },
] as const;

// Widget instance with position and customization
interface DashboardWidget {
  id: string; // Unique instance ID
  type: WidgetType;
  size: "sm" | "md" | "lg" | "xl"; // Widget size: sm (1x1), md (1x2), lg (2x2), xl (2x3)
  settings: Record<string, any>; // Widget-specific settings
}

interface DashboardLayout {
  id: string;
  name: string;
  isDefault: boolean;
  widgets: DashboardWidget[];
}

interface CustomizableDashboardProps {
  availableLayouts: DashboardLayout[];
  activeLayoutId: string;
  onLayoutChange: (layoutId: string) => void;
  onLayoutSave: (layout: DashboardLayout) => Promise<void>;
  onLayoutCreate: (
    layout: Omit<DashboardLayout, "id">
  ) => Promise<DashboardLayout>;
  onLayoutDelete: (layoutId: string) => Promise<void>;
  onLayoutSetDefault: (layoutId: string) => Promise<void>;
  renderWidget: (widget: DashboardWidget) => React.ReactNode;
}

// Widget settings dialog component
function WidgetSettingsDialog({
  open,
  widget,
  onSave,
  onClose,
}: {
  open: boolean;
  widget: DashboardWidget | null;
  onSave: (updatedWidget: DashboardWidget) => void;
  onClose: () => void;
}) {
  const [widgetSize, setWidgetSize] = useState<DashboardWidget["size"]>(
    widget?.size || "md"
  );
  const [settings, setSettings] = useState<Record<string, any>>(
    widget?.settings || {}
  );

  // Reset form state when dialog opens with a new widget
  useEffect(() => {
    if (widget) {
      setWidgetSize(widget.size);
      setSettings(widget.settings || {});
    }
  }, [widget]);

  if (!widget) return null;

  const widgetConfig = AVAILABLE_WIDGETS.find((w) => w.id === widget.type);

  const handleSave = () => {
    onSave({
      ...widget,
      size: widgetSize,
      settings,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Widget Settings</DialogTitle>
          <DialogDescription>
            Customize the {widgetConfig?.name} widget
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Widget Size</label>
            <Select
              value={widgetSize}
              onValueChange={(value) => setWidgetSize(value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {widgetConfig?.availableSizes.map((size) => (
                  <SelectItem key={size} value={size}>
                    {size === "sm"
                      ? "Small"
                      : size === "md"
                      ? "Medium"
                      : size === "lg"
                      ? "Large"
                      : "Extra Large"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Widget-specific settings would go here */}
          {/* This would be expanded based on widget type */}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// A single sortable widget in the layout customizer
function SortableWidget({
  widget,
  onRemove,
  onConfigure,
}: {
  widget: DashboardWidget;
  onRemove: (id: string) => void;
  onConfigure: (widget: DashboardWidget) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const widgetConfig = AVAILABLE_WIDGETS.find((w) => w.id === widget.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center space-x-2 p-3 border rounded-md bg-card mb-2"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none p-1"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="flex-1">
        <p className="text-sm font-medium">{widgetConfig?.name}</p>
        <p className="text-xs text-muted-foreground">
          {widgetConfig?.description}
        </p>
      </div>

      <div className="flex items-center space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onConfigure(widget)}
          title="Configure widget"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(widget.id)}
          title="Remove widget"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Layout management dialog
function LayoutManagementDialog({
  open,
  onClose,
  layouts,
  activeLayoutId,
  onSelect,
  onCreate,
  onDelete,
  onSetDefault,
}: {
  open: boolean;
  onClose: () => void;
  layouts: DashboardLayout[];
  activeLayoutId: string;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}) {
  const [newLayoutName, setNewLayoutName] = useState("");

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Dashboard Layouts</DialogTitle>
          <DialogDescription>
            Select, create or delete dashboard layouts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <ScrollArea className="h-[300px] pr-4">
            {layouts.map((layout) => (
              <div
                key={layout.id}
                className={`flex items-center justify-between p-2 rounded-md mb-1 ${
                  layout.id === activeLayoutId
                    ? "bg-muted"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-6 h-6 p-0"
                    onClick={() => onSelect(layout.id)}
                  >
                    {layout.id === activeLayoutId && (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <div>
                    <p className="text-sm font-medium">
                      {layout.name}
                      {layout.isDefault && (
                        <span className="ml-2 text-xs bg-muted-foreground/20 px-1 rounded text-muted-foreground">
                          Default
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {layout.widgets.length} widgets
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {!layout.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSetDefault(layout.id)}
                      title="Set as default"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  {layouts.length > 1 && !layout.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(layout.id)}
                      title="Delete layout"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </ScrollArea>

          <Separator />

          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="New Layout Name"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={newLayoutName}
              onChange={(e) => setNewLayoutName(e.target.value)}
            />
            <Button
              onClick={() => {
                if (newLayoutName.trim()) {
                  onCreate(newLayoutName);
                  setNewLayoutName("");
                }
              }}
              disabled={!newLayoutName.trim()}
            >
              <Plus className="h-4 w-4 mr-1" /> Create
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Available widgets selector dialog
function WidgetSelectorDialog({
  open,
  onClose,
  onAddWidgets,
  existingWidgetTypes,
}: {
  open: boolean;
  onClose: () => void;
  onAddWidgets: (types: WidgetType[]) => void;
  existingWidgetTypes: WidgetType[];
}) {
  const [selectedWidgets, setSelectedWidgets] = useState<WidgetType[]>([]);

  useEffect(() => {
    setSelectedWidgets([]);
  }, [open]);

  const handleToggleWidget = (type: WidgetType, isChecked: boolean) => {
    if (isChecked) {
      setSelectedWidgets((prev) => [...prev, type]);
    } else {
      setSelectedWidgets((prev) => prev.filter((t) => t !== type));
    }
  };

  const handleAddWidgets = () => {
    onAddWidgets(selectedWidgets);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Widgets</DialogTitle>
          <DialogDescription>
            Select widgets to add to your dashboard
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AVAILABLE_WIDGETS.map((widget) => {
              const isDisabled = existingWidgetTypes.includes(
                widget.id as WidgetType
              );

              return (
                <label
                  key={widget.id}
                  className={`flex items-start space-x-2 p-3 border rounded-md ${
                    isDisabled ? "opacity-50" : "hover:bg-muted/50"
                  } cursor-pointer`}
                >
                  <Checkbox
                    checked={selectedWidgets.includes(widget.id as WidgetType)}
                    onCheckedChange={(checked) =>
                      !isDisabled &&
                      handleToggleWidget(widget.id as WidgetType, !!checked)
                    }
                    disabled={isDisabled}
                  />
                  <div>
                    <p className="text-sm font-medium">{widget.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {widget.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAddWidgets}
            disabled={selectedWidgets.length === 0}
          >
            Add Selected ({selectedWidgets.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main customizable dashboard component
export default function CustomizableDashboard({
  availableLayouts,
  activeLayoutId,
  onLayoutChange,
  onLayoutSave,
  onLayoutCreate,
  onLayoutDelete,
  onLayoutSetDefault,
  renderWidget,
}: CustomizableDashboardProps) {
  const [activeLayout, setActiveLayout] = useState<DashboardLayout | null>(
    null
  );
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isWidgetSelectorOpen, setIsWidgetSelectorOpen] = useState(false);
  const [isLayoutDialogOpen, setIsLayoutDialogOpen] = useState(false);
  const [currentEditWidget, setCurrentEditWidget] =
    useState<DashboardWidget | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Set up sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update active layout when props change
  useEffect(() => {
    const layout = availableLayouts.find((l) => l.id === activeLayoutId);
    setActiveLayout(layout || availableLayouts[0] || null);
  }, [availableLayouts, activeLayoutId]);

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Update widget order
    if (activeLayout) {
      const oldIndex = activeLayout.widgets.findIndex(
        (w) => w.id === active.id
      );
      const newIndex = activeLayout.widgets.findIndex((w) => w.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newWidgets = arrayMove(activeLayout.widgets, oldIndex, newIndex);
        setActiveLayout({
          ...activeLayout,
          widgets: newWidgets,
        });
      }
    }
  };

  const handleAddWidgets = (widgetTypes: WidgetType[]) => {
    if (!activeLayout) return;

    const newWidgets = widgetTypes.map((type) => {
      const config = AVAILABLE_WIDGETS.find((w) => w.id === type);
      return {
        id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        size: (config?.defaultSize || "md") as DashboardWidget["size"],
        settings: {},
      };
    });

    setActiveLayout({
      ...activeLayout,
      widgets: [...activeLayout.widgets, ...newWidgets],
    });
  };

  const handleRemoveWidget = (widgetId: string) => {
    if (!activeLayout) return;

    setActiveLayout({
      ...activeLayout,
      widgets: activeLayout.widgets.filter((w) => w.id !== widgetId),
    });
  };

  const handleConfigureWidget = (widget: DashboardWidget) => {
    setCurrentEditWidget(widget);
  };

  const handleUpdateWidget = (updatedWidget: DashboardWidget) => {
    if (!activeLayout) return;

    setActiveLayout({
      ...activeLayout,
      widgets: activeLayout.widgets.map((w) =>
        w.id === updatedWidget.id ? updatedWidget : w
      ),
    });
  };

  const handleSaveLayout = async () => {
    if (!activeLayout) return;

    try {
      await onLayoutSave(activeLayout);
      setIsCustomizing(false);
    } catch (error) {
      console.error("Failed to save layout:", error);
    }
  };

  const handleCreateLayout = async (name: string) => {
    try {
      // Create a new layout based on the current one
      const newLayout = await onLayoutCreate({
        name,
        isDefault: false,
        widgets: activeLayout?.widgets || [],
      });

      onLayoutChange(newLayout.id);
      setIsLayoutDialogOpen(false);
    } catch (error) {
      console.error("Failed to create layout:", error);
    }
  };

  const getSizeClass = (size: DashboardWidget["size"]) => {
    switch (size) {
      case "sm":
        return "col-span-1 row-span-1";
      case "md":
        return "col-span-1 row-span-2";
      case "lg":
        return "col-span-2 row-span-2";
      case "xl":
        return "col-span-2 row-span-3";
      default:
        return "col-span-1 row-span-1";
    }
  };

  // If no layouts are available, show a placeholder
  if (!activeLayout) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Finance Dashboard</CardTitle>
          <CardDescription>No dashboard layouts available</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Button onClick={() => handleCreateLayout("Default Layout")}>
            Create Default Layout
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dashboard header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Finance Dashboard</h2>
          <p className="text-muted-foreground">
            {activeLayout.name} {activeLayout.isDefault && "(Default)"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select
            value={activeLayoutId}
            onValueChange={onLayoutChange}
            disabled={isCustomizing}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select layout" />
            </SelectTrigger>
            <SelectContent>
              {availableLayouts.map((layout) => (
                <SelectItem key={layout.id} value={layout.id}>
                  {layout.name} {layout.isDefault && "(Default)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setIsLayoutDialogOpen(true)}
            disabled={isCustomizing}
          >
            Manage Layouts
          </Button>

          {!isCustomizing ? (
            <Button onClick={() => setIsCustomizing(true)}>Customize</Button>
          ) : (
            <Button variant="default" onClick={handleSaveLayout}>
              Save Layout
            </Button>
          )}
        </div>
      </div>

      {/* Customization interface */}
      {isCustomizing && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Customize Dashboard</CardTitle>
            <CardDescription>
              Add, remove, and rearrange widgets on your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => setIsWidgetSelectorOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Widgets
            </Button>

            <div className="border rounded-md p-4 bg-muted/30">
              <h3 className="text-sm font-medium mb-3">Current Widgets</h3>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={activeLayout.widgets.map((w) => w.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {activeLayout.widgets.length > 0 ? (
                    <div
                      className={`space-y-2 ${
                        isDragging ? "cursor-grabbing" : ""
                      }`}
                    >
                      {activeLayout.widgets.map((widget) => (
                        <SortableWidget
                          key={widget.id}
                          widget={widget}
                          onRemove={handleRemoveWidget}
                          onConfigure={handleConfigureWidget}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No widgets added yet. Click "Add Widgets" to get started.
                    </p>
                  )}
                </SortableContext>
              </DndContext>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setIsCustomizing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveLayout}>Save Layout</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard grid */}
      <div className="grid grid-cols-4 gap-4">
        {activeLayout.widgets.map((widget) => (
          <div key={widget.id} className={getSizeClass(widget.size)}>
            {renderWidget(widget)}
          </div>
        ))}
      </div>

      {/* Dialogs */}
      <WidgetSettingsDialog
        open={currentEditWidget !== null}
        widget={currentEditWidget}
        onSave={handleUpdateWidget}
        onClose={() => setCurrentEditWidget(null)}
      />

      <WidgetSelectorDialog
        open={isWidgetSelectorOpen}
        onClose={() => setIsWidgetSelectorOpen(false)}
        onAddWidgets={handleAddWidgets}
        existingWidgetTypes={activeLayout.widgets.map((w) => w.type)}
      />

      <LayoutManagementDialog
        open={isLayoutDialogOpen}
        onClose={() => setIsLayoutDialogOpen(false)}
        layouts={availableLayouts}
        activeLayoutId={activeLayoutId}
        onSelect={onLayoutChange}
        onCreate={handleCreateLayout}
        onDelete={onLayoutDelete}
        onSetDefault={onLayoutSetDefault}
      />
    </div>
  );
}
