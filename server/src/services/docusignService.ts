import { prisma } from '../index.js';

interface DocusignTokensResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

interface DocusignUserInfo {
  email?: string;
  accounts: Array<{
    accountId: string;
    accountName: string;
    baseUri: string;
    isDefault: boolean;
  }>;
}

/**
 * Refreshes the DocuSign OAuth token for the user if it is close to expiration.
 */
export async function refreshDocusignToken(userId: string): Promise<any> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.docusignRefreshToken) {
    throw new Error('No DocuSign connection found for this user.');
  }

  // Token is fresh if it expires more than 5 minutes from now
  const bufferTime = 5 * 60 * 1000; // 5 mins
  if (user.docusignExpiresAt && user.docusignExpiresAt.getTime() > Date.now() + bufferTime) {
    return user.docusignAccessToken;
  }

  const authServer = process.env.DOCUSIGN_AUTH_SERVER || 'account-d.docusign.com';
  const clientId = process.env.DOCUSIGN_CLIENT_ID;
  const clientSecret = process.env.DOCUSIGN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('DocuSign API client credentials are not configured in environment variables.');
  }

  console.log(`[docusign] Refreshing token for user ${user.email}...`);

  const response = await fetch(`https://${authServer}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: user.docusignRefreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[docusign] Token refresh failed response:', errorBody);
    throw new Error(`DocuSign token refresh failed: ${response.statusText}. Please reconnect.`);
  }

  const data: DocusignTokensResponse = await response.json();

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      docusignAccessToken: data.access_token,
      docusignRefreshToken: data.refresh_token || user.docusignRefreshToken,
      docusignExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });

  return updatedUser.docusignAccessToken;
}

/**
 * Exchange auth code for tokens and fetch user's base account info
 */
export async function exchangeCodeForTokens(userId: string, code: string): Promise<void> {
  const authServer = process.env.DOCUSIGN_AUTH_SERVER || 'account-d.docusign.com';
  const clientId = process.env.DOCUSIGN_CLIENT_ID;
  const clientSecret = process.env.DOCUSIGN_CLIENT_SECRET;
  const redirectUri = process.env.DOCUSIGN_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('DocuSign API credentials or redirect URI are not configured.');
  }

  const response = await fetch(`https://${authServer}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[docusign] Exchange code failed response:', errorBody);
    throw new Error(`DocuSign token exchange failed: ${response.statusText}`);
  }

  const data: DocusignTokensResponse = await response.json();

  // Fetch UserInfo to get accountId, userId, and baseUri
  const userInfoRes = await fetch(`https://${authServer}/oauth/userinfo`, {
    headers: {
      Authorization: `Bearer ${data.access_token}`,
    },
  });

  if (!userInfoRes.ok) {
    throw new Error(`DocuSign fetch userinfo failed: ${userInfoRes.statusText}`);
  }

  const userInfo: DocusignUserInfo = await userInfoRes.json();
  const defaultAccount = userInfo.accounts.find(a => a.isDefault) || userInfo.accounts[0];

  if (!defaultAccount) {
    throw new Error('No DocuSign account found for the authenticated user.');
  }

  // Ensure redirect URI uses correct protocol/host (e.g. DocuSign baseUri structure is 'https://demo.docusign.net')
  const baseUri = defaultAccount.baseUri;

  await prisma.user.update({
    where: { id: userId },
    data: {
      docusignAccessToken: data.access_token,
      docusignRefreshToken: data.refresh_token,
      docusignExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      docusignAccountId: defaultAccount.accountId,
      docusignBaseUri: baseUri,
      windowWorldEmail: userInfo.email,
    },
  });
}

/**
 * Send a document PDF to a recipient for signing
 */
export async function sendDocuSignEnvelope(
  userId: string,
  pdfBuffer: Buffer,
  customerEmail: string,
  customerName: string,
  fileName: string
): Promise<{ envelopeId: string; status: string }> {
  // Ensure token is fresh
  const accessToken = await refreshDocusignToken(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { docusignAccountId: true, docusignBaseUri: true, email: true },
  });

  if (!user || !user.docusignAccountId || !user.docusignBaseUri) {
    throw new Error('User does not have an active DocuSign connection or default account.');
  }

  const url = `${user.docusignBaseUri}/restapi/v2.1/accounts/${user.docusignAccountId}/envelopes`;

  const envelopePayload = {
    emailSubject: 'Please sign your Window World Order Form / Agreement',
    documents: [
      {
        documentBase64: pdfBuffer.toString('base64'),
        name: fileName || 'Window World Contract.pdf',
        fileExtension: 'pdf',
        documentId: '1',
      },
    ],
    recipients: {
      signers: [
        {
          email: customerEmail,
          name: customerName,
          recipientId: '1',
          routingOrder: '1',
          tabs: {
            signHereTabs: [
              {
                anchorString: 'Customer Signature:',
                anchorXOffset: '130',
                anchorYOffset: '-4',
                anchorUnits: 'pixels',
              },
            ],
            dateSignedTabs: [
              {
                anchorString: 'Date: ____________',
                anchorXOffset: '35',
                anchorYOffset: '-4',
                anchorUnits: 'pixels',
              },
            ],
          },
        },
      ],
    },
    status: 'sent', // Send immediately
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(envelopePayload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[docusign] Envelope send failed response:', errorBody);
    throw new Error(`DocuSign API Error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  return {
    envelopeId: data.envelopeId,
    status: data.status,
  };
}
