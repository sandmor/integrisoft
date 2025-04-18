import { db } from "@/lib/db";
import { kanbanBoardOrder, tasks } from "./schema";
import { and, asc, desc, eq, inArray, not } from "drizzle-orm";
import { sql } from "drizzle-orm";

// Supported task statuses
export type TaskStatus = "todo" | "in_progress" | "review" | "done";

/**
 * Get tasks for a project column ordered by the custom order if available
 * Falls back to sorting by priority (high to low) and then creation date if no custom order exists
 */
export async function getOrderedTasksForColumn(
  projectId: string,
  status: TaskStatus
) {
  // Get the custom order if it exists
  const orderData = await db.query.kanbanBoardOrder.findFirst({
    where: and(
      eq(kanbanBoardOrder.projectId, projectId),
      eq(kanbanBoardOrder.status, status)
    ),
  });

  // First get all tasks for this column
  const columnTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.projectId, projectId),
        eq(tasks.status, status),
        not(eq(tasks.isDeleted, true))
      )
    )
    .orderBy(desc(tasks.priority), asc(tasks.createdAt));

  // If no custom order exists or if it's empty, return default ordered tasks
  if (!orderData || orderData.orderedTaskIds.length === 0) {
    return columnTasks;
  }

  // Filter out any tasks that might be in the order but don't exist or are deleted
  const validTaskIds = new Set(columnTasks.map((task) => task.id));
  const validOrderedIds = orderData.orderedTaskIds.filter((id) =>
    validTaskIds.has(id)
  );

  // Find tasks that exist but aren't in the order (new tasks)
  const unorderedTasks = columnTasks.filter(
    (task) => !orderData.orderedTaskIds.includes(task.id)
  );

  // Create a map for quick task lookups
  const taskMap = new Map(columnTasks.map((task) => [task.id, task]));

  // Combine ordered tasks with any new unordered tasks
  const orderedTasks = [
    // First get all tasks that have a defined order
    ...validOrderedIds.map((id) => taskMap.get(id)!),
    // Then append any tasks that aren't in the order yet
    ...unorderedTasks,
  ];

  return orderedTasks;
}

/**
 * Update the custom order of tasks for a specific column
 */
export async function updateTaskOrderForColumn(
  projectId: string,
  status: TaskStatus,
  newTaskOrder: string[]
) {
  await db
    .insert(kanbanBoardOrder)
    .values({ projectId, status, orderedTaskIds: newTaskOrder })
    .onConflictDoUpdate({
      target: [kanbanBoardOrder.projectId, kanbanBoardOrder.status],
      set: { orderedTaskIds: newTaskOrder },
    });
}

/**
 * Add a task to the end of the column's custom order
 * Creates a new order record if one doesn't exist
 */
export async function addTaskToOrder(
  projectId: string,
  status: TaskStatus,
  taskId: string
) {
  const orderData = await db.query.kanbanBoardOrder.findFirst({
    where: and(
      eq(kanbanBoardOrder.projectId, projectId),
      eq(kanbanBoardOrder.status, status)
    ),
  });

  if (orderData) {
    // Only add if not already present
    if (!orderData.orderedTaskIds.includes(taskId)) {
      await db
        .update(kanbanBoardOrder)
        .set({ orderedTaskIds: [...orderData.orderedTaskIds, taskId] })
        .where(
          and(
            eq(kanbanBoardOrder.projectId, projectId),
            eq(kanbanBoardOrder.status, status)
          )
        );
    }
  } else {
    // If no order exists yet for this column, create one
    await db.insert(kanbanBoardOrder).values({
      projectId,
      status,
      orderedTaskIds: [taskId],
    });
  }
}

/**
 * Remove a task from a column's custom order array
 * Useful when a task is deleted or moved to another column
 */
export async function removeTaskFromOrder(
  projectId: string,
  status: TaskStatus,
  taskId: string
) {
  const orderData = await db.query.kanbanBoardOrder.findFirst({
    where: and(
      eq(kanbanBoardOrder.projectId, projectId),
      eq(kanbanBoardOrder.status, status)
    ),
  });

  if (orderData && orderData.orderedTaskIds.includes(taskId)) {
    const updatedOrder = orderData.orderedTaskIds.filter((id) => id !== taskId);

    await db
      .update(kanbanBoardOrder)
      .set({
        orderedTaskIds: updatedOrder,
      })
      .where(
        and(
          eq(kanbanBoardOrder.projectId, projectId),
          eq(kanbanBoardOrder.status, status)
        )
      );
  }
}

/**
 * Move a task from one column to another, updating both columns' order arrays
 */
export async function moveTaskBetweenColumns(
  projectId: string,
  taskId: string,
  fromStatus: TaskStatus,
  toStatus: TaskStatus
) {
  // Transaction to handle both removing from one column and adding to another
  await db.transaction(async (tx) => {
    // Remove from source column
    await removeTaskFromOrder(projectId, fromStatus, taskId);

    // Add to destination column
    await addTaskToOrder(projectId, toStatus, taskId);
  });
}

/**
 * Reorder tasks within a column
 * @param projectId Project ID
 * @param status The column status
 * @param newOrder Array of task IDs in their new order
 */
export async function reorderTasksInColumn(
  projectId: string,
  status: TaskStatus,
  newOrder: string[]
) {
  // First get existing tasks to validate the new order
  const existingTasks = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.projectId, projectId),
        eq(tasks.status, status),
        not(eq(tasks.isDeleted, true))
      )
    );

  const existingIds = new Set(existingTasks.map((t) => t.id));

  // Filter out any IDs that don't exist in this column
  const validOrder = newOrder.filter((id) => existingIds.has(id));

  // Add any existing tasks that weren't included in the new order
  existingTasks.forEach((task) => {
    if (!validOrder.includes(task.id)) {
      validOrder.push(task.id);
    }
  });

  // Update the order
  await updateTaskOrderForColumn(projectId, status, validOrder);
}
