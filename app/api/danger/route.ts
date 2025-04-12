import { populateTestData } from "@/lib/test-data";

export const GET = async (req: Request) => {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());

  // Parse query parameters
  const userCount = parseInt(params.userCount as string) || 50;
  const departmentCount = parseInt(params.departmentCount as string) || 8;
  const productCount = parseInt(params.productCount as string) || 12;
  const clientCount = parseInt(params.clientCount as string) || 15;
  const projectCount = parseInt(params.projectCount as string) || 20;

  // Populate test data
  const result = await populateTestData({
    userCount,
    departmentCount,
    productCount,
    clientCount,
    projectCount,
    resetData: true,
  });

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
};
