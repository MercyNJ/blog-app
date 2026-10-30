const crypto = require('crypto');
const { Op } = require('sequelize');
const { User } = require('../models/Associations');
const { sendMailInBackground } = require('./mailer');

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_LIFETIME_MS = 60 * 60 * 1000;
const RESET_EMAIL_COOLDOWN_MS = 2 * 60 * 1000;

const hashResetToken = token => crypto.createHash('sha256').update(token).digest('hex');

function createResetEmail(email, resetLink) {
  return {
    to: email,
    subject: 'Reset your In Light of Eternity password',
    text: [
      'We received a request to reset your password.',
      '',
      `Open this link to choose a new password. It works once and expires in 1 hour:`,
      resetLink,
      '',
      'If you did not ask for this, you can ignore this email. Your password has not changed.',
    ].join('\n'),
    html: [
      '<p>We received a request to reset your password.</p>',
      `<p><a href="${resetLink}">Choose a new password</a></p>`,
      '<p>This link works once and expires in 1 hour.</p>',
      '<p>If you did not ask for this, you can ignore this email. Your password has not changed.</p>',
    ].join(''),
  };
}

// Emails a reset link unless one was sent moments ago, so a mailbox can't be flooded.
// The link keeps the token after "#", which browsers never send to the server.
async function requestPasswordReset(email, siteUrl) {
  const user = await User.findOne({ where: { email } });

  if (!user) {
    return;
  }

  const lastSentAt = user.resetPasswordExpiresAt
    ? user.resetPasswordExpiresAt.getTime() - RESET_TOKEN_LIFETIME_MS
    : 0;

  if (Date.now() - lastSentAt < RESET_EMAIL_COOLDOWN_MS) {
    return;
  }

  const token = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');

  await user.update({
    resetPasswordTokenHash: hashResetToken(token),
    resetPasswordExpiresAt: new Date(Date.now() + RESET_TOKEN_LIFETIME_MS),
  });

  sendMailInBackground(createResetEmail(user.email, `${siteUrl}/reset-password#${token}`));
}

// Saves the new password and ends every session. Returns false for an unknown, expired or used token.
async function resetPassword(token, passwordHash) {
  const resetPasswordTokenHash = hashResetToken(token);

  const user = await User.findOne({
    where: {
      resetPasswordTokenHash,
      resetPasswordExpiresAt: { [Op.gt]: new Date() },
    },
  });

  if (!user) {
    return false;
  }

  // Conditional on the token, so two requests racing with one link can't both succeed.
  const [updatedRows] = await User.update(
    {
      password: passwordHash,
      tokenVersion: user.tokenVersion + 1,
      resetPasswordTokenHash: null,
      resetPasswordExpiresAt: null,
    },
    { where: { id: user.id, resetPasswordTokenHash } }
  );

  return updatedRows === 1;
}

module.exports = { requestPasswordReset, resetPassword };
