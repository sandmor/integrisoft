import { faker } from "@faker-js/faker";
import { db } from "@/lib/db";
import { createId } from "@paralleldrive/cuid2";
import * as schema from "@/lib/db/schema";
import { eq, not, inArray } from "drizzle-orm";

// Generate system settings
export async function generateSystemSettings(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
) {
  // Define system settings by category
  const settingsByCategory = {
    general: [
      {
        key: "company_name",
        value: "Integrisoft Solutions",
        description: "Company name used throughout the system",
        isPublic: true,
      },
      {
        key: "company_logo_url",
        value: "https://assets.example.com/logo.png",
        description: "URL to the company logo image",
        isPublic: true,
      },
      {
        key: "company_address",
        value: "123 Tech Park, Innovation Boulevard, Silicon Valley, CA 94043",
        description: "Company physical address",
        isPublic: true,
      },
      {
        key: "company_phone",
        value: "+1 (555) 123-4567",
        description: "Company main contact phone number",
        isPublic: true,
      },
      {
        key: "company_email",
        value: "info@integrisoft-solutions.com",
        description: "Company main contact email",
        isPublic: true,
      },
      {
        key: "fiscal_year_start_month",
        value: "1",
        description: "The month (1-12) when fiscal year starts",
        isPublic: false,
      },
    ],
    email: [
      {
        key: "smtp_server",
        value: "smtp.integrisoft-solutions.com",
        description: "SMTP server address for sending emails",
        isPublic: false,
      },
      {
        key: "smtp_port",
        value: "587",
        description: "SMTP server port",
        isPublic: false,
      },
      {
        key: "smtp_use_tls",
        value: "true",
        description: "Whether to use TLS for SMTP connections",
        isPublic: false,
      },
      {
        key: "email_from_address",
        value: "noreply@integrisoft-solutions.com",
        description: "Default from address for system emails",
        isPublic: false,
      },
      {
        key: "email_signature",
        value: "Regards,\nThe Integrisoft Team\nwww.integrisoft-solutions.com",
        description: "Default signature for system emails",
        isPublic: false,
      },
    ],
    security: [
      {
        key: "password_min_length",
        value: "8",
        description: "Minimum password length requirement",
        isPublic: true,
      },
      {
        key: "password_require_uppercase",
        value: "true",
        description: "Require uppercase letter in password",
        isPublic: true,
      },
      {
        key: "password_require_numbers",
        value: "true",
        description: "Require numbers in password",
        isPublic: true,
      },
      {
        key: "password_require_special_chars",
        value: "true",
        description: "Require special characters in password",
        isPublic: true,
      },
      {
        key: "max_login_attempts",
        value: "5",
        description: "Maximum login attempts before account lock",
        isPublic: false,
      },
      {
        key: "session_timeout_minutes",
        value: "60",
        description: "Session timeout in minutes",
        isPublic: false,
      },
      {
        key: "mfa_enabled",
        value: "false",
        description:
          "Whether multi-factor authentication is enabled system-wide",
        isPublic: false,
      },
    ],
    notifications: [
      {
        key: "enable_email_notifications",
        value: "true",
        description: "Whether to send email notifications",
        isPublic: true,
      },
      {
        key: "enable_browser_notifications",
        value: "true",
        description: "Whether to enable browser notifications",
        isPublic: true,
      },
      {
        key: "daily_digest_time",
        value: "08:00",
        description: "Time for sending daily digests (HH:MM)",
        isPublic: false,
      },
    ],
    projects: [
      {
        key: "default_project_status",
        value: "planning",
        description: "Default status for new projects",
        isPublic: false,
      },
      {
        key: "enable_time_tracking",
        value: "true",
        description: "Whether time tracking is enabled for tasks",
        isPublic: false,
      },
      {
        key: "default_task_priority",
        value: "2",
        description: "Default priority for new tasks (1=low, 2=medium, 3=high)",
        isPublic: false,
      },
      {
        key: "auto_update_project_status",
        value: "true",
        description: "Automatically update project status based on tasks",
        isPublic: false,
      },
    ],
    finance: [
      {
        key: "default_currency",
        value: "USD",
        description: "Default currency for financial operations",
        isPublic: true,
      },
      {
        key: "display_currency_symbol",
        value: "true",
        description: "Whether to display currency symbol in financial data",
        isPublic: true,
      },
      {
        key: "tax_rate",
        value: "7.5",
        description: "Default tax rate percentage",
        isPublic: false,
      },
      {
        key: "invoice_due_days",
        value: "30",
        description: "Default number of days until invoices are due",
        isPublic: false,
      },
    ],
    hr: [
      {
        key: "working_hours_per_day",
        value: "8",
        description: "Standard working hours per day",
        isPublic: true,
      },
      {
        key: "working_days_per_week",
        value: "5",
        description: "Standard working days per week",
        isPublic: true,
      },
      {
        key: "vacation_days_per_year",
        value: "21",
        description: "Standard vacation days per year",
        isPublic: true,
      },
      {
        key: "sick_days_per_year",
        value: "10",
        description: "Standard sick days per year",
        isPublic: true,
      },
    ],
    ui: [
      {
        key: "default_theme",
        value: "light",
        description: "Default UI theme (light/dark)",
        isPublic: true,
      },
      {
        key: "default_language",
        value: "en",
        description: "Default language code for UI",
        isPublic: true,
      },
      {
        key: "items_per_page",
        value: "20",
        description: "Default number of items in pagination",
        isPublic: true,
      },
      {
        key: "date_format",
        value: "YYYY-MM-DD",
        description: "Default date format for display",
        isPublic: true,
      },
      {
        key: "time_format",
        value: "HH:mm",
        description: "Default time format for display",
        isPublic: true,
      },
      {
        key: "primary_color",
        value: "#3498db",
        description: "Primary color for UI elements",
        isPublic: true,
      },
      {
        key: "secondary_color",
        value: "#2ecc71",
        description: "Secondary color for UI elements",
        isPublic: true,
      },
    ],
  };

  // Insert all settings
  for (const category in settingsByCategory) {
    const settings =
      settingsByCategory[category as keyof typeof settingsByCategory];

    for (const setting of settings) {
      await tx
        .insert(schema.systemSettings)
        .values({
          id: createId(),
          key: setting.key,
          value: setting.value,
          description: setting.description,
          category: category,
          isPublic: setting.isPublic,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
        })
        .execute();
    }
  }
}

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
      /*const readAt = isRead
        ? faker.date.between({ from: createdAt, to: now })
        : null;*/

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
