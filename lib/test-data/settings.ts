import { faker } from "@faker-js/faker";
import { db } from "@/lib/db";
import { createId } from "@paralleldrive/cuid2";
import * as schema from "@/lib/db/schema";

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
