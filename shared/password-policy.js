export const passwordRequirements = [
  { key: "length", label: "At least 8 characters", test: (password) => password.length >= 8 },
  { key: "uppercase", label: "At least one uppercase letter", test: (password) => /[A-Z]/.test(password) },
  { key: "lowercase", label: "At least one lowercase letter", test: (password) => /[a-z]/.test(password) },
  { key: "number", label: "At least one number", test: (password) => /\d/.test(password) },
  { key: "special", label: "At least one special character", test: (password) => /[^A-Za-z0-9]/.test(password) },
];

export function getMissingPasswordRequirements(password = "") {
  return passwordRequirements.filter(({ test }) => !test(password));
}

export function isValidPassword(password = "") {
  return getMissingPasswordRequirements(password).length === 0;
}