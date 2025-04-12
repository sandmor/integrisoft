import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  date,
  json,
  uniqueIndex,
  decimal,
  pgEnum,
  AnyPgColumn,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";

// ==================== ENUMS ====================

// User role enum
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "manager",
  "employee",
]);

// Project status enum
export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled",
]);

// Task status enum
export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "review",
  "done",
]);

// Product version status enum
export const versionStatusEnum = pgEnum("version_status", [
  "development",
  "qa",
  "production",
  "deprecated",
]);

// Transaction type enum
export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "expense",
  "transfer",
]);

// ==================== USERS AND AUTHENTICATION ====================

// Users table
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  name: text("name").notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  role: userRoleEnum("role").notNull().default("employee"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastLogin: timestamp("last_login"),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

// Sessions table
export const sessions = pgTable("sessions", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  token: varchar("session_token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires").notNull(),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Accounts table
export const accounts = pgTable("accounts", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  accountId: varchar("account_id", { length: 255 }).notNull(),
  providerId: varchar("provider_id", { length: 255 }).notNull(),
  accessToken: varchar("access_token", { length: 255 }),
  refreshToken: varchar("refresh_token", { length: 255 }),
  accessTokenExpiresAt: timestamp("access_token_expires"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires"),
  scope: varchar("scope", { length: 255 }),
  idToken: varchar("id_token", { length: 255 }),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// User verification table
export const verifications = pgTable("user_verifications", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  value: varchar("value", { length: 255 }).notNull(),
  expiresAt: timestamp("expires").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Permissions table
export const permissions = pgTable("permissions", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  module: varchar("module", { length: 50 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(), // create, read, update, delete
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Role permissions mapping
export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(() => createId()),
    role: userRoleEnum("role").notNull(),
    permissionId: text("permission_id")
      .notNull()
      .references(() => permissions.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => {
    return {
      rolePermissionUnique: uniqueIndex("role_permission_unique_idx").on(
        table.role,
        table.permissionId
      ),
    };
  }
);

// ==================== EMPLOYEES ====================

// Departments table
export const departments = pgTable("departments", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  managerId: text("manager_id").references((): AnyPgColumn => employees.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

// Positions table
export const positions = pgTable("positions", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description"),
  departmentId: text("department_id").references(
    (): AnyPgColumn => departments.id
  ),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

// Skills table
export const skills = pgTable("skills", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  name: varchar("name", { length: 100 }).notNull().unique(),
  category: varchar("category", { length: 50 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

// Employees table
export const employees = pgTable("employees", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .references(() => users.id)
    .unique(),
  positionId: text("position_id").references(() => positions.id),
  departmentId: text("department_id").references(() => departments.id),
  hireDate: date("hire_date", { mode: "date" }).notNull(),
  salary: decimal("salary", { precision: 10, scale: 2 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 30 }),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

// Employee skills mapping
export const employeeSkills = pgTable(
  "employee_skills",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(() => createId()),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id),
    proficiencyLevel: integer("proficiency_level").notNull().default(1), // 1-5 scale
    yearsExperience: decimal("years_experience", { precision: 4, scale: 1 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => {
    return {
      employeeSkillUnique: uniqueIndex("employee_skill_unique_idx").on(
        table.employeeId,
        table.skillId
      ),
    };
  }
);

// ==================== FINANCE ====================

// Cost centers
export const costCenters = pgTable("cost_centers", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  budget: decimal("budget", { precision: 15, scale: 2 }),
  departmentId: text("department_id").references(() => departments.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

// Transaction categories
export const transactionCategories = pgTable("transaction_categories", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  name: varchar("name", { length: 100 }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  description: text("description"),
  parentCategoryId: text("parent_category_id").references(
    (): AnyPgColumn => transactionCategories.id
  ),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

// Financial transactions
export const transactions = pgTable("transactions", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  categoryId: text("category_id").references(() => transactionCategories.id),
  costCenterId: text("cost_center_id").references(() => costCenters.id),
  projectId: text("project_id").references(() => projects.id),
  createdById: text("created_by_id").references(() => users.id),
  approvedById: text("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

// Budgets
export const budgets = pgTable("budgets", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  name: varchar("name", { length: 100 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  startDate: date("start_date", { mode: "date" }).notNull(),
  endDate: date("end_date", { mode: "date" }).notNull(),
  costCenterId: text("cost_center_id").references(() => costCenters.id),
  projectId: text("project_id").references(() => projects.id),
  description: text("description"),
  createdById: text("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

// ==================== PRODUCTS ====================

// Products table
export const products = pgTable("products", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  repositoryUrl: varchar("repository_url", { length: 255 }),
  documentationUrl: varchar("documentation_url", { length: 255 }),
  productManager: text("product_manager").references(() => employees.id),
  techLead: text("tech_lead").references(() => employees.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

// Product versions
export const productVersions = pgTable(
  "product_versions",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(() => createId()),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    versionNumber: varchar("version_number", { length: 50 }).notNull(),
    status: versionStatusEnum("status").notNull().default("development"),
    releaseDate: date("release_date", { mode: "date" }),
    releaseNotes: text("release_notes"),
    createdById: text("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    isDeleted: boolean("is_deleted").notNull().default(false),
  },
  (table) => {
    return {
      productVersionUnique: uniqueIndex("product_version_unique_idx").on(
        table.productId,
        table.versionNumber
      ),
    };
  }
);

// Technical specifications
export const technicalSpecs = pgTable("technical_specs", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  versionId: text("version_id").references(() => productVersions.id),
  name: varchar("name", { length: 100 }).notNull(),
  content: text("content").notNull(),
  createdById: text("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

// Dependencies between products
export const productDependencies = pgTable(
  "product_dependencies",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(() => createId()),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    dependsOnProductId: text("depends_on_product_id")
      .notNull()
      .references(() => products.id),
    versionConstraint: varchar("version_constraint", { length: 50 }),
    description: text("description"),
    isCritical: boolean("is_critical").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => {
    return {
      productDependencyUnique: uniqueIndex("product_dependency_unique_idx").on(
        table.productId,
        table.dependsOnProductId
      ),
    };
  }
);

// ==================== PROJECTS ====================

// Projects table
export const projects = pgTable("projects", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  status: projectStatusEnum("status").notNull().default("planning"),
  startDate: date("start_date", { mode: "date" }),
  targetEndDate: date("target_end_date", { mode: "date" }),
  actualEndDate: date("actual_end_date", { mode: "date" }),
  clientId: text("client_id").references(() => clients.id),
  productId: text("product_id").references(() => products.id),
  budget: decimal("budget", { precision: 15, scale: 2 }),
  managerId: text("manager_id").references(() => employees.id),
  createdById: text("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

// Project milestones
export const milestones = pgTable("milestones", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  dueDate: date("due_date", { mode: "date" }).notNull(),
  completedDate: date("completed_date", { mode: "date" }),
  isCompleted: boolean("is_completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

// Project tasks
export const tasks = pgTable("tasks", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  milestoneId: text("milestone_id").references(() => milestones.id),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("todo"),
  priority: integer("priority").notNull().default(2), // 1=low, 2=medium, 3=high
  assignedToId: text("assigned_to_id").references(() => employees.id),
  createdById: text("created_by_id").references(() => users.id),
  estimatedHours: decimal("estimated_hours", { precision: 6, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 6, scale: 2 }),
  dueDate: date("due_date", { mode: "date" }),
  startDate: date("start_date", { mode: "date" }),
  completedDate: date("completed_date", { mode: "date" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

// Project team members
export const projectTeamMembers = pgTable(
  "project_team_members",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(() => createId()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id),
    role: varchar("role", { length: 100 }).notNull(),
    allocationPercentage: integer("allocation_percentage")
      .notNull()
      .default(100),
    startDate: date("start_date", { mode: "date" }).notNull(),
    endDate: date("end_date", { mode: "date" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    isDeleted: boolean("is_deleted").notNull().default(false),
  },
  (table) => {
    return {
      projectEmployeeUnique: uniqueIndex("project_employee_unique_idx").on(
        table.projectId,
        table.employeeId
      ),
    };
  }
);

// ==================== CLIENTS ====================

// Clients table
export const clients = pgTable("clients", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  name: varchar("name", { length: 200 }).notNull(),
  industry: varchar("industry", { length: 100 }),
  website: varchar("website", { length: 255 }),
  address: text("address"),
  accountManagerId: text("account_manager_id").references(() => employees.id),
  createdById: text("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

// Client contacts
export const clientContacts = pgTable("client_contacts", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  clientId: text("client_id")
    .notNull()
    .references(() => clients.id),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  position: varchar("position", { length: 100 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

// Contracts
export const contracts = pgTable("contracts", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  clientId: text("client_id")
    .notNull()
    .references(() => clients.id),
  projectId: text("project_id").references(() => projects.id),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  startDate: date("start_date", { mode: "date" }).notNull(),
  endDate: date("end_date", { mode: "date" }),
  value: decimal("value", { precision: 15, scale: 2 }),
  termsAndConditions: text("terms_and_conditions"),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  createdById: text("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

// Client interactions
export const clientInteractions = pgTable("client_interactions", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  clientId: text("client_id")
    .notNull()
    .references(() => clients.id),
  contactId: text("contact_id").references(() => clientContacts.id),
  employeeId: text("employee_id").references(() => employees.id),
  type: varchar("type", { length: 50 }).notNull(), // email, call, meeting, etc.
  date: timestamp("date").notNull(),
  summary: text("summary").notNull(),
  details: text("details"),
  followUpDate: date("follow_up_date", { mode: "date" }),
  followUpNotes: text("follow_up_notes"),
  createdById: text("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

// Service Level Agreements
export const serviceLevelAgreements = pgTable("service_level_agreements", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  clientId: text("client_id")
    .notNull()
    .references(() => clients.id),
  contractId: text("contract_id").references(() => contracts.id),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  responseTimeHours: decimal("response_time_hours", { precision: 5, scale: 2 }),
  resolutionTimeHours: decimal("resolution_time_hours", {
    precision: 5,
    scale: 2,
  }),
  uptimePercentage: decimal("uptime_percentage", { precision: 5, scale: 2 }),
  startDate: date("start_date", { mode: "date" }).notNull(),
  endDate: date("end_date", { mode: "date" }),
  createdById: text("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

// ==================== AUDITING AND LOGGING ====================

// System logs
export const systemLogs = pgTable("system_logs", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  userId: text("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  module: varchar("module", { length: 50 }).notNull(),
  details: json("details"),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Change history
export const changeHistory = pgTable("change_history", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: text("entity_id").notNull(),
  action: varchar("action", { length: 20 }).notNull(), // create, update, delete
  changes: json("changes"),
  userId: text("user_id").references(() => users.id),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// ==================== REPORTS AND METRICS ====================

// Saved reports
export const savedReports = pgTable("saved_reports", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull(),
  parameters: json("parameters"),
  createdById: text("created_by_id").references(() => users.id),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

// Metrics
export const metrics = pgTable("metrics", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  value: decimal("value", { precision: 15, scale: 5 }).notNull(),
  unit: varchar("unit", { length: 20 }),
  date: date("date", { mode: "date" }).notNull(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: text("entity_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  metadata: json("metadata"),
});

// ==================== NOTIFICATIONS ====================

// Notifications
export const notifications = pgTable("notifications", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // info, warning, error, success
  isRead: boolean("is_read").notNull().default(false),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: text("entity_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ==================== SETTINGS ====================

// System settings
export const systemSettings = pgTable("system_settings", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Export relationships for better type safety with Drizzle
export const usersRelations = relations(users, ({ one }) => ({
  employees: one(employees, {
    fields: [users.id],
    references: [employees.userId],
  }),
}));

export const employeesRelations = relations(employees, ({ one }) => ({
  users: one(users, {
    fields: [employees.userId],
    references: [users.id],
  }),
  departments: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  positions: one(positions, {
    fields: [employees.positionId],
    references: [positions.id],
  }),
}));

export const departmentsRelations = relations(departments, ({ one }) => ({
  manager: one(employees, {
    fields: [departments.managerId],
    references: [employees.id],
    relationName: "manager",
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  clients: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  employees: one(employees, {
    fields: [projects.managerId],
    references: [employees.id],
    relationName: "manager",
  }),
  teamMembers: many(projectTeamMembers, {
    relationName: "teamMembers",
  }),
  products: one(products, {
    fields: [projects.productId],
    references: [products.id],
  }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  employees: one(employees, {
    fields: [clients.accountManagerId],
    references: [employees.id],
    relationName: "accountManager",
  }),
  projects: many(projects),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  employees: one(employees, {
    fields: [products.productManager],
    references: [employees.id],
    relationName: "productManager",
  }),
  techLead: one(employees, {
    fields: [products.techLead],
    references: [employees.id],
    relationName: "techLead",
  }),
  projects: many(projects),
  versions: many(productVersions),
}));
