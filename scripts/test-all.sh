#!/usr/bin/env bash
#
# test-all.sh — single local entry point that runs the entire test/quality
# pipeline for the One-Click Databricks Deployer, WITHOUT GitHub Actions.
#
# Stages (in order, fail-fast):
#   build   npm run build (produces dist/, fetches vendored Terraform)
#   deps    dependency vulnerability audit (npm audit)
#   unit    Vitest unit tests + V8 coverage with enforced thresholds
#   e2e     Playwright end-to-end tests (browser) + optional coverage
#
# The GitHub Actions workflow (.github/workflows/ci.yml) is a THIN wrapper that
# only checks out, sets up Node, and calls this script with --ci. All test logic
# lives here, so "turning Actions back on" needs no change to test code.
#
# Usage:
#   scripts/test-all.sh                 # full pipeline
#   scripts/test-all.sh --ci            # CI mode (sets CI=1: retries, 1 worker, html report)
#   scripts/test-all.sh --only unit     # one stage: build|deps|unit|e2e
#   scripts/test-all.sh --skip e2e      # run everything except a stage (repeatable)
#   scripts/test-all.sh --e2e-coverage  # run e2e under coverage config (slower)
#   scripts/test-all.sh --audit-level=critical   # audit gate severity (default: high)
#   scripts/test-all.sh -h
#
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# ---- options ---------------------------------------------------------------
ONLY=""
SKIP=()
E2E_COVERAGE=0
AUDIT_LEVEL="high"        # prod-dep audit gate: low|moderate|high|critical
STRICT_AUDIT=0           # by default audit only WARNs; --strict-audit makes it fail
CI_MODE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ci) CI_MODE=1; shift ;;
    --only) ONLY="${2:?}"; shift 2 ;;
    --skip) SKIP+=("${2:?}"); shift 2 ;;
    --e2e-coverage) E2E_COVERAGE=1; shift ;;
    --audit-level=*) AUDIT_LEVEL="${1#*=}"; shift ;;
    --strict-audit) STRICT_AUDIT=1; shift ;;
    -h|--help) sed -n '2,33p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "argumento desconhecido: $1" >&2; exit 2 ;;
  esac
done

[[ "$CI_MODE" -eq 1 ]] && export CI=1

# ---- helpers ---------------------------------------------------------------
BLUE=$'\033[1;34m'; GREEN=$'\033[1;32m'; RED=$'\033[1;31m'; YELLOW=$'\033[1;33m'; DIM=$'\033[2m'; RST=$'\033[0m'
declare -a RESULTS   # "stage|status" for the final summary

step()  { printf '\n%s▶ %s%s\n' "$BLUE" "$*" "$RST"; }
info()  { printf '%s  %s%s\n' "$DIM" "$*" "$RST"; }
ok()    { printf '%s✔ %s%s\n' "$GREEN" "$*" "$RST"; }
warn()  { printf '%s! %s%s\n' "$YELLOW" "$*" "$RST"; }
fail()  { printf '%s✗ %s%s\n' "$RED" "$*" "$RST"; }

# Should this stage run given --only / --skip?
wants() {
  local stage="$1"
  [[ -n "$ONLY" && "$ONLY" != "$stage" ]] && return 1
  local s; for s in "${SKIP[@]:-}"; do [[ "$s" == "$stage" ]] && return 1; done
  return 0
}

record() { RESULTS+=("$1|$2"); }

BUILD_RAN=0   # set once the build stage succeeds, so e2e can skip a rebuild

# ---- stages ----------------------------------------------------------------
stage_build() {
  step "build — npm run build"
  if npm run build; then ok "build"; record build PASS; BUILD_RAN=1; else fail "build"; record build FAIL; return 1; fi
}

stage_deps() {
  step "deps — dependency vulnerability audit"
  # Full report (all deps) is informational; it never fails the pipeline.
  info "Relatório completo (dev + prod):"
  npm audit || true
  # The check runs on PRODUCTION deps only (what ships / runs), at --audit-level.
  info "Produção: npm audit --omit=dev --audit-level=$AUDIT_LEVEL"
  if npm audit --omit=dev --audit-level="$AUDIT_LEVEL"; then
    ok "deps (nenhuma vulnerabilidade de produção >= $AUDIT_LEVEL)"; record deps PASS; return 0
  fi
  if [[ "$STRICT_AUDIT" -eq 1 ]]; then
    fail "deps: vulnerabilidade de produção >= $AUDIT_LEVEL (--strict-audit). Rode 'npm audit fix' ou trate."; record deps FAIL; return 1
  fi
  warn "deps: vulnerabilidade de produção >= $AUDIT_LEVEL (não bloqueante; use --strict-audit para gate). Rode 'npm audit fix'."
  record deps WARN; return 0
}

stage_unit() {
  step "unit — Vitest + cobertura (thresholds em vitest.config.js)"
  if npx vitest run --coverage; then ok "unit + cobertura"; record unit PASS; else fail "unit/cobertura"; record unit FAIL; return 1; fi
}

# Detect whether the Playwright browser is actually installed on disk.
browser_installed() {
  node -e "try{const {chromium}=require('@playwright/test');process.exit(require('fs').existsSync(chromium.executablePath())?0:1)}catch(e){process.exit(1)}" 2>/dev/null
}

stage_e2e() {
  step "e2e — Playwright"

  # Ensure the Playwright browser is present. Playwright >= 1.63 installs fine on
  # Node 22+ (older versions could not). On CI we also install OS deps.
  if ! browser_installed; then
    info "Instalando browser do Playwright (Chromium)..."
    if [[ "${CI:-}" == "1" ]]; then
      npx playwright install --with-deps chromium || { fail "falha ao instalar o browser do Playwright"; record e2e FAIL; return 1; }
    else
      npx playwright install chromium || { fail "falha ao instalar o browser do Playwright"; record e2e FAIL; return 1; }
    fi
  fi

  # Serve a fresh dist/ without making Playwright's webServer rebuild it. If the
  # build stage did not run in this invocation (e.g. --only e2e), build now.
  if [[ "$BUILD_RAN" -ne 1 ]]; then
    info "Garantindo dist/ atualizado para o e2e (npm run build)"
    npm run build || { fail "build para e2e falhou"; record e2e FAIL; return 1; }
  fi
  export PLAYWRIGHT_SKIP_BUILD=1

  local rc=0
  if [[ "$E2E_COVERAGE" -eq 1 ]]; then
    info "Rodando e2e sob cobertura (playwright.coverage.config.js)"
    npm run test:coverage || rc=$?
  else
    npm test || rc=$?
  fi
  if [[ "$rc" -eq 0 ]]; then ok "e2e"; record e2e PASS; else fail "e2e"; record e2e FAIL; return 1; fi
}

# ---- run -------------------------------------------------------------------
OVERALL=0
for stage in build deps unit e2e; do
  wants "$stage" || { [[ -z "$ONLY" ]] && info "(pulando $stage)"; continue; }
  case "$stage" in
    build) stage_build || OVERALL=1 ;;
    deps)  stage_deps  || OVERALL=1 ;;
    unit)  stage_unit  || OVERALL=1 ;;
    e2e)   stage_e2e   || OVERALL=1 ;;
  esac
  # fail-fast: stop at the first hard failure
  [[ "$OVERALL" -ne 0 ]] && break
done

# ---- summary ---------------------------------------------------------------
step "Resumo"
for r in "${RESULTS[@]:-}"; do
  [[ -z "$r" ]] && continue
  name="${r%%|*}"; status="${r##*|}"
  case "$status" in
    PASS) ok "$name: PASS" ;;
    WARN) warn "$name: WARN" ;;
    SKIP) warn "$name: SKIP" ;;
    FAIL) fail "$name: FAIL" ;;
  esac
done

if [[ "$OVERALL" -eq 0 ]]; then
  printf '\n%s✔ pipeline OK%s\n' "$GREEN" "$RST"
else
  printf '\n%s✘ pipeline com falhas%s\n' "$RED" "$RST"
fi
exit "$OVERALL"
