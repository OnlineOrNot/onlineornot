#!/bin/bash
set -e

# OnlineOrNot CLI Installer
# Usage: curl -fsSL https://onlineornot.com/install.sh | bash

INSTALL_DIR="${ONLINEORNOT_INSTALL_DIR:-$HOME/.onlineornot}"
BIN_DIR="$INSTALL_DIR/bin"
REPO="OnlineOrNot/onlineornot-cli"

# Detect OS
detect_os() {
	case "$(uname -s)" in
		Linux*)  echo "linux" ;;
		Darwin*) echo "darwin" ;;
		*)       echo "unsupported" ;;
	esac
}

# Detect architecture
detect_arch() {
	case "$(uname -m)" in
		x86_64)  echo "amd64" ;;
		amd64)   echo "amd64" ;;
		arm64)   echo "arm64" ;;
		aarch64) echo "arm64" ;;
		*)       echo "unsupported" ;;
	esac
}

# Get latest version from GitHub
get_latest_version() {
	curl -sL "https://api.github.com/repos/$REPO/releases/latest" | 
		grep '"tag_name":' | 
		sed -E 's/.*"([^"]+)".*/\1/'
}

main() {
	OS=$(detect_os)
	ARCH=$(detect_arch)

	if [[ "$OS" == "unsupported" ]] || [[ "$ARCH" == "unsupported" ]]; then
		echo "❌ Unsupported platform: $(uname -s) $(uname -m)"
		exit 1
	fi

	echo "📡 Detecting latest version..."
	VERSION=$(get_latest_version)
	
	if [[ -z "$VERSION" ]]; then
		echo "❌ Failed to detect latest version"
		exit 1
	fi

	BINARY_NAME="onlineornot-${OS}-${ARCH}"
	DOWNLOAD_URL="https://github.com/$REPO/releases/download/${VERSION}/${BINARY_NAME}"

	echo "📥 Downloading OnlineOrNot CLI ${VERSION} for ${OS}/${ARCH}..."
	
	mkdir -p "$BIN_DIR"
	
	if ! curl -fSL "$DOWNLOAD_URL" -o "$BIN_DIR/onlineornot"; then
		echo "❌ Download failed"
		exit 1
	fi

	chmod +x "$BIN_DIR/onlineornot"
	
	# Store version info
	echo "$VERSION" > "$INSTALL_DIR/version"

	echo ""
	echo "✅ OnlineOrNot CLI installed to $BIN_DIR/onlineornot"
	echo ""

	# Check if already in PATH
	if command -v onlineornot &> /dev/null; then
		echo "🎉 You're all set! Run 'onlineornot' to get started."
	else
		echo "👉 Add to your PATH by adding this to your shell profile:"
		echo ""
		echo "   export PATH=\"$BIN_DIR:\$PATH\""
		echo ""
		echo "   Then restart your terminal or run: source ~/.bashrc (or ~/.zshrc)"
	fi
}

main "$@"
