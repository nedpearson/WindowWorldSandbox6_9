import nodemailer from 'nodemailer';
import { getSignedUrl, BUCKETS, BucketName } from './storageService.js';
import { prisma } from '../index.js';

/**
 * Configure Nodemailer transport.
 * We expect standard SMTP env vars (e.g., Office365 or Google Workspace)
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.office365.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface AttachmentRequest {
  filename: string;
  storagePath: string;
  bucket?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  from?: string; // Defaults to SMTP_USER if not provided
  attachments?: AttachmentRequest[];
  customerId: string;
  companyId?: string;
  sentByUserId: string;
}

export async function sendCustomerEmail(options: SendEmailOptions) {
  const fromEmail = options.from || process.env.SMTP_USER || 'npearson@winworldinfo.com';

  // 1. Resolve attachments from Supabase Storage using signed URLs
  const mailAttachments: nodemailer.SendMailOptions['attachments'] = [];
  const storedAttachmentsMeta: any[] = [];

  if (options.attachments && options.attachments.length > 0) {
    for (const att of options.attachments) {
      const bucket = (att.bucket as BucketName) || BUCKETS.GENERATED_DOCUMENTS;
      // Get a short-lived signed URL to stream the file to nodemailer
      const signedUrl = await getSignedUrl(bucket, att.storagePath, 300); // 5 mins
      
      if (signedUrl) {
        mailAttachments.push({
          filename: att.filename,
          path: signedUrl, // nodemailer supports downloading from URL
        });
        
        storedAttachmentsMeta.push({
          name: att.filename,
          storagePath: att.storagePath,
          url: signedUrl // Note: this URL expires, but we log the storagePath to retrieve later
        });
      }
    }
  }

  try {
    // 2. Send the email
    const info = await transporter.sendMail({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      text: options.bodyText,
      html: options.bodyHtml,
      attachments: mailAttachments,
    });

    console.log(`[EmailService] Sent email to ${options.to}. MessageId: ${info.messageId}`);

    // 3. Log to database
    await prisma.emailLog.create({
      data: {
        customerId: options.customerId,
        companyId: options.companyId,
        sentByUserId: options.sentByUserId,
        toEmail: options.to,
        fromEmail: fromEmail,
        subject: options.subject,
        bodyText: options.bodyText,
        bodyHtml: options.bodyHtml,
        attachments: storedAttachmentsMeta,
        status: 'sent',
      }
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('[EmailService] Failed to send email:', error);

    // Log failure to database
    await prisma.emailLog.create({
      data: {
        customerId: options.customerId,
        companyId: options.companyId,
        sentByUserId: options.sentByUserId,
        toEmail: options.to,
        fromEmail: fromEmail,
        subject: options.subject,
        bodyText: options.bodyText,
        bodyHtml: options.bodyHtml,
        attachments: storedAttachmentsMeta,
        status: 'failed',
        errorMessage: error.message,
      }
    });

    return { success: false, error: error.message };
  }
}
