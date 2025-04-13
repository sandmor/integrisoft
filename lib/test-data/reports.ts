import { faker } from "@faker-js/faker";
import { db } from "@/lib/db";
import { createId } from "@paralleldrive/cuid2";
import * as schema from "@/lib/db/schema";

// Generate saved reports
export async function generateSavedReports(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userIds: string[]
) {
  // Report templates by type
  const reportTemplates = {
    financial: [
      {
        name: "Monthly Revenue Report",
        description: "Monthly breakdown of revenue by category and client",
        parameters: {
          period: "monthly",
          compareWithPrevious: true,
          showCharts: true,
          groupBy: "category",
        },
      },
      {
        name: "Quarterly Expense Analysis",
        description: "Detailed analysis of expenses by cost center",
        parameters: {
          period: "quarterly",
          compareWithPrevious: true,
          showCharts: true,
          groupBy: "costCenter",
          includeTransactionDetails: false,
        },
      },
      {
        name: "Annual Budget Overview",
        description: "Budget vs. actual spending for the fiscal year",
        parameters: {
          period: "annual",
          compareWithPrevious: true,
          showCharts: true,
          includeForecast: true,
        },
      },
      {
        name: "Project Profitability",
        description: "Profitability analysis for all active projects",
        parameters: {
          status: ["active", "completed"],
          sortBy: "profitMargin",
          showCharts: true,
        },
      },
      {
        name: "Cash Flow Forecast",
        description: "6-month cash flow projection based on current data",
        parameters: {
          months: 6,
          includeConfirmedOnly: false,
          showMonthlyBreakdown: true,
          showCharts: true,
        },
      },
    ],
    project: [
      {
        name: "Project Status Overview",
        description: "Status summary of all active projects",
        parameters: {
          status: ["planning", "active", "on_hold"],
          sortBy: "dueDate",
          showProgressChart: true,
          showMilestones: true,
        },
      },
      {
        name: "Delayed Tasks Report",
        description: "List of overdue tasks across all projects",
        parameters: {
          overdueOnly: true,
          groupBy: "project",
          includeUnassigned: true,
        },
      },
      {
        name: "Resource Allocation",
        description: "Current allocation of employees across projects",
        parameters: {
          thresholdPercentage: 90,
          highlightOverallocated: true,
          groupBy: "department",
          showCharts: true,
        },
      },
      {
        name: "Project Timeline",
        description: "Gantt chart view of project timelines and milestones",
        parameters: {
          timeframe: "6months",
          showDependencies: true,
          highlightCriticalPath: true,
          showBaseline: true,
        },
      },
      {
        name: "Task Completion Trends",
        description: "Analysis of task completion rates over time",
        parameters: {
          period: "quarterly",
          groupBy: "project",
          showTrends: true,
          includeEstimates: true,
        },
      },
    ],
    hr: [
      {
        name: "Employee Directory",
        description:
          "Complete listing of all employees with contact information",
        parameters: {
          includeInactive: false,
          sortBy: "department",
          exportFormat: "xlsx",
        },
      },
      {
        name: "Department Headcount",
        description: "Headcount analysis by department with historical trends",
        parameters: {
          compareYoY: true,
          showVacancies: true,
          showCharts: true,
        },
      },
      {
        name: "Skills Matrix",
        description: "Overview of employee skills and proficiency levels",
        parameters: {
          minProficiency: 3,
          groupBy: "department",
          highlightGaps: true,
          showHeatmap: true,
        },
      },
      {
        name: "Employee Utilization",
        description: "Utilization rates for billable employees",
        parameters: {
          period: "quarterly",
          targetUtilization: 80,
          highlightUnderperforming: true,
          showTrends: true,
        },
      },
    ],
    client: [
      {
        name: "Client Engagement Summary",
        description: "Overview of recent interactions with key clients",
        parameters: {
          period: "90days",
          priorityClientsOnly: true,
          includeProjects: true,
          sortBy: "lastInteraction",
        },
      },
      {
        name: "Support SLA Compliance",
        description: "Analysis of SLA compliance rates for client support",
        parameters: {
          period: "quarterly",
          groupBy: "client",
          highlightViolations: true,
          showTrends: true,
        },
      },
      {
        name: "Client Satisfaction Trends",
        description: "Trends in client satisfaction scores over time",
        parameters: {
          period: "annual",
          groupBy: "industry",
          compareWithTargets: true,
          showCharts: true,
        },
      },
      {
        name: "Account Growth Opportunities",
        description:
          "Analysis of potential upsell/cross-sell opportunities by client",
        parameters: {
          minimumRelationship: "1year",
          sortBy: "potentialValue",
          showRecommendations: true,
        },
      },
    ],
    product: [
      {
        name: "Product Version Status",
        description: "Status of all product versions currently maintained",
        parameters: {
          includeDeprecated: false,
          groupBy: "product",
          showReleaseNotes: false,
        },
      },
      {
        name: "Feature Adoption Rates",
        description: "Analysis of feature adoption rates across products",
        parameters: {
          minReleaseAge: "90days",
          belowTargetOnly: false,
          showTrends: true,
          targetAdoption: 60,
        },
      },
      {
        name: "Product Dependency Map",
        description: "Visualization of dependencies between products",
        parameters: {
          showVersionConstraints: true,
          highlightCritical: true,
          showExternalDependencies: true,
        },
      },
      {
        name: "Product Roadmap",
        description: "Consolidated roadmap of planned features and releases",
        parameters: {
          timeframe: "12months",
          groupBy: "product",
          showMilestones: true,
          includeSpeculative: false,
        },
      },
    ],
  };

  // Generate 15-30 saved reports distributed across users
  const reportCount = 15 + Math.floor(Math.random() * 16);
  const reportTypes = Object.keys(reportTemplates);

  for (let i = 0; i < reportCount; i++) {
    // Select a random report type
    const reportType =
      reportTypes[Math.floor(Math.random() * reportTypes.length)];
    const templates =
      reportTemplates[reportType as keyof typeof reportTemplates];

    // Select a random template for this type
    const template = templates[Math.floor(Math.random() * templates.length)];

    // Select a random user who created this report
    const createdById = userIds[Math.floor(Math.random() * userIds.length)];

    // Determine if this is a public or private report (30% chance of being public)
    const isPublic = Math.random() < 0.3;

    // Occasionally customize the name to make it more unique (20% chance)
    let name = template.name;
    if (Math.random() < 0.2) {
      const customizations = [
        `${name} - ${faker.date.month()} Edition`,
        `Custom ${name}`,
        `${name} for Executive Review`,
        `${name} (${faker.date.recent().getFullYear()})`,
        `${faker.word.adjective()} ${name}`,
      ];
      name = customizations[Math.floor(Math.random() * customizations.length)];
    }

    // Add some variations to the parameters
    const parameters = { ...template.parameters };

    // Add created/modified dates
    const createdAt = faker.date.past();
    const updatedAt = faker.date.between({ from: createdAt, to: new Date() });

    // Insert the report
    await tx
      .insert(schema.savedReports)
      .values({
        id: createId(),
        name,
        description: template.description,
        type: reportType,
        parameters,
        createdById,
        isPublic,
        createdAt,
        updatedAt,
        isDeleted: Math.random() > 0.95,
      })
      .execute();
  }
}
