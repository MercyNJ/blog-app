const { sendMailInBackground } = require('./mailer');

const ERROR_ALERT_COOLDOWN_MS = 15 * 60 * 1000;

let lastErrorAlertAt = 0;

// Sends nothing unless ADMIN_NOTIFICATION_EMAIL is set; a failed alert only reaches the server log.
function notifyAdmin(subject, text) {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;

  if (to) {
    sendMailInBackground({ to, subject, text });
  }
}

function notifyNewRegistration(user) {
  notifyAdmin(
    'New registration on In Light of Eternity',
    `A new account was created.\n\nUsername: ${user.username}\nEmail: ${user.email}`
  );
}

// One alert per cooldown, so a repeating error can't flood the inbox.
function notifyServerError(error, req) {
  const now = Date.now();

  if (now - lastErrorAlertAt < ERROR_ALERT_COOLDOWN_MS) {
    return;
  }

  lastErrorAlertAt = now;

  notifyAdmin(
    'Server error on In Light of Eternity',
    `An unexpected error occurred. Check the server log for details; further errors in the next 15 minutes are not emailed.\n\nTime: ${new Date(now).toISOString()}\nRequest: ${req.method} ${req.path}\nError: ${error.message}`
  );
}

module.exports = { notifyNewRegistration, notifyServerError };
