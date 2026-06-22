// Intentionally never imported by any other file in this fixture.
// Used to verify that deep_analyze_repo's dead-code heuristic flags
// exported-but-unreferenced modules.
export function unusedHelper() {
  return "this function is never called";
}
