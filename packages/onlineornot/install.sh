#!/bin/bash
set -euo pipefail

# OnlineOrNot CLI Installer
# Usage: curl -fsSL https://onlineornot.com/install | bash

INSTALL_DIR="${ONLINEORNOT_INSTALL_DIR:-$HOME/.onlineornot}"
BIN_DIR="$INSTALL_DIR/bin"
REPO="OnlineOrNot/onlineornot"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
DIM='\033[0;2m'
NC='\033[0m' # No Color

no_modify_path=false

# Parse arguments
while [[ $# -gt 0 ]]; do
	case "$1" in
		--no-modify-path)
			no_modify_path=true
			shift
			;;
		*)
			shift
			;;
	esac
done

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
	local arch
	arch=$(uname -m)
	
	case "$arch" in
		x86_64)  echo "amd64" ;;
		amd64)   echo "amd64" ;;
		arm64)   echo "arm64" ;;
		aarch64) echo "arm64" ;;
		*)       echo "unsupported" ;;
	esac
}

# Get latest version from GitHub
# Changesets uses tags like "onlineornot@1.2.3"
get_latest_version() {
	curl -sL "https://api.github.com/repos/$REPO/releases" | 
		grep '"tag_name":' | 
		grep 'onlineornot@' | 
		head -1 | 
		sed -E 's/.*"onlineornot@([^"]+)".*/\1/'
}

# Add to PATH by modifying shell config
add_to_path() {
	local config_file=$1
	local command=$2

	if grep -Fxq "$command" "$config_file" 2>/dev/null; then
		echo -e "${DIM}PATH already configured in $config_file${NC}"
	elif [[ -w $config_file ]]; then
		echo -e "\n# onlineornot" >> "$config_file"
		echo "$command" >> "$config_file"
		echo -e "${GREEN}✓${NC} Added to PATH in ${CYAN}$config_file${NC}"
	else
		echo -e "${YELLOW}⚠${NC} Could not write to $config_file"
		echo -e "  Manually add: ${CYAN}$command${NC}"
	fi
}

configure_path() {
	if [[ "$no_modify_path" == "true" ]]; then
		return
	fi

	# Check if already in PATH
	if [[ ":$PATH:" == *":$BIN_DIR:"* ]]; then
		echo -e "${DIM}Already in PATH${NC}"
		return
	fi

	local current_shell
	current_shell=$(basename "$SHELL")
	
	local XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
	
	local config_files
	case $current_shell in
		fish)
			config_files="$HOME/.config/fish/config.fish $XDG_CONFIG_HOME/fish/config.fish"
			;;
		zsh)
			config_files="${ZDOTDIR:-$HOME}/.zshrc ${ZDOTDIR:-$HOME}/.zshenv $HOME/.zshrc $HOME/.zshenv $XDG_CONFIG_HOME/zsh/.zshrc $XDG_CONFIG_HOME/zsh/.zshenv"
			;;
		bash)
			config_files="$HOME/.bashrc $HOME/.bash_profile $HOME/.profile $XDG_CONFIG_HOME/bash/.bashrc $XDG_CONFIG_HOME/bash/.bash_profile"
			;;
		ash|sh)
			config_files="$HOME/.ashrc $HOME/.profile /etc/profile"
			;;
		*)
			config_files="$HOME/.bashrc $HOME/.bash_profile $HOME/.profile $XDG_CONFIG_HOME/bash/.bashrc"
			;;
	esac

	# Find first existing config file
	local config_file=""
	for file in $config_files; do
		if [[ -f $file ]]; then
			config_file=$file
			break
		fi
	done

	if [[ -z $config_file ]]; then
		# Create default config file
		case $current_shell in
			zsh)  config_file="$HOME/.zshrc" ;;
			fish) 
				mkdir -p "$HOME/.config/fish"
				config_file="$HOME/.config/fish/config.fish" 
				;;
			*)    config_file="$HOME/.bashrc" ;;
		esac
		touch "$config_file"
	fi

	case $current_shell in
		fish)
			add_to_path "$config_file" "fish_add_path $BIN_DIR"
			;;
		*)
			add_to_path "$config_file" "export PATH=\"$BIN_DIR:\$PATH\""
			;;
	esac
}

main() {
	local OS ARCH VERSION BINARY_NAME DOWNLOAD_URL

	OS=$(detect_os)
	ARCH=$(detect_arch)

	if [[ "$OS" == "unsupported" ]] || [[ "$ARCH" == "unsupported" ]]; then
		echo -e "${RED}✗${NC} Unsupported platform: $(uname -s) $(uname -m)"
		exit 1
	fi

	echo -e "${DIM}Detecting latest version...${NC}"
	VERSION=$(get_latest_version)
	
	if [[ -z "$VERSION" ]]; then
		echo -e "${RED}✗${NC} Failed to detect latest version"
		exit 1
	fi

	BINARY_NAME="onlineornot-${OS}-${ARCH}"
	DOWNLOAD_URL="https://github.com/$REPO/releases/download/onlineornot%40${VERSION}/${BINARY_NAME}"

	echo -e "Installing OnlineOrNot CLI ${CYAN}v${VERSION}${NC} for ${OS}/${ARCH}"
	
	mkdir -p "$BIN_DIR"
	
	if ! curl -fSL "$DOWNLOAD_URL" -o "$BIN_DIR/onlineornot" 2>/dev/null; then
		echo -e "${RED}✗${NC} Download failed"
		exit 1
	fi

	chmod +x "$BIN_DIR/onlineornot"
	
	# Store version info
	echo "$VERSION" > "$INSTALL_DIR/version"

	echo -e "${GREEN}✓${NC} Installed to ${CYAN}$BIN_DIR/onlineornot${NC}"
	echo ""

	# Configure PATH
	configure_path

	echo ""
	echo -e "${GREEN}✓${NC} Installation complete!"
	echo ""
	echo -e "${DIM}Restart your terminal, then run:${NC}"
	echo ""
	echo -e "  onlineornot login"
	echo -e "  onlineornot checks list"
	echo ""
}

main "$@"
