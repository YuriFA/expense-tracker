package domain //nolint:testpackage // needs the unexported errorSpecs table

import (
	"os"
	"regexp"
	"slices"
	"testing"
)

// transportEmittedCodes are the machine codes written directly by the HTTP
// layer (transport/http/httperr constants and middleware), outside
// errorSpecs. Keep in sync with httperr.go: a new constant there must be
// added here, and — unless it joins undocumentedCodes — documented as a
// `code:` example in docs/api/openapi.yaml.
var transportEmittedCodes = []string{
	"INVALID_REQUEST",
	"VALIDATION_FAILED",
	"INTERNAL_ERROR",
	"UNAUTHORIZED",
	"TOO_MANY_REQUESTS",
	"IDEMPOTENCY_KEY_MISSING",
	"IDEMPOTENCY_KEY_IN_USE",
	"IDEMPOTENCY_KEY_MISMATCH",
	"REGISTER_RATE_LIMITED",
	"ORIGIN_REJECTED",
}

// undocumentedCodes may be emitted by the backend but are deliberately
// absent from the spec. ORIGIN_REJECTED is the infrastructural CORS 403 of
// ADR-0001 (pre-flight rejections for out-of-allowlist origins): it is not
// part of the per-endpoint client contract.
var undocumentedCodes = []string{"ORIGIN_REJECTED"}

// Matches `code: SOME_CODE` example values in openapi.yaml. All error-code
// example values in the spec are uppercase snake_case literals on their own
// line, so a line-anchored regex is enough — no YAML parser needed.
var specCodeRe = regexp.MustCompile(`(?m)^\s*code:\s*([A-Z][A-Z0-9_]+)\s*$`)

// TestErrorCodesMatchOpenAPISpec pins the error-code contract in both
// directions: every code the backend emits appears in the spec, and every
// code the spec shows is emitted somewhere. Replaces the "keep in sync"
// comment that used to be the only guard of this parity.
func TestErrorCodesMatchOpenAPISpec(t *testing.T) {
	t.Parallel()
	raw, err := os.ReadFile("../../../docs/api/openapi.yaml")
	if err != nil {
		t.Fatalf("read openapi.yaml: %v", err)
	}
	specCodes := map[string]bool{}
	for _, m := range specCodeRe.FindAllStringSubmatch(string(raw), -1) {
		specCodes[m[1]] = true
	}
	if len(specCodes) == 0 {
		t.Fatal("no codes extracted from openapi.yaml — file layout or regex drift")
	}

	emitted := map[string]bool{}
	for _, spec := range errorSpecs {
		emitted[spec.Code] = true
	}
	for _, code := range transportEmittedCodes {
		emitted[code] = true
	}

	var missingInSpec, unknownInSpec []string
	for code := range emitted {
		if !specCodes[code] && !slices.Contains(undocumentedCodes, code) {
			missingInSpec = append(missingInSpec, code)
		}
	}
	for code := range specCodes {
		if !emitted[code] {
			unknownInSpec = append(unknownInSpec, code)
		}
	}
	slices.Sort(missingInSpec)
	slices.Sort(unknownInSpec)

	if len(missingInSpec) > 0 {
		t.Errorf("emitted by the backend but absent from docs/api/openapi.yaml "+
			"(add a `code:` example or extend undocumentedCodes): %v", missingInSpec)
	}
	if len(unknownInSpec) > 0 {
		t.Errorf("documented in openapi.yaml but emitted nowhere "+
			"(stale example, or missing errorSpecs/httperr entry): %v", unknownInSpec)
	}

	// The allowlist must not rot: every undocumented code still has to be a
	// real transport emission.
	for _, code := range undocumentedCodes {
		if !slices.Contains(transportEmittedCodes, code) {
			t.Errorf("undocumentedCodes lists %q, but transport never emits it", code)
		}
	}
}
