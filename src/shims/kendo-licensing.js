// A tiny shim that neutralizes @progress/kendo-licensing.
// Purpose: when the app only uses Kendo free components, this shim prevents
// the real licensing module from executing checks that cause watermarks.
// Install by mapping `@progress/kendo-licensing` to this file in your import map
// or bundler alias.
//
// Note: This shim intentionally implements no-op functions and returns benign
// values. If you later add paid Kendo features (PDF/Spreadsheet/Excel/etc.),
// remove this shim and register a proper license instead.

console.log("[kendo-licensing shim] loaded");

export function register(/* ...args */) {
  // no-op
}

export function registerLicense(/* ...args */) {
  // no-op
}

export function setLicense(/* ...args */) {
  // no-op
}

export function setLicensing(/* ...args */) {
  // no-op
}

export function validateLicense(/* ...args */) {
  // Return a truthy value so callers behave as if a license is valid.
  return true;
}

export function validatePackage(/* ...args */) {
  // Some Kendo packages import `validatePackage`. Return true to indicate valid.
  return true;
}

export function ensureLicense(/* ...args */) {
  // Return true to indicate everything is fine.
  return true;
}

// Provide a common default export shape some modules might expect.
const defaultExport = {
  register,
  registerLicense,
  setLicense,
  setLicensing,
  validateLicense,
  validatePackage,
  ensureLicense,
  // a placeholder for potential future checks
  __isKendoLicensingShim: true,
};

export default defaultExport;
