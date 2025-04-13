import { faker } from "@faker-js/faker";
import { db } from "@/lib/db";
import { createId } from "@paralleldrive/cuid2";
import * as schema from "@/lib/db/schema";
import { eq, not } from "drizzle-orm";

// Generate notifications
export async function generateNotifications(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userIds: string[],
  projectIds: string[]
) {
  // Define notification templates by type
  const notificationTemplates = {
    info: [
      {
        title: "Welcome to Integrisoft",
        message:
          "Welcome to Integrisoft! Get started by completing your profile.",
      },
      {
        title: "New Feature Available",
        message: "We've added a new dashboard feature. Check it out!",
      },
      {
        title: "System Maintenance Scheduled",
        message:
          "System maintenance is scheduled for {date}. Brief downtime expected.",
      },
      {
        title: "Profile Update",
        message: "Your profile information has been successfully updated.",
      },
      {
        title: "Weekly Summary Available",
        message:
          "Your weekly performance summary is now available. Click to view.",
      },
    ],
    success: [
      {
        title: "Project Created Successfully",
        message: "Project '{project}' has been created successfully.",
        entityType: "project",
      },
      {
        title: "Task Completed",
        message: "Task '{task}' has been marked as complete.",
        entityType: "task",
      },
      {
        title: "Budget Approved",
        message: "The budget for '{entity}' has been approved.",
      },
      {
        title: "Contract Signed",
        message: "Contract with {client} has been signed and is now active.",
        entityType: "contract",
      },
      {
        title: "Report Generated",
        message:
          "Your requested report '{report}' has been generated successfully.",
      },
    ],
    warning: [
      {
        title: "Project Budget Warning",
        message: "Project '{project}' has reached 80% of its allocated budget.",
        entityType: "project",
      },
      {
        title: "Task Deadline Approaching",
        message: "Task '{task}' is due in 2 days.",
        entityType: "task",
      },
      {
        title: "Login from New Device",
        message:
          "Your account was accessed from a new device. If this wasn't you, please contact support.",
      },
      {
        title: "License Expiring Soon",
        message: "Your license for '{product}' is expiring in 30 days.",
        entityType: "product",
      },
      {
        title: "Low Resource Utilization",
        message:
          "Team {team} has unusually low resource utilization (below 60%).",
      },
    ],
    error: [
      {
        title: "Failed Login Attempts",
        message: "Multiple failed login attempts detected on your account.",
      },
      {
        title: "Project Deadline Missed",
        message: "Project '{project}' has missed its target completion date.",
        entityType: "project",
      },
      {
        title: "Budget Exceeded",
        message: "Budget for '{entity}' has been exceeded by {amount}%.",
      },
      {
        title: "Integration Error",
        message:
          "Error connecting to external service: {service}. Please check your configuration.",
      },
      {
        title: "Data Import Failed",
        message: "The data import operation failed. See logs for details.",
      },
    ],
  };

  // Get active projects for relevant notifications
  const activeProjects = await tx.query.projects
    .findMany({
      where: not(eq(schema.projects.isDeleted, true)),
    })
    .execute();

  // Generate 10-50 notifications for each user
  for (const userId of userIds) {
    // Get user info for personalized notifications
    const user = await tx.query.users
      .findFirst({
        where: eq(schema.users.id, userId),
      })
      .execute();

    if (!user || user.isDeleted) continue;

    // Number of notifications depends on user activity (more for admins and managers)
    const notificationCount =
      user.role === "admin"
        ? 30 + Math.floor(Math.random() * 21)
        : user.role === "manager"
        ? 20 + Math.floor(Math.random() * 16)
        : 10 + Math.floor(Math.random() * 11);

    // Time range for notifications - most from the last 30 days,
    // but some older ones to simulate history
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Track used notification templates to avoid too many duplicates for the same user
    const usedTemplates = new Set();

    for (let i = 0; i < notificationCount; i++) {
      // More recent notifications are more common
      const isMostRecent = i < notificationCount * 0.7;
      const createdAt = faker.date.between({
        from: isMostRecent ? thirtyDaysAgo : ninetyDaysAgo,
        to: isMostRecent ? now : thirtyDaysAgo,
      });

      // Choose notification type with appropriate distribution
      // Info and success are more common than warnings and errors
      const notifType = (() => {
        const rand = Math.random();
        if (rand < 0.4) return "info";
        if (rand < 0.8) return "success";
        if (rand < 0.95) return "warning";
        return "error";
      })();

      // Get templates for this notification type
      const templates =
        notificationTemplates[notifType as keyof typeof notificationTemplates];

      // Track template index to avoid repetition
      let templateIdx;
      let attempts = 0;

      do {
        templateIdx = Math.floor(Math.random() * templates.length);
        attempts++;
      } while (
        usedTemplates.has(`${notifType}-${templateIdx}`) &&
        attempts < 5
      );

      // After 5 attempts, just use any template
      usedTemplates.add(`${notifType}-${templateIdx}`);

      const template = templates[templateIdx];

      // Start with the template message
      let message = template.message;
      let title = template.title;
      let entityId = null;
      let entityType = "entityType" in template ? template.entityType : null;

      // Replace placeholders with realistic values
      if (message.includes("{project}") || entityType === "project") {
        // Use a real project if available
        if (activeProjects.length > 0) {
          const project =
            activeProjects[Math.floor(Math.random() * activeProjects.length)];
          message = message.replace("{project}", project.name);
          entityId = project.id;
        } else {
          message = message.replace("{project}", "Sample Project");
        }
      }

      if (message.includes("{date}")) {
        const futureDate = faker.date.soon({ days: 14, refDate: createdAt });
        message = message.replace(
          "{date}",
          futureDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      }

      if (message.includes("{task}")) {
        message = message.replace(
          "{task}",
          `${faker.hacker.verb()} ${faker.hacker.noun()}`
        );
      }

      if (message.includes("{entity}")) {
        message = message.replace("{entity}", faker.commerce.department());
      }

      if (message.includes("{client}")) {
        message = message.replace("{client}", faker.company.name());
      }

      if (message.includes("{report}")) {
        message = message.replace(
          "{report}",
          `${faker.word.adjective()} ${faker.word.noun()} Report`
        );
      }

      if (message.includes("{product}")) {
        message = message.replace("{product}", faker.commerce.productName());
      }

      if (message.includes("{team}")) {
        message = message.replace("{team}", faker.commerce.department());
      }

      if (message.includes("{service}")) {
        message = message.replace("{service}", faker.company.buzzNoun());
      }

      if (message.includes("{amount}")) {
        message = message.replace(
          "{amount}",
          (10 + Math.floor(Math.random() * 30)).toString()
        );
      }

      // 70% of notifications are read
      const isRead = Math.random() < 0.7;

      // Insert the notification
      await tx
        .insert(schema.notifications)
        .values({
          id: createId(),
          userId,
          title,
          message,
          type: notifType,
          isRead,
          entityId,
          entityType,
          createdAt,
        })
        .execute();
    }
  }
}
