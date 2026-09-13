// Vitest global setup: returns the run-level teardown (Vitest runs a function
// returned from globalSetup after ALL test files finish — the reliable hook for
// removing fixtures the suites leave in the shared persistent dev DB).
import teardown from './global-teardown.js';

export default function globalSetup() {
  return () => teardown();
}
