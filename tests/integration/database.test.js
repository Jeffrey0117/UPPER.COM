const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./test.db'
    }
  }
});

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up
    await prisma.$disconnect();
  });

  test('should connect to database', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  test('should query users table', async () => {
    const users = await prisma.user.findMany();
    expect(Array.isArray(users)).toBe(true);
  });

  test('should query leads table', async () => {
    const leads = await prisma.lead.findMany();
    expect(Array.isArray(leads)).toBe(true);
  });
});
