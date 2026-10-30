const { User, Comment, AuditLog, sequelize } = require('../models/Associations');

const DELETED_USER_NAME = 'Deleted user';

function createAccountError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// Audit labels come from describeComment(): `Comment #20 by @name on "post title"`, possibly cut to 255 characters.
function replaceCommentAuthor(label, username) {
  const number = label?.match(/^Comment #\d+ by /)?.[0];

  if (!number) {
    return null;
  }

  const author = `@${username} on "`;
  const rest = label.slice(number.length);

  if (rest.startsWith(author)) {
    return `${number}${DELETED_USER_NAME}${rest.slice(`@${username}`.length)}`;
  }

  return author.startsWith(rest) ? `${number}${DELETED_USER_NAME}` : null;
}

// The only permitted change to audit entries: replacing a deleted user's name. The events themselves stay.
async function anonymiseAuditEntries(user, transaction) {
  await AuditLog.update({ actorUsername: DELETED_USER_NAME }, { where: { actorId: user.id }, transaction });

  await AuditLog.update(
    { targetLabel: DELETED_USER_NAME },
    { where: { targetType: 'user', targetId: user.id }, transaction }
  );

  const commentEntries = await AuditLog.findAll({ where: { targetType: 'comment' }, transaction });

  for (const entry of commentEntries) {
    const targetLabel = replaceCommentAuthor(entry.targetLabel, user.username);

    if (targetLabel) {
      await entry.update({ targetLabel }, { transaction });
    }
  }
}

// Deletes a user and their comments and anonymises their audit entries, all together or not at all.
// Admins are refused: their access must be removed first. Returns how many comments were removed.
async function deleteUserAccount(userId) {
  return sequelize.transaction(async transaction => {
    const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });

    if (!user) {
      throw createAccountError(404, 'User not found.');
    }

    if (user.role === 'admin') {
      throw createAccountError(403, 'Remove this user\'s admin access before deleting their account.');
    }

    const removedComments = await Comment.destroy({ where: { authorId: user.id }, transaction });

    await anonymiseAuditEntries(user, transaction);
    await user.destroy({ transaction });

    return removedComments;
  });
}

// Changes a user's role. No one can change their own role, so the acting admin always remains and the site
// can't reach zero admins. Every admin row is locked so two admins removing each other at once run in turn.
async function changeUserRole({ actorId, userId, role }) {
  if (actorId === userId) {
    throw createAccountError(403, 'You cannot change your own role.');
  }

  return sequelize.transaction(async transaction => {
    const admins = await User.findAll({ where: { role: 'admin' }, transaction, lock: transaction.LOCK.UPDATE });

    if (!admins.some(admin => admin.id === actorId)) {
      throw createAccountError(403, 'Admin access required.');
    }

    const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });

    if (!user) {
      throw createAccountError(404, 'User not found.');
    }

    if (user.role === role) {
      throw createAccountError(400, role === 'admin' ? 'This user is already an admin.' : 'This user is not an admin.');
    }

    await user.update({ role }, { transaction });

    return user;
  });
}

module.exports = { deleteUserAccount, changeUserRole };
