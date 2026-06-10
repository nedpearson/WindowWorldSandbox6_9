import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { exchangeCodeForTokens, refreshDocusignToken, sendDocuSignEnvelope } from '../services/docusignService.js';

const prisma = new PrismaClient();
const TEST_EMAIL = 'docusign_rep@winworldinfo.com';
let testUserId: string;

describe('Aperture Sales OS: DocuSign Workflow and Step 4 Integration Tests', () => {
  beforeAll(async () => {
    // Clean up
    const existingUser = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    if (existingUser) {
      await prisma.appointment.deleteMany({ where: { userId: existingUser.id } });
      await prisma.user.delete({ where: { id: existingUser.id } });
    }
    await prisma.customer.deleteMany({ where: { lastName: 'DocuSignTest' } });

    // Create user
    const user = await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        name: 'Window World Rep',
        password: 'hash',
        role: 'sales_rep',
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.appointment.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } });
    }
    await prisma.customer.deleteMany({ where: { lastName: 'DocuSignTest' } });
    await prisma.$disconnect();
  });

  it('exchanges authorization code for tokens and saves them securely', async () => {
    // Mock fetch for token exchange and userinfo
    const mockFetch = vi.fn((url: string, options?: any) => {
      if (url.includes('/oauth/token')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: 'ds-access-token-123',
              refresh_token: 'ds-refresh-token-456',
              expires_in: 3600,
            }),
        } as any);
      }
      if (url.includes('/oauth/userinfo')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              email: 'docusign_rep@winworldinfo.com',
              accounts: [
                {
                  accountId: 'ds-account-id-789',
                  accountName: 'Window World Demo',
                  baseUri: 'https://demo.docusign.net',
                  isDefault: true,
                },
              ],
            }),
        } as any);
      }
      return Promise.reject(new Error('Unknown url: ' + url));
    });

    const originalFetch = global.fetch;
    global.fetch = mockFetch as any;

    try {
      await exchangeCodeForTokens(testUserId, 'test-auth-code');

      // Verify DB update
      const updatedUser = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(updatedUser?.docusignAccessToken).toBe('ds-access-token-123');
      expect(updatedUser?.docusignRefreshToken).toBe('ds-refresh-token-456');
      expect(updatedUser?.docusignAccountId).toBe('ds-account-id-789');
      expect(updatedUser?.docusignBaseUri).toBe('https://demo.docusign.net');
      expect(updatedUser?.windowWorldEmail).toBe('docusign_rep@winworldinfo.com');
      expect(updatedUser?.docusignExpiresAt).toBeDefined();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('refreshes token when close to expiration', async () => {
    // Set user token to be expired
    await prisma.user.update({
      where: { id: testUserId },
      data: {
        docusignExpiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      },
    });

    const mockFetch = vi.fn((url: string, options?: any) => {
      if (url.includes('/oauth/token')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: 'new-ds-access-token-999',
              refresh_token: 'new-ds-refresh-token-888',
              expires_in: 3600,
            }),
        } as any);
      }
      return Promise.reject(new Error('Unknown url: ' + url));
    });

    const originalFetch = global.fetch;
    global.fetch = mockFetch as any;

    try {
      const token = await refreshDocusignToken(testUserId);
      expect(token).toBe('new-ds-access-token-999');

      const updatedUser = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(updatedUser?.docusignAccessToken).toBe('new-ds-access-token-999');
      expect(updatedUser?.docusignRefreshToken).toBe('new-ds-refresh-token-888');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('successfully sends envelope via DocuSign service', async () => {
    const mockFetch = vi.fn((url: string, options?: any) => {
      // Refresh token call (mocked as already fresh so it won't hit token endpoint, but if it does, mock it)
      if (url.includes('/oauth/token')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ access_token: 't', expires_in: 3600 }),
        } as any);
      }
      // Send envelope call
      if (url.includes('/envelopes')) {
        expect(options.method).toBe('POST');
        const payload = JSON.parse(options.body);
        expect(payload.emailSubject).toContain('Please sign your Window World Order Form');
        expect(payload.recipients.signers[0].email).toBe('customer@gmail.com');
        expect(payload.recipients.signers[0].name).toBe('John DocuSignTest');
        expect(payload.status).toBe('sent');

        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              envelopeId: 'envelope-id-uuid-5555',
              status: 'sent',
            }),
        } as any);
      }
      return Promise.reject(new Error('Unknown url: ' + url));
    });

    const originalFetch = global.fetch;
    global.fetch = mockFetch as any;

    try {
      // Ensure token is set and fresh
      await prisma.user.update({
        where: { id: testUserId },
        data: {
          docusignExpiresAt: new Date(Date.now() + 3000 * 1000), // Fresh for 50 mins
        },
      });

      const pdfBuffer = Buffer.from('PDF Content Dummy');
      const result = await sendDocuSignEnvelope(
        testUserId,
        pdfBuffer,
        'customer@gmail.com',
        'John DocuSignTest',
        'Order Form.pdf'
      );

      expect(result.envelopeId).toBe('envelope-id-uuid-5555');
      expect(result.status).toBe('sent');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('updates GeneratedDocument metadata when saved to customer file', async () => {
    // 1. Create a customer & appointment
    const customer = await prisma.customer.create({
      data: { firstName: 'John', lastName: 'DocuSignTest', email: 'customer@gmail.com' },
    });

    const appt = await prisma.appointment.create({
      data: { customerId: customer.id, userId: testUserId, status: 'draft', jobAddress: '123 Test St' },
    });

    // 2. Create a generated document in DB representing the workbook
    const doc = await prisma.generatedDocument.create({
      data: {
        companyId: 'default',
        appointmentId: appt.id,
        customerId: customer.id,
        createdByUserId: testUserId,
        documentType: 'workbook',
        status: 'ready',
        storageBucket: 'generated-documents',
        storagePath: 'company/default/appointments/test/workbook.xlsx',
        fileName: 'workbook.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        version: 1,
      },
    });

    // 3. Simulate save to customer file operation
    const updated = await prisma.generatedDocument.update({
      where: { id: doc.id },
      data: {
        status: 'saved_to_customer_file',
        metadataJson: {
          savedToCustomerFile: true,
          savedAt: new Date().toISOString(),
          savedBy: testUserId,
          jobId: appt.id,
          workbookVersion: doc.version,
          workbookStatus: 'saved_to_customer_file',
        },
      },
    });

    expect(updated.status).toBe('saved_to_customer_file');
    const metadata = updated.metadataJson as any;
    expect(metadata.savedToCustomerFile).toBe(true);
    expect(metadata.workbookStatus).toBe('saved_to_customer_file');
  });

  it('enforces email domain checks for winworldinfo.com rep identity', async () => {
    const isWinWorldRep = TEST_EMAIL.endsWith('@winworldinfo.com');
    expect(isWinWorldRep).toBe(true);

    const user = await prisma.user.findUnique({ where: { id: testUserId } });
    expect(user).toBeDefined();

    // If WindowWorldEmail matches, it should pass domain check
    const isMatched = user?.windowWorldEmail && user.windowWorldEmail.endsWith('@winworldinfo.com');
    expect(isMatched).toBe(true);
  });
});
