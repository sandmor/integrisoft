import * as schema from "../db/schema";
import { faker } from "@faker-js/faker";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { auth } from "../auth";

// Generate users with different roles
export async function generateUsers(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  count: number
): Promise<string[]> {
  const userIds: string[] = [];
  const roles = ["admin", "manager", "employee"] as const;
  const password = await (await auth.$context).password.hash("MyPassword123");

  // Create admin user first
  const adminUser = {
    id: createId(),
    email: "admin@example.com",
    emailVerified: true,
    name: "Admin",
    lastName: "User",
    role: "admin" as const,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: new Date(),
    isDeleted: false,
  };

  await tx.insert(schema.users).values(adminUser).execute();
  userIds.push(adminUser.id);

  // Create accounts for admin
  await tx
    .insert(schema.accounts)
    .values({
      id: createId(),
      userId: adminUser.id,
      accountId: adminUser.id,
      providerId: "credential",
      password: password,
    })
    .execute();

  // Generate additional users
  for (let i = 0; i < count - 1; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const role = roles[Math.floor(Math.random() * roles.length)];

    const userId = createId();
    const email = faker.internet.email({
      firstName,
      lastName,
      provider: "example.com",
    });

    await tx
      .insert(schema.users)
      .values({
        id: userId,
        email: email,
        emailVerified: Math.random() > 0.1, // 90% verified
        name: firstName,
        lastName: lastName,
        role: role, // This is properly typed now because "roles" is declared as "const"
        isActive: Math.random() > 0.05, // 95% active
        createdAt: faker.date.past({ years: 2 }),
        updatedAt: faker.date.recent({ days: 90 }),
        lastLogin: Math.random() > 0.2 ? faker.date.recent({ days: 30 }) : null,
        isDeleted: false,
      })
      .execute();

    userIds.push(userId);

    // Create credentials account for user
    if (Math.random() < 0.7 || true) {
      await tx
        .insert(schema.accounts)
        .values({
          id: createId(),
          userId: userId,
          accountId: userId,
          providerId: "credential",
          password: password,
          createdAt: faker.date.past({ years: 1 }),
          updatedAt: faker.date.recent({ days: 30 }),
        })
        .execute();
    } else {
      // Create OAuth accounts for user
      const providers = ["google", "github", "microsoft"];
      const provider = providers[Math.floor(Math.random() * providers.length)];

      await tx
        .insert(schema.accounts)
        .values({
          id: createId(),
          userId: userId,
          accountId: faker.string.uuid(),
          providerId: provider,
          accessToken: faker.string.alphanumeric(40),
          refreshToken: faker.string.alphanumeric(40),
          accessTokenExpiresAt: faker.date.future({ years: 1 }),
          password: password,
          createdAt: faker.date.past({ years: 1 }),
          updatedAt: faker.date.recent({ days: 30 }),
        })
        .execute();
    }
  }

  return userIds;
}

// Generate departments and positions
export async function generateDepartmentsAndPositions(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  count: number
) {
  const departmentIds: string[] = [];
  const positionIds: string[] = [];

  const departmentNames = [
    "Engineering",
    "Product",
    "Marketing",
    "Sales",
    "Customer Support",
    "Human Resources",
    "Finance",
    "Operations",
    "Research & Development",
    "Quality Assurance",
    "Legal",
    "Executive",
  ];

  // Make sure we don't try to generate more departments than we have names for
  const finalCount = Math.min(count, departmentNames.length);

  // Shuffle department names to get a random selection
  const shuffledDepartments = [...departmentNames].sort(
    () => 0.5 - Math.random()
  );
  const selectedDepartments = shuffledDepartments.slice(0, finalCount);

  // Create departments
  for (let i = 0; i < finalCount; i++) {
    const departmentId = createId();

    await tx
      .insert(schema.departments)
      .values({
        id: departmentId,
        name: selectedDepartments[i],
        description: `The ${
          selectedDepartments[i]
        } department is responsible for ${faker.lorem.sentence(10)}`,
        createdAt: faker.date.past({ years: 3 }),
        updatedAt: faker.date.recent({ days: 60 }),
        isDeleted: false,
      })
      .execute();

    departmentIds.push(departmentId);

    // Generate positions for each department
    await generatePositionsForDepartment(
      tx,
      departmentId,
      selectedDepartments[i],
      positionIds
    );
  }

  return { departmentIds, positionIds };
}

// Helper function to generate positions for a department
async function generatePositionsForDepartment(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  departmentId: string,
  departmentName: string,
  positionIds: string[]
) {
  // Different position templates based on department
  const departmentPositions: Record<string, string[]> = {
    Engineering: [
      "Software Engineer",
      "Senior Software Engineer",
      "Principal Engineer",
      "Engineering Manager",
      "QA Engineer",
      "DevOps Engineer",
      "Technical Architect",
    ],
    Product: [
      "Product Manager",
      "Product Owner",
      "UX Designer",
      "UI Designer",
      "Product Analyst",
    ],
    Marketing: [
      "Marketing Specialist",
      "Digital Marketing Manager",
      "Content Writer",
      "SEO Specialist",
      "Marketing Director",
    ],
    Sales: [
      "Sales Representative",
      "Account Executive",
      "Sales Manager",
      "Business Development Representative",
      "Sales Director",
    ],
    "Customer Support": [
      "Support Specialist",
      "Customer Success Manager",
      "Support Team Lead",
      "Technical Support Engineer",
    ],
    "Human Resources": [
      "HR Specialist",
      "Recruiter",
      "HR Manager",
      "Benefits Coordinator",
      "HR Director",
    ],
    Finance: [
      "Accountant",
      "Financial Analyst",
      "Controller",
      "Finance Manager",
      "CFO",
    ],
    Operations: [
      "Operations Manager",
      "Operations Analyst",
      "Project Coordinator",
      "Logistics Specialist",
      "COO",
    ],
    "Research & Development": [
      "Research Scientist",
      "R&D Engineer",
      "R&D Director",
      "Innovation Specialist",
    ],
    "Quality Assurance": [
      "QA Tester",
      "QA Analyst",
      "QA Manager",
      "Quality Control Specialist",
    ],
    Legal: [
      "Legal Counsel",
      "Compliance Officer",
      "Legal Assistant",
      "General Counsel",
    ],
    Executive: ["CEO", "CTO", "CFO", "COO", "CIO", "CHRO", "CMO"],
  };

  // Default positions if department doesn't match any template
  const defaultPositions = [
    "Manager",
    "Director",
    "Specialist",
    "Coordinator",
    "Assistant",
  ];

  // Get positions for this department or use default
  const positions = departmentPositions[departmentName] || defaultPositions;

  // Add 2-6 positions per department
  const positionCount = 2 + Math.floor(Math.random() * 5);

  // If department has fewer position templates than positionCount, use all available positions
  const finalPositionCount = Math.min(positionCount, positions.length);

  // Shuffle positions to get a random selection
  const shuffledPositions = [...positions].sort(() => 0.5 - Math.random());
  const selectedPositions = shuffledPositions.slice(0, finalPositionCount);

  for (const title of selectedPositions) {
    const positionId = createId();

    await tx
      .insert(schema.positions)
      .values({
        id: positionId,
        title: title,
        description: `${title} in the ${departmentName} department. ${faker.lorem.sentence()}`,
        departmentId: departmentId,
        createdAt: faker.date.past({ years: 2 }),
        updatedAt: faker.date.recent({ days: 90 }),
        isDeleted: false,
      })
      .execute();

    positionIds.push(positionId);
  }
}

// Generate skills
export async function generateSkills(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
): Promise<string[]> {
  const skillIds: string[] = [];
  const skillCategories = [
    "Technical",
    "Soft",
    "Language",
    "Management",
    "Design",
  ];

  const technicalSkills = [
    "JavaScript",
    "TypeScript",
    "React",
    "Node.js",
    "Python",
    "SQL",
    "AWS",
    "Docker",
    "Kubernetes",
    "GraphQL",
    "Java",
    "C#",
    ".NET",
    "Go",
    "Rust",
    "PHP",
    "Ruby",
    "MongoDB",
    "PostgreSQL",
    "Redis",
    "ElasticSearch",
  ];

  const softSkills = [
    "Communication",
    "Teamwork",
    "Leadership",
    "Problem Solving",
    "Critical Thinking",
    "Adaptability",
    "Time Management",
    "Creativity",
  ];

  const languageSkills = [
    "English",
    "Spanish",
    "French",
    "German",
    "Mandarin",
    "Japanese",
    "Portuguese",
    "Russian",
    "Arabic",
  ];

  const managementSkills = [
    "Project Management",
    "Agile Methodologies",
    "Scrum",
    "Kanban",
    "Strategic Planning",
    "Team Building",
    "Performance Management",
    "Budget Management",
    "Resource Allocation",
  ];

  const designSkills = [
    "UI Design",
    "UX Design",
    "Graphic Design",
    "Web Design",
    "Figma",
    "Adobe XD",
    "Photoshop",
    "Illustrator",
    "InDesign",
  ];

  const allSkillsByCategory = {
    Technical: technicalSkills,
    Soft: softSkills,
    Language: languageSkills,
    Management: managementSkills,
    Design: designSkills,
  };

  // Generate skills by category
  for (const category of skillCategories) {
    const skills =
      allSkillsByCategory[category as keyof typeof allSkillsByCategory];

    for (const skillName of skills) {
      const skillId = createId();

      await tx
        .insert(schema.skills)
        .values({
          id: skillId,
          name: skillName,
          category: category,
          description: `${skillName} - ${category} skill. ${faker.lorem.sentence()}`,
          createdAt: faker.date.past({ years: 1 }),
          updatedAt: faker.date.recent({ days: 30 }),
          isDeleted: false,
        })
        .execute();

      skillIds.push(skillId);
    }
  }

  return skillIds;
}

// Generate employees
export async function generateEmployees(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userIds: string[],
  departmentIds: string[],
  positionIds: string[]
): Promise<string[]> {
  const employeeIds: string[] = [];

  // Get departments with associated positions
  const departments = await Promise.all(
    departmentIds.map(async (deptId) => {
      const positions = await tx.query.positions.findMany({
        where: eq(schema.positions.departmentId, deptId),
      });

      return {
        departmentId: deptId,
        positions: positions.map((p) => p.id),
      };
    })
  );

  // Generate employees for each user
  for (const userId of userIds) {
    // 80% of users are employees
    if (Math.random() > 0.2) {
      const employeeId = createId();

      // Get user info
      const user = await tx.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });

      if (!user) continue;

      // Random department
      const deptIndex = Math.floor(Math.random() * departments.length);
      const department = departments[deptIndex];

      // Random position from the department
      const positionId =
        department.positions.length > 0
          ? department.positions[
              Math.floor(Math.random() * department.positions.length)
            ]
          : null; // Some employees might not have a defined position

      // Hire date between 5 years ago and 1 month ago
      const hireDate = faker.date.between({
        from: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000), // 5 years ago
        to: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 1 month ago
      });

      // Salary based on role and random variation
      let baseSalary;
      if (user.role === "admin") {
        baseSalary = 120000 + Math.floor(Math.random() * 80000); // 120k-200k
      } else if (user.role === "manager") {
        baseSalary = 90000 + Math.floor(Math.random() * 50000); // 90k-140k
      } else {
        baseSalary = 60000 + Math.floor(Math.random() * 40000); // 60k-100k
      }

      // Add contact info
      const contactEmail = faker.internet.email({
        firstName: user.name,
        lastName: user.lastName,
      });
      const contactPhone = faker.phone.number();
      const address = faker.location.streetAddress({ useFullAddress: true });

      // Emergency contact
      const emergencyFirstName = faker.person.firstName();
      const emergencyLastName = faker.person.lastName();
      const emergencyContact = `Name: ${emergencyFirstName} ${emergencyLastName}, Relationship: ${
        ["Spouse", "Partner", "Parent", "Sibling", "Friend"][
          Math.floor(Math.random() * 5)
        ]
      }, Phone: ${faker.phone.number()}`;

      await tx
        .insert(schema.employees)
        .values({
          id: employeeId,
          userId: userId,
          positionId: positionId,
          departmentId: department.departmentId,
          hireDate: hireDate,
          salary: baseSalary.toString(),
          contactEmail: contactEmail,
          contactPhone: contactPhone,
          address: address,
          emergencyContact: emergencyContact,
          createdAt: hireDate,
          updatedAt: faker.date.recent({ days: 90 }),
          isDeleted: false,
        })
        .execute();

      employeeIds.push(employeeId);
    }
  }

  return employeeIds;
}

// Assign skills to employees
export async function generateEmployeeSkills(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  employeeIds: string[],
  skillIds: string[]
) {
  // Group skills by category for more realistic assignment
  const skillsByCategory: Record<string, string[]> = {};

  for (const skillId of skillIds) {
    const skill = await tx.query.skills.findFirst({
      where: eq(schema.skills.id, skillId),
    });

    if (skill && skill.category) {
      if (!skillsByCategory[skill.category]) {
        skillsByCategory[skill.category] = [];
      }
      skillsByCategory[skill.category].push(skillId);
    }
  }

  // For each employee, assign 3-12 skills
  for (const employeeId of employeeIds) {
    // Get employee info for more contextual skill assignment
    const employee = await tx.query.employees.findFirst({
      where: eq(schema.employees.id, employeeId),
      with: {
        positions: true,
        departments: true,
        users: true,
      },
    });

    if (!employee) continue;

    const position = employee.positions;
    const department = employee.departments;
    const user = employee.users;

    // Determine skill count based on role and random variation
    let skillCount;
    if (
      user?.role === "admin" ||
      (position?.title &&
        (position.title.includes("Senior") || position.title.includes("Lead")))
    ) {
      skillCount = 7 + Math.floor(Math.random() * 6); // 7-12 skills for senior positions
    } else {
      skillCount = 3 + Math.floor(Math.random() * 5); // 3-7 skills for regular positions
    }

    // Create a set of already assigned skills to avoid duplicates
    const assignedSkills = new Set<string>();

    // Helper function to add skill if not already assigned
    const addSkill = async (skillId: string, additionalProbability = 1) => {
      if (assignedSkills.has(skillId)) return;
      if (Math.random() * additionalProbability < 0.7) {
        // 70% chance, modified by additionalProbability
        const proficiency = 1 + Math.floor(Math.random() * 5); // 1-5 proficiency
        const yearsExperience = 0.5 + Math.random() * 10; // 0.5-10.5 years

        try {
          await tx
            .insert(schema.employeeSkills)
            .values({
              id: createId(), // Ensure every record has an ID
              employeeId: employeeId,
              skillId: skillId,
              proficiencyLevel: proficiency,
              yearsExperience: yearsExperience.toString(), // Convert to string to match decimal type
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .execute();

          assignedSkills.add(skillId);
        } catch (error) {
          console.error("Error adding skill:", error);
          console.log("Employee ID:", employeeId, "Skill ID:", skillId);
        }
      }
    };

    // Filter skills by department
    if (department?.name) {
      const deptName = department.name.toLowerCase();

      // Technical skills
      if (
        deptName.includes("engineer") ||
        deptName.includes("develop") ||
        deptName.includes("research") ||
        deptName.includes("quality") ||
        deptName.includes("product")
      ) {
        // Higher probability for technical skills
        for (const skillId of skillsByCategory["Technical"] || []) {
          await addSkill(skillId, 1.5);
          if (assignedSkills.size >= skillCount) break;
        }
      }

      // Design skills
      if (
        deptName.includes("product") ||
        deptName.includes("market") ||
        deptName.includes("design")
      ) {
        // Higher probability for design skills
        for (const skillId of skillsByCategory["Design"] || []) {
          await addSkill(skillId, 1.5);
          if (assignedSkills.size >= skillCount) break;
        }
      }
    }

    // Management skills for managers or higher roles
    if (
      user?.role === "admin" ||
      user?.role === "manager" ||
      (position?.title &&
        (position.title.includes("Manager") ||
          position.title.includes("Director") ||
          position.title.includes("Lead") ||
          position.title.includes("Chief")))
    ) {
      for (const skillId of skillsByCategory["Management"] || []) {
        await addSkill(skillId, 1.3);
        if (assignedSkills.size >= skillCount) break;
      }
    }

    // Add soft skills
    for (const skillId of skillsByCategory["Soft"] || []) {
      await addSkill(skillId);
      if (assignedSkills.size >= skillCount) break;
    }

    // Add language skills (most people know at least one language)
    if (
      skillsByCategory["Language"] &&
      skillsByCategory["Language"].length > 0
    ) {
      // Everyone knows at least one language with high proficiency
      const primaryLanguage =
        skillsByCategory["Language"][
          Math.floor(Math.random() * skillsByCategory["Language"].length)
        ];

      if (!assignedSkills.has(primaryLanguage)) {
        const proficiency = 4 + Math.floor(Math.random() * 2); // 4-5 proficiency for primary language
        const yearsExperience = 5 + Math.random() * 15; // 5-20 years

        try {
          await tx
            .insert(schema.employeeSkills)
            .values({
              id: createId(), // Ensure ID is provided
              employeeId: employeeId,
              skillId: primaryLanguage,
              proficiencyLevel: proficiency,
              yearsExperience: yearsExperience.toString(), // Convert to string to match decimal type
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .execute();

          assignedSkills.add(primaryLanguage);
        } catch (error) {
          console.error("Error adding primary language skill:", error);
        }
      }

      // Some people know additional languages
      if (Math.random() < 0.4) {
        for (const skillId of skillsByCategory["Language"] || []) {
          if (!assignedSkills.has(skillId)) {
            await addSkill(skillId, 0.5);
          }
          if (assignedSkills.size >= skillCount) break;
        }
      }
    }

    // Fill remaining skill slots with random skills
    const allCategories = Object.keys(skillsByCategory);
    while (
      assignedSkills.size < skillCount &&
      assignedSkills.size < skillIds.length
    ) {
      const randomCategory =
        allCategories[Math.floor(Math.random() * allCategories.length)];
      const categorySkills = skillsByCategory[randomCategory] || [];

      if (categorySkills.length > 0) {
        const randomSkill =
          categorySkills[Math.floor(Math.random() * categorySkills.length)];
        if (!assignedSkills.has(randomSkill)) {
          try {
            const proficiency = 1 + Math.floor(Math.random() * 3); // Lower proficiency (1-3) for random skills
            const yearsExperience = 0.5 + Math.random() * 3; // Lower experience for random skills

            await tx
              .insert(schema.employeeSkills)
              .values({
                id: createId(), // Ensure ID is provided
                employeeId: employeeId,
                skillId: randomSkill,
                proficiencyLevel: proficiency,
                yearsExperience: yearsExperience.toString(),
                createdAt: new Date(),
                updatedAt: new Date(),
              })
              .execute();

            assignedSkills.add(randomSkill);
          } catch (error) {
            console.error("Error adding random skill:", error);
            // Move on to next skill to avoid infinite loop
            assignedSkills.add(randomSkill);
          }
        }
      }

      // Safety check to prevent infinite loops
      if (assignedSkills.size === skillIds.length) break;
    }
  }
}

// Assign managers to departments
export async function assignDepartmentManagers(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  departmentIds: string[],
  employeeIds: string[]
) {
  // Get employees who could be managers
  const potentialManagers = await Promise.all(
    employeeIds.map(async (empId) => {
      // Use explicit type for the query result
      const employee = await tx.query.employees.findFirst({
        where: eq(schema.employees.id, empId),
        with: {
          users: true,
          positions: true,
        },
      });

      // Calculate "manager potential" based on role, position title, and skills
      let managerPotential = 0;

      // Higher score for admin/manager roles
      if (employee?.users?.role === "admin") managerPotential += 100;
      if (employee?.users?.role === "manager") managerPotential += 70;

      // Higher score for management positions
      if (employee?.positions?.title) {
        if (employee.positions.title.includes("Director"))
          managerPotential += 80;
        else if (employee.positions.title.includes("Manager"))
          managerPotential += 60;
        else if (employee.positions.title.includes("Lead"))
          managerPotential += 50;
        else if (employee.positions.title.includes("Senior"))
          managerPotential += 30;
      }

      // Add randomness
      managerPotential += Math.floor(Math.random() * 20);

      return {
        id: empId,
        departmentId: employee?.departmentId,
        managerPotential,
      };
    })
  );

  // Sort potential managers by manager potential (descending)
  potentialManagers.sort((a, b) => b.managerPotential - a.managerPotential);

  // Map to keep track of which departments already have managers
  const managedDepartments = new Set<string>();

  // Assign managers by department
  for (const department of departmentIds) {
    // Try to find employees from this department first
    const departmentEmployees = potentialManagers.filter(
      (emp) => emp.departmentId === department
    );

    if (departmentEmployees.length > 0) {
      // Assign highest potential manager from the department
      const manager = departmentEmployees[0];

      await tx
        .update(schema.departments)
        .set({ managerId: manager.id })
        .where(eq(schema.departments.id, department))
        .execute();

      managedDepartments.add(department);
    }
  }

  // For departments without a manager, assign one from another department
  for (const department of departmentIds) {
    if (!managedDepartments.has(department)) {
      // Find unassigned manager with highest potential
      const availableManagers = potentialManagers.filter(
        (emp) => !managedDepartments.has(emp.departmentId || "")
      );

      if (availableManagers.length > 0) {
        const manager = availableManagers[0];

        await tx
          .update(schema.departments)
          .set({ managerId: manager.id })
          .where(eq(schema.departments.id, department))
          .execute();

        managedDepartments.add(department);
      }
    }
  }

  // If there are still departments without managers, just assign anyone
  for (const department of departmentIds) {
    if (!managedDepartments.has(department)) {
      // Random employee as manager
      const randomEmployee =
        employeeIds[Math.floor(Math.random() * employeeIds.length)];

      await tx
        .update(schema.departments)
        .set({ managerId: randomEmployee })
        .where(eq(schema.departments.id, department))
        .execute();
    }
  }
}
