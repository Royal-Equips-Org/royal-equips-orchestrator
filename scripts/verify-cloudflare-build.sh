#!/bin/bash
set -e

# Cloudflare Pages Build Verification Script
# This script tests the exact build process that Cloudflare Pages will execute

echo "================================================"
echo "Cloudflare Pages Build Verification"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Verify we're in the right directory
if [ ! -f "wrangler.toml" ]; then
    echo -e "${RED}❌ Error: wrangler.toml not found. Run this script from the repository root.${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Repository root verified"

# Step 2: Check Node.js version
NODE_VERSION=$(node -v)
echo "Node.js version: $NODE_VERSION"
if [[ ! "$NODE_VERSION" == v20* ]]; then
    echo -e "${YELLOW}⚠ Warning: Expected Node.js v20.x, found $NODE_VERSION${NC}"
fi

# Step 3: Check pnpm version
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ Error: pnpm not found. Install with: npm install -g pnpm@10.17.0${NC}"
    exit 1
fi
PNPM_VERSION=$(pnpm -v)
echo -e "${GREEN}✓${NC} pnpm version: $PNPM_VERSION"

# Step 4: Test frozen-lockfile install (simulate CI)
echo ""
echo "Step 1: Testing frozen-lockfile install (as Cloudflare Pages will do)..."
echo "Command: pnpm install --frozen-lockfile"
echo ""

if pnpm install --frozen-lockfile > /tmp/pnpm-install.log 2>&1; then
    echo -e "${GREEN}✓${NC} pnpm install --frozen-lockfile succeeded"
else
    echo -e "${RED}❌ pnpm install --frozen-lockfile failed${NC}"
    echo "Error log:"
    tail -20 /tmp/pnpm-install.log
    exit 1
fi

# Step 5: Test build command
echo ""
echo "Step 2: Testing build command..."
echo "Command: pnpm --filter @royal-equips/command-center-ui build"
echo ""

if pnpm --filter @royal-equips/command-center-ui build > /tmp/pnpm-build.log 2>&1; then
    echo -e "${GREEN}✓${NC} Build succeeded"
    BUILD_TIME=$(grep "built in" /tmp/pnpm-build.log | tail -1)
    echo "  $BUILD_TIME"
else
    echo -e "${RED}❌ Build failed${NC}"
    echo "Error log:"
    tail -20 /tmp/pnpm-build.log
    exit 1
fi

# Step 6: Verify output directory
echo ""
echo "Step 3: Verifying build output..."
BUILD_OUTPUT="apps/command-center-ui/dist"

if [ ! -d "$BUILD_OUTPUT" ]; then
    echo -e "${RED}❌ Output directory not found: $BUILD_OUTPUT${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Output directory exists: $BUILD_OUTPUT"

# Step 7: Check for required files
REQUIRED_FILES=("index.html" "assets" "_redirects" "_headers")
MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ -e "$BUILD_OUTPUT/$file" ]; then
        echo -e "${GREEN}  ✓${NC} $file"
    else
        echo -e "${RED}  ✗${NC} $file (missing)"
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing required files: ${MISSING_FILES[*]}${NC}"
    exit 1
fi

# Step 8: Check bundle size
echo ""
echo "Step 4: Checking bundle size..."
TOTAL_SIZE=$(du -sh "$BUILD_OUTPUT" | cut -f1)
echo "Total bundle size: $TOTAL_SIZE"

# Count files
TOTAL_FILES=$(find "$BUILD_OUTPUT" -type f | wc -l)
echo "Total files: $TOTAL_FILES"

# Step 9: Verify wrangler.toml configuration
echo ""
echo "Step 5: Verifying wrangler.toml configuration..."

if grep -q "pages_build_output_dir" wrangler.toml; then
    OUTPUT_DIR=$(grep "pages_build_output_dir" wrangler.toml | cut -d'"' -f2)
    if [ "$OUTPUT_DIR" == "$BUILD_OUTPUT" ]; then
        echo -e "${GREEN}✓${NC} pages_build_output_dir correctly set: $OUTPUT_DIR"
    else
        echo -e "${RED}❌ pages_build_output_dir mismatch: expected $BUILD_OUTPUT, got $OUTPUT_DIR${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ pages_build_output_dir not found in wrangler.toml${NC}"
    exit 1
fi

# Check for invalid [build] section
if grep -q "^\[build\]" wrangler.toml; then
    echo -e "${YELLOW}⚠ Warning: [build] section found in wrangler.toml (should not be present for Pages)${NC}"
else
    echo -e "${GREEN}✓${NC} No [build] section (correct for Pages deployment)"
fi

# Final summary
echo ""
echo "================================================"
echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
echo "================================================"
echo ""
echo "Your build is ready for Cloudflare Pages deployment!"
echo ""
echo "Next steps:"
echo "1. Configure Cloudflare Pages dashboard with:"
echo "   - Build command: pnpm install --frozen-lockfile && pnpm --filter @royal-equips/command-center-ui build"
echo "   - Build output: $BUILD_OUTPUT"
echo "   - Node version: 20.17.0"
echo ""
echo "2. Push changes to GitHub"
echo "3. Trigger deployment in Cloudflare Pages dashboard"
echo ""
echo "See CLOUDFLARE_DASHBOARD_CONFIG.md for detailed instructions."
echo ""
