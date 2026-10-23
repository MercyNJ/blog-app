const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 8 characters long and contain an uppercase letter, lowercase letter, number, and special character.';

module.exports = { PASSWORD_REGEX, PASSWORD_POLICY_MESSAGE };
