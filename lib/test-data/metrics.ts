import { db } from "@/lib/db";
import { createId } from "@paralleldrive/cuid2";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Generate metrics
export async function generateMetrics(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  projectIds: string[],
  employeeIds: string[]
) {
  // Define metric categories and types
  const metricTypes = {
    financial: [
      { name: "Monthly Revenue", unit: "USD" },
      { name: "Monthly Expenses", unit: "USD" },
      { name: "Profit Margin", unit: "%" },
      { name: "Client Acquisition Cost", unit: "USD" },
      { name: "Average Contract Value", unit: "USD" },
      { name: "Cash Flow", unit: "USD" },
    ],
    project: [
      { name: "On-time Delivery Rate", unit: "%" },
      { name: "Budget Adherence", unit: "%" },
      { name: "Project Success Rate", unit: "%" },
      { name: "Average Task Completion Time", unit: "days" },
      { name: "Defect Rate", unit: "per 1000 lines" },
      { name: "Requirements Change Rate", unit: "%" },
    ],
    productivity: [
      { name: "Employee Utilization", unit: "%" },
      { name: "Average Tasks Per Employee", unit: "count" },
      { name: "Code Commit Frequency", unit: "per day" },
      { name: "Code Review Time", unit: "hours" },
      { name: "Build Time", unit: "minutes" },
      { name: "Development Velocity", unit: "story points" },
    ],
    client: [
      { name: "Client Satisfaction Score", unit: "1-10" },
      { name: "Client Retention Rate", unit: "%" },
      { name: "Support Response Time", unit: "hours" },
      { name: "Issue Resolution Time", unit: "hours" },
      { name: "Client Engagement", unit: "interactions/month" },
    ],
    hr: [
      { name: "Employee Satisfaction", unit: "1-10" },
      { name: "Employee Turnover", unit: "%" },
      { name: "Training Hours", unit: "hours" },
      { name: "Time to Hire", unit: "days" },
      { name: "Absenteeism Rate", unit: "%" },
    ],
    product: [
      { name: "Feature Adoption Rate", unit: "%" },
      { name: "User Growth Rate", unit: "%" },
      { name: "System Uptime", unit: "%" },
      { name: "API Response Time", unit: "ms" },
      { name: "Bug Fix Time", unit: "hours" },
      { name: "Release Frequency", unit: "per month" },
    ],
  };

  // Time periods to generate metrics for
  const now = new Date();
  const dates = [];

  // Generate dates for the last 12 months (one per month)
  for (let i = 0; i < 12; i++) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    date.setDate(15);
    dates.push(date);
  }

  // Generate company-wide metrics for each category and date
  for (const category in metricTypes) {
    const metrics = metricTypes[category as keyof typeof metricTypes];

    for (const metric of metrics) {
      for (const date of dates) {
        // Generate a realistic value for this metric
        let value: number;

        // Different logic based on metric type to create realistic values
        if (metric.unit === "%") {
          // Percentage values between 0-100
          value = Math.round((60 + Math.random() * 40) * 10) / 10;
        } else if (metric.unit === "1-10") {
          // Rating scale values
          value = Math.round((6 + Math.random() * 4) * 10) / 10;
        } else if (metric.unit.includes("USD")) {
          // Financial values
          value = Math.round(10000 + Math.random() * 90000);
        } else {
          // Other numerical values
          value = Math.round((10 + Math.random() * 90) * 10) / 10;
        }

        // Add some trend/seasonality to make data more realistic
        // Make older data slightly lower on average to simulate growth
        const monthsAgo = dates.indexOf(date);
        const trendFactor = 1 - monthsAgo * 0.01;
        // Add seasonal variations
        const month = date.getMonth();
        const seasonalFactor = 1 + Math.sin((month / 12) * Math.PI * 2) * 0.05;

        value = Math.round(value * trendFactor * seasonalFactor * 10) / 10;

        await tx
          .insert(schema.metrics)
          .values({
            id: createId(),
            name: metric.name,
            value: value.toString(),
            unit: metric.unit,
            date: date,
            category: category,
            entityId: null,
            entityType: null,
            createdAt: date,
          })
          .execute();
      }
    }
  }

  // Generate project-specific metrics for a subset of projects
  if (projectIds.length > 0) {
    const selectedProjects = projectIds
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.min(5, projectIds.length));

    const projectMetrics = [
      { name: "Project Progress", unit: "%", category: "project" },
      { name: "Task Completion Rate", unit: "%", category: "project" },
      { name: "Resource Utilization", unit: "%", category: "project" },
      { name: "Budget Spent", unit: "USD", category: "financial" },
      { name: "Budget Remaining", unit: "USD", category: "financial" },
      { name: "Milestone Achievement", unit: "%", category: "project" },
    ];

    for (const projectId of selectedProjects) {
      // Get project info for more accurate metrics
      const project = await tx.query.projects
        .findFirst({
          where: eq(schema.projects.id, projectId),
        })
        .execute();

      if (!project) continue;

      // Generate monthly metrics for the project lifetime
      const projectStartDate = project.startDate
        ? new Date(project.startDate)
        : new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

      const projectEndDate =
        project.actualEndDate || project.targetEndDate || new Date();

      const months = [];
      let currentDate = new Date(projectStartDate);

      // Generate dates for each month of the project
      while (currentDate <= projectEndDate) {
        months.push(new Date(currentDate));
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      // If there are no months (very short project), add at least one date point
      if (months.length === 0) {
        months.push(new Date(projectStartDate));
      }

      for (const metric of projectMetrics) {
        const projectBudget = Number(project.budget);
        let previousValue =
          metric.name === "Budget Remaining" ? projectBudget : 0;

        for (let i = 0; i < months.length; i++) {
          const date = months[i];
          const progress = i / Math.max(1, months.length - 1);

          // Generate a value based on metric type and project progress
          let value: number;

          if (metric.name === "Project Progress") {
            // Progress starts at 0 and increases to nearly 100%
            value = Math.min(98, Math.round(progress * 100));
          } else if (metric.name === "Budget Spent") {
            // Budget spent increases throughout the project
            value = Math.round(
              projectBudget * progress * (0.8 + Math.random() * 0.4)
            );
          } else if (metric.name === "Budget Remaining") {
            // Budget remaining decreases throughout the project
            value = Math.max(
              0,
              previousValue - projectBudget * (0.1 + Math.random() * 0.2)
            );
            previousValue = value;
          } else if (metric.name === "Milestone Achievement") {
            // Milestone achievement follows a more stepwise function
            value = Math.round(progress * 100 * (0.8 + Math.random() * 0.4));
          } else {
            // Other metrics vary more randomly but follow a trend
            value =
              Math.round((50 + progress * 40 + Math.random() * 20) * 10) / 10;
          }

          await tx
            .insert(schema.metrics)
            .values({
              id: createId(),
              name: metric.name,
              value: value.toString(),
              unit: metric.unit,
              date: date,
              category: metric.category,
              entityId: projectId,
              entityType: "project",
              createdAt: date,
            })
            .execute();
        }
      }
    }
  }
}
