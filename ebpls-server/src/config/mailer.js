const nodemailer = require('nodemailer');
const env = require('./env');

let transporter;

// Only initialize the real transporter if the credentials are provided AND aren't the placeholders
if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_USER !== 'your_smtp_login') {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT || 587,
    secure: env.SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

const sendEmail = async ({ to, subject, html }) => {
  // ASSUMPTION: 'to' is always a valid email address, verified before calling
  
  if (!transporter) {
    console.log('⚠️ [DEV MODE] Email skipped (SMTP not configured). Would have sent to:', to);
    console.log(`Subject: ${subject}`);
    return { skipped: true, messageId: 'mock-id' };
  }

  try {
    const info = await transporter.sendMail({
      from: env.EMAIL_FROM || 'noreply@localhost',
      to,
      subject,
      html,
    });
    console.log('✉️ Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
};

module.exports = {
  transporter,
  sendEmail
};
