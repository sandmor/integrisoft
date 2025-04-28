import * as schema from "../db/schema";
import { faker } from "@faker-js/faker";
import { createId } from "@paralleldrive/cuid2";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db";

// Generate products
export async function generateProducts(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  employeeIds: string[],
  count: number
): Promise<string[]> {
  const productIds: string[] = [];

  const productNames = [
    "ProjectPro",
    "TaskMaster",
    "AnalyticsHub",
    "CloudSync",
    "SecureConnect",
    "DataFlow",
    "DevPortal",
    "UserInsight",
    "APIGateway",
    "PerformanceTracker",
    "CustomerHub",
    "ResourcePlanner",
  ];

  const shuffledProductNames = [...productNames].sort(
    () => 0.5 - Math.random()
  );
  const finalProductNames = shuffledProductNames.slice(
    0,
    Math.min(count, productNames.length)
  );

  // Get potential product managers and tech leads
  const potentialManagers = await tx.query.employees.findMany({
    with: {
      position: true,
      user: true,
    },
  });

  // Fetch user roles for all potential managers
  const userRoleRecs = await tx.query.userRoles.findMany({
    where: inArray(
      schema.userRoles.userId,
      potentialManagers.map((e) => e.userId!)
    ),
    with: { role: true },
  });
  const rolesByUser: Record<string, string[]> = {};
  for (const rec of userRoleRecs) {
    if (!rolesByUser[rec.userId]) rolesByUser[rec.userId] = [];
    rolesByUser[rec.userId].push(rec.role.name);
  }

  // Filter suitable employees for product manager role
  const productManagerCandidates = potentialManagers.filter((emp) => {
    const userRoles = rolesByUser[emp.userId!] || [];
    return (
      emp.position?.title?.includes("Product") ||
      emp.position?.title?.includes("Manager") ||
      userRoles.some((r) => r.endsWith("Manager"))
    );
  });

  // Filter suitable employees for tech lead role
  const techLeadCandidates = potentialManagers.filter(
    (emp) =>
      emp.position?.title?.includes("Engineer") ||
      emp.position?.title?.includes("Lead") ||
      emp.position?.title?.includes("Architect")
  );

  for (let i = 0; i < finalProductNames.length; i++) {
    const productId = createId();
    const productName = finalProductNames[i];

    // Pick random managers if candidates are available, otherwise null
    const productManager =
      productManagerCandidates.length > 0
        ? productManagerCandidates[
            Math.floor(Math.random() * productManagerCandidates.length)
          ].id
        : null;

    const techLead =
      techLeadCandidates.length > 0
        ? techLeadCandidates[
            Math.floor(Math.random() * techLeadCandidates.length)
          ].id
        : null;

    // Random repository format
    const repoFormats = [
      `https://github.com/integrisoft/${productName
        .toLowerCase()
        .replace(/\s+/g, "-")}`,
      `https://gitlab.com/integrisoft/${productName
        .toLowerCase()
        .replace(/\s+/g, "-")}`,
      `https://dev.azure.com/integrisoft/${productName
        .toLowerCase()
        .replace(/\s+/g, "-")}`,
    ];

    // Random documentation format
    const docFormats = [
      `https://docs.integrisoft.com/${productName
        .toLowerCase()
        .replace(/\s+/g, "-")}`,
      `https://integrisoft.notion.site/${productName}-Documentation-${faker.string.alphanumeric(
        8
      )}`,
      `https://confluence.integrisoft.com/display/${productName.toUpperCase()}`,
    ];

    await tx
      .insert(schema.products)
      .values({
        id: productId,
        name: productName,
        description: faker.commerce.productDescription(),
        repositoryUrl:
          repoFormats[Math.floor(Math.random() * repoFormats.length)],
        documentationUrl:
          docFormats[Math.floor(Math.random() * docFormats.length)],
        productManager,
        techLead,
        createdAt: faker.date.past({ years: 3 }),
        updatedAt: faker.date.recent({ days: 60 }),
        isDeleted: false,
      })
      .execute();

    productIds.push(productId);
  }

  return productIds;
}

// Generate product versions
export async function generateProductVersions(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  productIds: string[],
  userIds: string[]
) {
  const versionStatuses = ["development", "qa", "production", "deprecated"];

  for (const productId of productIds) {
    // Get product details
    const product = await tx.query.products.findFirst({
      where: eq(schema.products.id, productId),
    });

    if (!product) continue;

    // Determine number of versions (2-6) based on product creation date
    const productAge = new Date().getTime() - product.createdAt.getTime();
    const ageInYears = productAge / (1000 * 60 * 60 * 24 * 365);
    const versionCount = Math.max(
      2,
      Math.min(6, Math.floor(ageInYears * 2 + Math.random() * 2))
    );

    // Generate semantic versions
    const majorVersions = Math.ceil(versionCount / 3); // Every ~3 versions gets a major bump

    let currentMajor = 1;
    let currentMinor = 0;
    let currentPatch = 0;

    const versions = [];

    // Generate version history in chronological order
    for (let i = 0; i < versionCount; i++) {
      // Decide which part to increment
      if (i > 0 && i % 3 === 0) {
        // Major version bump every ~3 versions
        currentMajor++;
        currentMinor = 0;
        currentPatch = 0;
      } else if (i > 0) {
        // Minor bump most of the time
        currentMinor++;
        currentPatch = 0;

        // Sometimes add patch releases
        if (Math.random() < 0.3) {
          const patchCount = 1 + Math.floor(Math.random() * 3); // 1-3 patches

          for (let p = 1; p <= patchCount; p++) {
            versions.push({
              major: currentMajor,
              minor: currentMinor - 1, // Patch for previous minor
              patch: p,
            });
          }
        }
      }

      versions.push({
        major: currentMajor,
        minor: currentMinor,
        patch: currentPatch,
      });
    }

    // Sort versions chronologically and assign statuses
    for (let i = 0; i < versions.length; i++) {
      const version = versions[i];
      const versionNumber = `${version.major}.${version.minor}.${version.patch}`;

      // Determine version status based on position in history
      let status;
      if (i === versions.length - 1) {
        // Latest version is in development or QA
        status = Math.random() < 0.7 ? "development" : "qa";
      } else if (i === versions.length - 2) {
        // Second latest is in QA or production
        status = Math.random() < 0.3 ? "qa" : "production";
      } else if (i > versions.length - 5) {
        // Recent versions are in production
        status = "production";
      } else {
        // Older versions are deprecated
        status = "deprecated";
      }

      // Determine release date based on status and position
      let releaseDate = null;
      if (status !== "development") {
        // Calculate a release date that makes sense chronologically
        const now = new Date();
        const ageOffset =
          (versions.length - i) * (2 + Math.floor(Math.random() * 4)); // months ago
        releaseDate = new Date(
          now.getFullYear(),
          now.getMonth() - ageOffset,
          now.getDate() - Math.floor(Math.random() * 28)
        );
      }

      // Generate release notes
      const releaseNotes =
        status === "development"
          ? "In development"
          : generateReleaseNotes(versionNumber, status);

      // Random creator from users
      const createdById = userIds[Math.floor(Math.random() * userIds.length)];

      // Insert version
      await tx
        .insert(schema.productVersions)
        .values({
          id: createId(),
          productId,
          versionNumber,
          status: status as any,
          releaseDate,
          releaseNotes,
          createdById,
          createdAt: releaseDate || faker.date.recent({ days: 30 }),
          updatedAt: faker.date.recent({ days: 7 }),
          isDeleted: false,
        })
        .execute();
    }
  }
}

// Helper to generate release notes
function generateReleaseNotes(version: string, status: string): string {
  if (status === "development") {
    return "In development";
  }

  let features = [];
  let bugfixes = [];
  let improvements = [];

  // Generate 1-5 features
  const featureCount = 1 + Math.floor(Math.random() * 5);
  for (let i = 0; i < featureCount; i++) {
    features.push(
      faker.commerce.productAdjective() +
        " " +
        faker.commerce.product() +
        " " +
        ["feature", "functionality", "system", "module"][
          Math.floor(Math.random() * 4)
        ]
    );
  }

  // Generate 0-8 bugfixes
  const bugfixCount = Math.floor(Math.random() * 9);
  for (let i = 0; i < bugfixCount; i++) {
    bugfixes.push(
      "Fixed " +
        faker.commerce.productAdjective().toLowerCase() +
        " issue with " +
        faker.commerce.product().toLowerCase()
    );
  }

  // Generate 1-4 improvements
  const improvementCount = 1 + Math.floor(Math.random() * 4);
  for (let i = 0; i < improvementCount; i++) {
    improvements.push(
      "Improved " +
        faker.commerce.productAdjective().toLowerCase() +
        " " +
        faker.commerce.product().toLowerCase() +
        " performance"
    );
  }

  return `# ${version} Release Notes
${
  status === "deprecated"
    ? "\n> **Note:** This version is now deprecated.\n"
    : ""
}

## New Features
${features.map((f) => `- ${f}`).join("\n")}

## Improvements
${improvements.map((i) => `- ${i}`).join("\n")}

${
  bugfixes.length > 0
    ? `\n## Bug Fixes
${bugfixes.map((b) => `- ${b}`).join("\n")}`
    : ""
}

Release Date: ${
    status !== "development"
      ? faker.date.recent().toDateString()
      : "Coming soon"
  }
`;
}

// Generate technical specifications
export async function generateTechnicalSpecs(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  productIds: string[],
  userIds: string[]
) {
  const specTemplates = [
    {
      name: "Architecture Overview",
      content:
        "## Architecture\n\n{overview}\n\n### Components\n\n{components}",
    },
    {
      name: "API Documentation",
      content: "# API Reference\n\n{endpoints}\n\n## Authentication\n\n{auth}",
    },
    {
      name: "Database Schema",
      content:
        "# Database Schema\n\n{schema}\n\n## Relationships\n\n{relationships}",
    },
    {
      name: "Deployment Guide",
      content: "# Deployment Guide\n\n{requirements}\n\n## Steps\n\n{steps}",
    },
    {
      name: "Security Considerations",
      content: "# Security\n\n{overview}\n\n## Best Practices\n\n{practices}",
    },
  ];

  for (const productId of productIds) {
    // Get product info
    const product = await tx.query.products.findFirst({
      where: eq(schema.products.id, productId),
    });

    if (!product) continue;

    // Get the latest version
    const versions = await tx.query.productVersions.findMany({
      where: eq(schema.productVersions.productId, productId),
      orderBy: [schema.productVersions.createdAt],
    });

    const latestVersion =
      versions.length > 0 ? versions[versions.length - 1] : null;

    // Generate 3-5 technical docs for each product
    const specCount = 3 + Math.floor(Math.random() * 3);
    const shuffledSpecs = [...specTemplates].sort(() => 0.5 - Math.random());
    const selectedSpecs = shuffledSpecs.slice(0, specCount);

    for (const spec of selectedSpecs) {
      // Random user as creator
      const createdById = userIds[Math.floor(Math.random() * userIds.length)];

      let content = spec.content;

      // Replace placeholders with generated content based on spec type
      if (spec.name === "Architecture Overview") {
        const architectureStyles = [
          "microservices",
          "monolithic",
          "event-driven",
          "layered",
          "serverless",
        ];

        const style =
          architectureStyles[
            Math.floor(Math.random() * architectureStyles.length)
          ];

        const overview = `${
          product.name
        } uses a ${style} architecture designed for scalability and maintainability. The system is built with ${faker.lorem.paragraph()}`;

        const componentCount = 3 + Math.floor(Math.random() * 4);
        let components = "";

        for (let i = 0; i < componentCount; i++) {
          components += `### ${
            [
              "Frontend",
              "Backend",
              "API Layer",
              "Data Access Layer",
              "Auth Service",
              "Notification Service",
              "Analytics Engine",
              "Admin Portal",
              "User Dashboard",
              "Processing Engine",
            ][i % 10]
          }\n\n`;
          components += `${faker.lorem.paragraph()}\n\n`;
        }

        content = content
          .replace("{overview}", overview)
          .replace("{components}", components);
      } else if (spec.name === "API Documentation") {
        const endpointCount = 4 + Math.floor(Math.random() * 7);
        let endpoints = "";

        const apiVersions = ["v1", "v2", "v3"];
        const apiVersion =
          apiVersions[
            Math.floor(Math.random() * (product.name.includes("API") ? 3 : 2))
          ];

        endpoints += `The ${product.name} API ${apiVersion} provides the following endpoints:\n\n`;

        const httpMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
        const resourceTypes = [
          "users",
          "projects",
          "tasks",
          "reports",
          "settings",
          "analytics",
          "notifications",
          "documents",
          "clients",
          "products",
        ];

        for (let i = 0; i < endpointCount; i++) {
          const method =
            httpMethods[Math.floor(Math.random() * httpMethods.length)];
          const resource =
            resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
          const hasId = method !== "POST" && Math.random() > 0.3;
          const path = `/api/${apiVersion}/${resource}${hasId ? "/:id" : ""}`;

          endpoints += `## ${method} ${path}\n\n`;
          endpoints += `${
            method === "GET"
              ? "Retrieves"
              : method === "POST"
              ? "Creates"
              : method === "PUT"
              ? "Updates"
              : method === "PATCH"
              ? "Partially updates"
              : "Deletes"
          } ${hasId ? "a specific" : "a new"} ${resource.slice(0, -1)}.\n\n`;

          if (method !== "DELETE") {
            endpoints += `### Request${
              method !== "GET" ? " Body" : " Parameters"
            }\n\n`;
            endpoints += "```json\n";

            if (method !== "GET") {
              endpoints += `{\n`;
              const fieldCount = 3 + Math.floor(Math.random() * 4);
              for (let f = 0; f < fieldCount; f++) {
                const fieldName = faker.word.sample().toLowerCase();
                endpoints += `  "${fieldName}": ${
                  ["string", "number", "boolean", "object"][
                    Math.floor(Math.random() * 4)
                  ] === "string"
                    ? `"${faker.lorem.word()}"`
                    : Math.random() > 0.5
                    ? Math.floor(Math.random() * 100)
                    : "true"
                }${f < fieldCount - 1 ? "," : ""}\n`;
              }
              endpoints += `}\n`;
            } else {
              endpoints += `{\n  "page": 1,\n  "limit": 10,\n  "sort": "createdAt"\n}\n`;
            }

            endpoints += "```\n\n";
          }

          endpoints += "### Response\n\n";
          endpoints += "```json\n";

          if (method === "GET" && !hasId) {
            endpoints += `{\n  "data": [\n    { "id": "example-id-1", ... },\n    { "id": "example-id-2", ... }\n  ],\n  "pagination": {\n    "total": 42,\n    "page": 1,\n    "limit": 10\n  }\n}\n`;
          } else if (method === "GET" && hasId) {
            endpoints += `{\n  "id": "example-id",\n  "createdAt": "2023-05-15T10:30:00Z",\n  ...\n}\n`;
          } else if (method === "DELETE") {
            endpoints += `{\n  "success": true,\n  "message": "Resource deleted"\n}\n`;
          } else {
            endpoints += `{\n  "id": "new-resource-id",\n  "createdAt": "2023-05-15T10:30:00Z",\n  ...\n}\n`;
          }

          endpoints += "```\n\n";
        }

        let auth = `Authentication is required for all API endpoints except where noted. ${
          product.name
        } API uses ${
          ["JWT", "OAuth 2.0", "API Keys"][Math.floor(Math.random() * 3)]
        } for authentication.\n\n`;
        auth += `### Headers\n\n\`\`\`\nAuthorization: Bearer YOUR_ACCESS_TOKEN\n\`\`\`\n\n`;
        auth += `Access tokens can be obtained from the ${product.name} developer portal.`;

        content = content
          .replace("{endpoints}", endpoints)
          .replace("{auth}", auth);
      } else if (spec.name === "Database Schema") {
        const schema = `${product.name} uses a ${
          ["relational", "document-based", "hybrid"][
            Math.floor(Math.random() * 3)
          ]
        } database schema.\n\n`;

        const tableCount = 4 + Math.floor(Math.random() * 5);
        let schemaContent = "";

        const tableNames = [
          "Users",
          "Projects",
          "Tasks",
          "Settings",
          "Clients",
          "Products",
          "Reports",
          "Analytics",
          "Notifications",
          "Documents",
          "Transactions",
        ];

        for (let i = 0; i < tableCount; i++) {
          const tableName = tableNames[i % tableNames.length];
          schemaContent += `## ${tableName}\n\n`;
          schemaContent +=
            "| Column | Type | Description |\n|--------|------|-------------|\n";

          // Common columns
          schemaContent += "| id | string | Primary key |\n";
          schemaContent += "| createdAt | timestamp | Creation timestamp |\n";

          // Table-specific columns
          const columnCount = 3 + Math.floor(Math.random() * 5);
          for (let c = 0; c < columnCount; c++) {
            const columnName = faker.word.sample().toLowerCase();
            const columnType = [
              "string",
              "integer",
              "boolean",
              "timestamp",
              "decimal",
              "json",
            ][Math.floor(Math.random() * 6)];
            schemaContent += `| ${columnName} | ${columnType} | ${faker.lorem.sentence(
              3
            )} |\n`;
          }

          schemaContent += "\n";
        }

        let relationships = "## Entity Relationships\n\n";
        relationships += "```mermaid\nerDiagram\n";

        for (let i = 0; i < tableCount - 1; i++) {
          const sourceTable = tableNames[i % tableNames.length];
          const targetTable = tableNames[(i + 1) % tableNames.length];
          const relType = ["1:1", "1:N", "N:M"][Math.floor(Math.random() * 3)];

          relationships += `    ${sourceTable} ${
            relType === "1:1"
              ? "||--||"
              : relType === "1:N"
              ? "||--o{"
              : "}o--o{"
          } ${targetTable} : "${
            ["has", "contains", "manages", "relates to"][
              Math.floor(Math.random() * 4)
            ]
          }"\n`;
        }

        relationships += "```\n";

        content = content
          .replace("{schema}", schemaContent)
          .replace("{relationships}", relationships);
      } else if (spec.name === "Deployment Guide") {
        let requirements = `### System Requirements\n\n`;
        requirements += `- ${
          ["Node.js", "Python", "Java", ".NET", "Go"][
            Math.floor(Math.random() * 5)
          ]
        } ${faker.system.semver()}\n`;
        requirements += `- ${
          ["PostgreSQL", "MySQL", "MongoDB", "Redis", "ElasticSearch"][
            Math.floor(Math.random() * 5)
          ]
        } ${faker.system.semver()}\n`;
        requirements += `- ${Math.floor(
          2 + Math.random() * 6
        )}GB RAM minimum\n`;
        requirements += `- ${Math.floor(
          10 + Math.random() * 50
        )}GB disk space\n\n`;

        requirements += `### Environment Variables\n\n`;
        requirements += "```\n";
        requirements += `DATABASE_URL=<connection-string>\n`;
        requirements += `API_KEY=<your-api-key>\n`;
        requirements += `NODE_ENV=production\n`;
        requirements += `LOG_LEVEL=info\n`;
        requirements += "```\n";

        let steps = `1. **Clone Repository**\n\n   \`\`\`\n   git clone ${
          product.repositoryUrl
        }\n   cd ${product.name
          .toLowerCase()
          .replace(/\s+/g, "-")}\n   \`\`\`\n\n`;

        steps += `2. **Install Dependencies**\n\n   \`\`\`\n   ${
          Math.random() > 0.5 ? "npm install" : "yarn"
        }\n   \`\`\`\n\n`;

        steps += `3. **Configure Environment**\n\n   Create a \`.env\` file using the example above.\n\n`;

        steps += `4. **Build Application**\n\n   \`\`\`\n   ${
          Math.random() > 0.5 ? "npm run build" : "yarn build"
        }\n   \`\`\`\n\n`;

        steps += `5. **Run Database Migrations**\n\n   \`\`\`\n   ${
          Math.random() > 0.5 ? "npm run migrate" : "yarn migrate"
        }\n   \`\`\`\n\n`;

        steps += `6. **Start Application**\n\n   \`\`\`\n   ${
          Math.random() > 0.5 ? "npm start" : "yarn start"
        }\n   \`\`\`\n\n`;

        steps += `7. **Verify Installation**\n\n   Access the application at http://localhost:${
          3000 + Math.floor(Math.random() * 7000)
        }\n\n`;

        content = content
          .replace("{requirements}", requirements)
          .replace("{steps}", steps);
      } else if (spec.name === "Security Considerations") {
        let overview = `${product.name} is designed with security in mind. The system implements multiple layers of protection to ensure data integrity and user privacy.\n\n`;

        overview += `### Authentication\n\n`;
        overview += `- ${
          ["JWT", "OAuth 2.0", "SAML", "OpenID Connect"][
            Math.floor(Math.random() * 4)
          ]
        } for secure authentication\n`;
        overview += `- Password hashing using ${
          ["bcrypt", "Argon2", "PBKDF2"][Math.floor(Math.random() * 3)]
        }\n`;
        overview += `- Multi-factor authentication support\n\n`;

        overview += `### Authorization\n\n`;
        overview += `- Role-based access control (RBAC)\n`;
        overview += `- Resource-level permissions\n`;
        overview += `- IP-based restrictions (optional)\n\n`;

        let practices = `1. **Regular Security Audits**\n\n   Schedule regular security audits and penetration testing.\n\n`;

        practices += `2. **Data Encryption**\n\n   - Encrypt sensitive data at rest\n   - Use HTTPS for all communications\n   - Implement proper key management\n\n`;

        practices += `3. **Input Validation**\n\n   Validate all inputs to prevent injection attacks.\n\n`;

        practices += `4. **Dependency Management**\n\n   Regularly update dependencies to patch security vulnerabilities.\n\n`;

        practices += `5. **Logging and Monitoring**\n\n   Implement comprehensive logging and security monitoring.\n\n`;

        practices += `6. **Rate Limiting**\n\n   Apply rate limiting to prevent abuse and DDoS attacks.\n\n`;

        content = content
          .replace("{overview}", overview)
          .replace("{practices}", practices);
      }

      // Insert the tech spec
      await tx
        .insert(schema.technicalSpecs)
        .values({
          id: createId(),
          productId,
          versionId: latestVersion?.id || null,
          name: spec.name,
          content,
          createdById,
          createdAt: faker.date.past({ years: 1 }),
          updatedAt: faker.date.recent({ days: 45 }),
          isDeleted: false,
        })
        .execute();
    }
  }
}

// Generate product dependencies
export async function generateProductDependencies(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  productIds: string[]
) {
  // For realistic dependency graphs, we'll:
  // 1. Not make every product depend on others (some are standalone)
  // 2. Avoid circular dependencies
  // 3. Create version constraints that make sense

  interface DependencyRelation {
    productId: string;
    dependsOnProductId: string;
  }

  const dependenciesCreated: DependencyRelation[] = [];

  // Only process if we have more than 1 product
  if (productIds.length <= 1) {
    return;
  }

  // Get product details to help generate more realistic dependencies
  const products = await tx.query.products
    .findMany({
      where: inArray(schema.products.id, productIds),
    })
    .execute();

  // Map products by id for easy lookup
  const productsMap = products.reduce((map: any, product: any) => {
    map[product.id] = product;
    return map;
  }, {});

  // Get product versions to reference in constraints
  const allVersions = await tx.query.productVersions
    .findMany({
      where: inArray(schema.productVersions.productId, productIds),
    })
    .execute();

  // Group versions by product ID
  const versionsByProduct = allVersions.reduce((map: any, version: any) => {
    if (!map[version.productId]) {
      map[version.productId] = [];
    }
    map[version.productId].push(version);
    return map;
  }, {});

  // For each product, decide if it depends on other products
  for (let i = 0; i < productIds.length; i++) {
    const productId = productIds[i];
    const product = productsMap[productId];

    if (!product) continue;

    // Lower index products are more likely to be dependencies for higher index products
    // This helps create a more realistic dependency tree and avoid circular dependencies

    // Decide how many dependencies this product will have (0-3)
    const maxPotentialDependencies = Math.min(i, 3); // Can depend only on previous products (lower index)
    const dependencyCount = Math.floor(
      Math.random() * (maxPotentialDependencies + 1)
    );

    if (dependencyCount === 0) continue; // This product has no dependencies

    // Create a pool of potential dependencies (products with lower indices)
    const potentialDependencies = productIds.slice(0, i);

    // Shuffle the potential dependencies
    const shuffledDependencies = [...potentialDependencies].sort(
      () => 0.5 - Math.random()
    );

    // Take the first N dependencies
    const selectedDependencies = shuffledDependencies.slice(0, dependencyCount);

    // Create dependency relationships
    for (const dependsOnId of selectedDependencies) {
      // Skip if this relationship already exists
      if (
        dependenciesCreated.some(
          (d) =>
            d.productId === productId && d.dependsOnProductId === dependsOnId
        )
      ) {
        continue;
      }

      // Get versions of the dependency product
      const dependencyVersions = versionsByProduct[dependsOnId] || [];

      if (dependencyVersions.length === 0) continue;

      // Sort versions based on semantic versioning
      const sortedVersions = [...dependencyVersions].sort((a, b) => {
        const partsA = a.versionNumber.split(".").map(Number);
        const partsB = b.versionNumber.split(".").map(Number);

        // Compare major, minor, and patch
        for (let i = 0; i < 3; i++) {
          if (partsA[i] !== partsB[i]) {
            return partsA[i] - partsB[i];
          }
        }

        return 0;
      });

      // Get the latest version
      const latestVersion = sortedVersions[sortedVersions.length - 1];

      if (!latestVersion) continue;

      // Generate a version constraint
      const versionParts = latestVersion.versionNumber.split(".").map(Number);

      // Different types of version constraints
      const constraintTypes = [
        "exact", // =1.2.3
        "compatible", // ^1.2.3 (compatible with 1.x.x)
        "minor", // ~1.2.3 (compatible with 1.2.x)
        "minimum", // >=1.2.3
        "range", // >=1.2.0 <2.0.0
      ];

      const constraintType =
        constraintTypes[Math.floor(Math.random() * constraintTypes.length)];

      let versionConstraint;
      switch (constraintType) {
        case "exact":
          versionConstraint = `=${latestVersion.versionNumber}`;
          break;
        case "compatible":
          versionConstraint = `^${latestVersion.versionNumber}`;
          break;
        case "minor":
          versionConstraint = `~${latestVersion.versionNumber}`;
          break;
        case "minimum":
          versionConstraint = `>=${latestVersion.versionNumber}`;
          break;
        case "range":
          versionConstraint = `>=${versionParts[0]}.${versionParts[1]}.0 <${
            versionParts[0] + 1
          }.0.0`;
          break;
        default:
          versionConstraint = `^${latestVersion.versionNumber}`;
      }

      // Determine if this is a critical dependency
      const isCritical = Math.random() < 0.3; // 30% chance of being critical

      // Create the dependency relationship
      await tx
        .insert(schema.productDependencies)
        .values({
          id: createId(),
          productId,
          dependsOnProductId: dependsOnId,
          versionConstraint,
          description: `${product.name} requires ${
            productsMap[dependsOnId]?.name || "this product"
          } for ${
            [
              "core functionality",
              "API integration",
              "data processing",
              "authentication services",
              "user management",
              "reporting capabilities",
              "workflow automation",
            ][Math.floor(Math.random() * 7)]
          }.`,
          isCritical,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .execute();

      // Track the created dependency
      dependenciesCreated.push({
        productId,
        dependsOnProductId: dependsOnId,
      });
    }
  }
}
