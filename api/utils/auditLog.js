const { AuditLog } = require('../models/Associations');

const MAX_LABEL_LENGTH = 255;

// Records one admin action. Never throws: a failed write is reported in the server log
// and the action that triggered it still completes.
async function logAdminAction({ actor, action, targetType, targetId, targetLabel }) {
  try {
    await AuditLog.create({
      actorId: actor?.id ?? null,
      actorUsername: actor?.username || 'unknown',
      action,
      targetType,
      targetId: targetId ?? null,
      targetLabel: targetLabel ? String(targetLabel).slice(0, MAX_LABEL_LENGTH) : null,
    });
  } catch (error) {
    console.error('Audit log write failed:', JSON.stringify({
      action,
      targetType,
      targetId: targetId ?? null,
      actorId: actor?.id ?? null,
    }), error);
  }
}

module.exports = { logAdminAction };
