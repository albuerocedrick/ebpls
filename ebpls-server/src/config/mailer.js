const nodemailer = require('nodemailer');
const https = require('https');
const env = require('./env');

// ASSUMPTION: In 'production', env.js Zod superRefine already guarantees
// SMTP_HOST, SMTP_USER, SMTP_PASS, and EMAIL_FROM are present.
// In 'development' or 'test', we fall back to Ethereal Email automatically.

let _transporterPromise = null;

/**
 * Returns a singleton Nodemailer transporter (Only used for Ethereal now).
 */
const getEtherealTransporter = () => {
  if (_transporterPromise) return _transporterPromise;

  _transporterPromise = nodemailer.createTestAccount().then((account) => {
    console.log('🔧 [DEV] Ethereal Email account created. All emails are captured — nothing is sent to real inboxes.');
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: account.user,
        pass: account.pass,
      },
    });
  });

  return _transporterPromise;
};

/**
 * Sends email using the Brevo REST API to bypass strict SMTP IP blocking.
 */
const sendViaBrevoAPI = (to, subject, html, attachments = []) => {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      sender: { email: env.EMAIL_FROM || 'noreply@liliw.gov.ph', name: 'eBPLS Municipality of Liliw' },
      to: [{ email: to }],
      subject: subject,
      htmlContent: html,
      attachment: attachments.length > 0 ? attachments.map(a => ({
        name: a.filename,
        // Ensure content is base64 encoded as required by Brevo API
        content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : Buffer.from(a.content || '').toString('base64')
      })) : undefined
    });

    const options = {
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': env.BREVO_API_KEY || env.SMTP_PASS, // Prefer dedicated API Key
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const json = JSON.parse(data);
            console.log(`✉️  Email sent via Brevo API: ${json.messageId} → ${to}`);
            resolve({ messageId: json.messageId, previewUrl: null });
          } catch (e) {
            resolve({ messageId: 'api-success-no-id', previewUrl: null });
          }
        } else {
          reject(new Error(`Brevo API Error: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
};

/**
 * Sends email using the Resend REST API (over HTTPS port 443) to bypass SMTP blocking on cloud platforms.
 */
const sendViaResendAPI = (to, subject, html, attachments = []) => {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      from: env.EMAIL_FROM || 'eBPLS Municipality of Liliw <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      html: html,
      attachments: attachments.length > 0 ? attachments.map(a => ({
        filename: a.filename,
        content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : Buffer.from(a.content || '').toString('base64')
      })) : undefined
    });

    const options = {
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY || env.SMTP_PASS}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const json = JSON.parse(data);
            console.log(`✉️  Email sent via Resend API: ${json.id} → ${to}`);
            resolve({ messageId: json.id, previewUrl: null });
          } catch (e) {
            resolve({ messageId: 'resend-success-no-id', previewUrl: null });
          }
        } else {
          reject(new Error(`Resend API Error: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
};

const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

/**
 * Sends an email. Automatically routes to Brevo API / Resend API if configured, else Gmail SMTP / Ethereal.
 * @param {object} options
 * @param {string} options.to - Recipient email address.
 * @param {string} options.subject - Email subject line.
 * @param {string} options.html - Rendered HTML body.
 * @param {Array}  [options.attachments] - Optional Nodemailer attachment objects.
 * @returns {Promise<{messageId: string, previewUrl?: string}>}
 */
const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  // 1. Resend REST API (HTTPS port 443 — works seamlessly on Render free tier)
  if (process.env.RESEND_API_KEY || (env.SMTP_PASS && env.SMTP_PASS.startsWith('re_'))) {
    return sendViaResendAPI(to, subject, html, attachments);
  }

  // 2. Brevo REST API (HTTPS port 443 — works seamlessly on Render free tier)
  if (env.BREVO_API_KEY || (env.SMTP_HOST && env.SMTP_HOST.includes('brevo.com')) || (env.SMTP_PASS && env.SMTP_PASS.startsWith('xkeysib-'))) {
    return sendViaBrevoAPI(to, subject, html, attachments);
  }

  // 3. Gmail SMTP via Nodemailer (Direct TCP on port 465/587)
  if (env.SMTP_HOST && env.SMTP_HOST.includes('gmail.com') && env.SMTP_PASS) {
    let host = env.SMTP_HOST || 'smtp.gmail.com';
    const servername = 'smtp.gmail.com';

    // Force resolve to IPv4 address to eliminate ENETUNREACH on dual-stack environments (Linux/Render containers)
    try {
      const resolved = await dns.promises.lookup('smtp.gmail.com', { family: 4 });
      if (resolved && resolved.address) {
        host = resolved.address;
      }
    } catch (dnsErr) {
      console.warn('[mailer] IPv4 pre-resolve failed, using default hostname:', dnsErr.message);
    }

    const transporter = nodemailer.createTransport({
      host,
      port: env.SMTP_PORT ? Number(env.SMTP_PORT) : 465,
      secure: env.SMTP_PORT ? Number(env.SMTP_PORT) === 465 : true,
      connectionTimeout: 8000, // Fail fast (8s) instead of hanging worker on blocked cloud networks
      greetingTimeout: 5000,
      socketTimeout: 8000,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      tls: {
        servername, // Ensures TLS certificate validation against smtp.gmail.com
      },
    });

    try {
      const info = await transporter.sendMail({
        from: env.EMAIL_FROM || `"eBPLS Municipality of Liliw" <${env.SMTP_USER}>`,
        to,
        subject,
        html,
        attachments,
      });
      console.log(`✉️  Email sent via Gmail SMTP: ${info.messageId} → ${to}`);
      return { messageId: info.messageId, previewUrl: null };
    } catch (err) {
      console.error(`❌ Gmail SMTP Error:`, err.message);
      throw err;
    }
  }
  if (env.SMTP_HOST && env.SMTP_HOST.includes('brevo.com') && env.SMTP_PASS) {
    return sendViaBrevoAPI(to, subject, html, attachments);
  }

  // 3. Fallback to Nodemailer for Ethereal (Development/Test)
  const transporter = await getEtherealTransporter();

  const info = await transporter.sendMail({
    from: env.EMAIL_FROM || '"eBPLS Municipality of Liliw" <noreply@liliw.gov.ph>',
    to,
    subject,
    html,
    attachments,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log(`📬 [DEV] Email preview URL: ${previewUrl}`);

  return { messageId: info.messageId, previewUrl };
};

module.exports = { getTransporter: getEtherealTransporter, sendEmail };
