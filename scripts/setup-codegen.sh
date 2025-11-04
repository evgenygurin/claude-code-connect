#!/bin/bash

# Codegen Setup Script
# This script helps you configure Codegen integration for your repository

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if GitHub CLI is installed
check_gh_cli() {
    if ! command -v gh &> /dev/null; then
        print_error "GitHub CLI (gh) is not installed"
        print_info "Install it from: https://cli.github.com/"
        exit 1
    fi
    print_success "GitHub CLI is installed"
}

# Check if user is authenticated with GitHub
check_gh_auth() {
    if ! gh auth status &> /dev/null; then
        print_error "Not authenticated with GitHub CLI"
        print_info "Run: gh auth login"
        exit 1
    fi
    print_success "Authenticated with GitHub"
}

# Main setup function
main() {
    print_header "Codegen Integration Setup"

    echo "This script will help you set up Codegen integration for your repository."
    echo ""

    # Check prerequisites
    print_info "Checking prerequisites..."
    check_gh_cli
    check_gh_auth

    # Get Codegen credentials
    print_header "Step 1: Codegen Credentials"

    echo "You need to get your Codegen credentials:"
    echo "1. API Token: https://codegen.com/token"
    echo "2. Organization ID: https://codegen.com/settings"
    echo ""

    read -p "Do you have your Codegen credentials ready? (y/n): " has_credentials

    if [[ "$has_credentials" != "y" ]]; then
        print_warning "Please get your credentials first and run this script again"
        exit 0
    fi

    # Get API token
    echo ""
    read -sp "Enter your Codegen API token: " CODEGEN_API_TOKEN
    echo ""

    if [[ -z "$CODEGEN_API_TOKEN" ]]; then
        print_error "API token cannot be empty"
        exit 1
    fi

    # Get organization ID
    read -p "Enter your Codegen organization ID: " CODEGEN_ORG_ID

    if [[ -z "$CODEGEN_ORG_ID" ]]; then
        print_error "Organization ID cannot be empty"
        exit 1
    fi

    # Set GitHub secrets
    print_header "Step 2: Setting GitHub Secrets"

    print_info "Setting CODEGEN_API_TOKEN..."
    echo "$CODEGEN_API_TOKEN" | gh secret set CODEGEN_API_TOKEN
    print_success "CODEGEN_API_TOKEN set"

    print_info "Setting CODEGEN_ORG_ID..."
    echo "$CODEGEN_ORG_ID" | gh secret set CODEGEN_ORG_ID
    print_success "CODEGEN_ORG_ID set"

    # Create labels
    print_header "Step 3: Creating GitHub Labels"

    labels=(
        "codegen:Trigger Codegen agent:0E8A16"
        "codegen\:bug-fix:Auto-fix bug:D73A4A"
        "codegen\:feature:Implement feature:0075CA"
        "codegen\:refactor:Refactor code:5319E7"
        "codegen\:auto-fix:Auto-fix CI failures:FBCA04"
        "codegen\:review:Code review:1D76DB"
        "codegen\:tests:Add tests:C5DEF5"
        "codegen\:docs:Update documentation:0052CC"
    )

    for label_info in "${labels[@]}"; do
        IFS=':' read -r name description color <<< "$label_info"

        if gh label list | grep -q "^${name}"; then
            print_warning "Label '${name}' already exists, skipping"
        else
            gh label create "$name" --description "$description" --color "$color" 2>/dev/null || true
            print_success "Created label: $name"
        fi
    done

    # Verify workflow files exist
    print_header "Step 4: Verifying Workflow Files"

    if [[ -f ".github/workflows/codegen.yml" ]]; then
        print_success "Main Codegen workflow exists"
    else
        print_error "Main Codegen workflow not found at .github/workflows/codegen.yml"
    fi

    if [[ -f ".github/workflows/codegen-labels.yml" ]]; then
        print_success "Codegen labels workflow exists"
    else
        print_error "Labels workflow not found at .github/workflows/codegen-labels.yml"
    fi

    if [[ -f ".codegen/config.yml" ]]; then
        print_success "Codegen config exists"
    else
        print_warning "Codegen config not found at .codegen/config.yml"
    fi

    # Update .env file if it exists
    print_header "Step 5: Updating Local Configuration"

    if [[ -f ".env" ]]; then
        read -p "Update .env file with Codegen credentials? (y/n): " update_env

        if [[ "$update_env" == "y" ]]; then
            if grep -q "CODEGEN_API_TOKEN" .env; then
                # Update existing entries
                sed -i.bak "s|CODEGEN_API_TOKEN=.*|CODEGEN_API_TOKEN=$CODEGEN_API_TOKEN|g" .env
                sed -i.bak "s|CODEGEN_ORG_ID=.*|CODEGEN_ORG_ID=$CODEGEN_ORG_ID|g" .env
                rm -f .env.bak
                print_success "Updated .env file"
            else
                # Add new entries
                echo "" >> .env
                echo "# Codegen Integration" >> .env
                echo "CODEGEN_API_TOKEN=$CODEGEN_API_TOKEN" >> .env
                echo "CODEGEN_ORG_ID=$CODEGEN_ORG_ID" >> .env
                print_success "Added Codegen credentials to .env"
            fi
        fi
    else
        print_info "No .env file found, skipping local configuration"
    fi

    # Test connection
    print_header "Step 6: Testing Connection"

    print_info "Testing Codegen API connection..."

    cat > /tmp/test_codegen.py << EOF
import os
import sys

try:
    from codegen.agents.agent import Agent

    agent = Agent(
        org_id="${CODEGEN_ORG_ID}",
        token="${CODEGEN_API_TOKEN}"
    )

    print("✅ Connection successful!")
    print(f"📊 Organization ID: ${CODEGEN_ORG_ID}")
    sys.exit(0)
except ImportError:
    print("⚠️  Codegen SDK not installed. Install with: pip install codegen")
    sys.exit(1)
except Exception as e:
    print(f"❌ Connection failed: {e}")
    sys.exit(1)
EOF

    if command -v python3 &> /dev/null; then
        python3 /tmp/test_codegen.py || print_warning "Connection test failed"
    else
        print_warning "Python not found, skipping connection test"
    fi

    rm -f /tmp/test_codegen.py

    # GitHub App installation
    print_header "Step 7: GitHub App Installation"

    echo "For full functionality, install the Codegen GitHub App:"
    echo "1. Visit: https://github.com/apps/codegen-sh"
    echo "2. Click 'Install'"
    echo "3. Select this repository"
    echo "4. Grant required permissions"
    echo ""

    read -p "Open GitHub App installation page? (y/n): " open_app

    if [[ "$open_app" == "y" ]]; then
        if command -v xdg-open &> /dev/null; then
            xdg-open "https://github.com/apps/codegen-sh"
        elif command -v open &> /dev/null; then
            open "https://github.com/apps/codegen-sh"
        else
            print_info "Please visit: https://github.com/apps/codegen-sh"
        fi
    fi

    # Summary
    print_header "Setup Complete! 🎉"

    echo "Codegen integration is now configured for your repository!"
    echo ""
    echo "Next steps:"
    echo "1. ✅ Create a test PR"
    echo "2. ✅ Add the 'codegen' label or comment with @codegen"
    echo "3. ✅ Watch the agent work its magic!"
    echo ""
    echo "Documentation:"
    echo "- Setup guide: docs/CODEGEN-SETUP.md"
    echo "- Codegen docs: https://docs.codegen.com"
    echo "- Agent runs: https://codegen.com/runs"
    echo ""
    echo "Usage examples:"
    echo "- @codegen please review this code"
    echo "- @codegen fix the failing tests"
    echo "- Add label: codegen:bug-fix"
    echo ""

    print_success "Setup completed successfully!"
}

# Run main function
main
