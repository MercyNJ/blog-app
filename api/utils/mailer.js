const nodemailer = require('nodemailer');

const REQUIRED_SETTINGS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM'];
const SMTP_TIMEOUT_MS = 10000;
const SMTPS_PORT = 465;

let transporter = null;

function getMissingSettings() {
  return REQUIRED_SETTINGS.filter(name => !process.env[name]);
}

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT);

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === SMTPS_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      connectionTimeout: SMTP_TIMEOUT_MS,
      greetingTimeout: SMTP_TIMEOUT_MS,
      socketTimeout: SMTP_TIMEOUT_MS,
    });
  }

  return transporter;
}

// Email is optional at startup: missing settings disable sending, never the site.
function warnIfMailNotConfigured() {
  const missing = getMissingSettings();

  if (missing.length) {
    console.warn(`Email is disabled until these settings are added: ${missing.join(', ')}`);
  }
}

async function sendMail({ to, subject, text, html }) {
  const missing = getMissingSettings();

  if (missing.length) {
    throw new Error(`Email is not configured (missing ${missing.join(', ')}).`);
  }

  await getTransporter().sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    text,
    html,
  });
}

// For emails a request must not wait for or fail because of. Failures only reach the server log.
function sendMailInBackground(message) {
  sendMail(message).catch(error => {
    console.error(`Email failed ("${message.subject}"):`, error.message);
  });
}

module.exports = { sendMail, sendMailInBackground, warnIfMailNotConfigured };
