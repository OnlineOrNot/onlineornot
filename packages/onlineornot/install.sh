#!/bin/bash
set -euo pipefail

# OnlineOrNot CLI Installer
# Usage: curl -fsSL https://onlineornot.com/install | bash

INSTALL_DIR="${ONLINEORNOT_INSTALL_DIR:-$HOME/.onlineornot}"
BIN_DIR="$INSTALL_DIR/bin"
REPO="OnlineOrNot/onlineornot"

# Colors
RED='\033[0;31m'
ORANGE='\033[38;5;214m'
DIM='\033[0;2m'
NC='\033[0m' # No Color

no_modify_path=false
requested_version=""

# Parse arguments
while [[ $# -gt 0 ]]; do
	case "$1" in
		-v|--version)
			if [[ -n "${2:-}" ]]; then
				requested_version="$2"
				shift 2
			else
				echo -e "${RED}Error: --version requires a version argument${NC}" >&2
				exit 1
			fi
			;;
		--no-modify-path)
			no_modify_path=true
			shift
			;;
		*)
			echo -e "${ORANGE}Warning: Unknown option '$1'${NC}" >&2
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

# Get currently installed version
get_installed_version() {
	if [[ -f "$INSTALL_DIR/version" ]]; then
		cat "$INSTALL_DIR/version"
	else
		echo ""
	fi
}

# Add to PATH by modifying shell config
add_to_path() {
	local config_file=$1
	local command=$2

	if grep -Fxq "$command" "$config_file" 2>/dev/null; then
		echo -e "${DIM}Command already exists in $config_file, skipping write.${NC}"
	elif [[ -w $config_file ]]; then
		echo -e "\n# onlineornot" >> "$config_file"
		echo "$command" >> "$config_file"
		echo -e "${DIM}Successfully added ${NC}onlineornot ${DIM}to \$PATH in ${NC}$config_file"
	else
		echo -e "${ORANGE}Warning: Manually add the directory to $config_file (or similar):${NC}" >&2
		echo -e "  $command" >&2
	fi
}

configure_path() {
	if [[ "$no_modify_path" == "true" ]]; then
		return
	fi

	# Check if already in PATH
	if [[ ":$PATH:" == *":$BIN_DIR:"* ]]; then
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
		echo -e "${ORANGE}Warning: No config file found for $current_shell. You may need to manually add to PATH:${NC}" >&2
		echo -e "  export PATH=\"$BIN_DIR:\$PATH\"" >&2
		return
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
	local OS ARCH VERSION BINARY_NAME DOWNLOAD_URL INSTALLED_VERSION

	OS=$(detect_os)
	ARCH=$(detect_arch)

	if [[ "$OS" == "unsupported" ]] || [[ "$ARCH" == "unsupported" ]]; then
		echo -e "${RED}Error: Unsupported platform: $(uname -s) $(uname -m)${NC}"
		exit 1
	fi

	if [[ -n "$requested_version" ]]; then
		VERSION="$requested_version"
	else
		VERSION=$(get_latest_version)
		
		if [[ -z "$VERSION" ]]; then
			echo -e "${RED}Error: Failed to detect latest version${NC}"
			exit 1
		fi

		# Check if already installed (only for latest)
		INSTALLED_VERSION=$(get_installed_version)
		if [[ "$INSTALLED_VERSION" == "$VERSION" ]]; then
			echo -e "${DIM}Version ${NC}${VERSION}${DIM} already installed${NC}"
			exit 0
		fi
	fi

	echo ""
	echo -e "${DIM}Installing ${NC}onlineornot ${DIM}version: ${NC}${VERSION}"
	
	mkdir -p "$BIN_DIR"
	
	BINARY_NAME="onlineornot-${OS}-${ARCH}"
	DOWNLOAD_URL="https://github.com/$REPO/releases/download/onlineornot%40${VERSION}/${BINARY_NAME}"

	if ! curl -#fSL "$DOWNLOAD_URL" -o "$BIN_DIR/onlineornot" 2>&1; then
		echo -e "${RED}Error: Download failed${NC}"
		exit 1
	fi

	chmod +x "$BIN_DIR/onlineornot"
	
	# Store version info
	echo "$VERSION" > "$INSTALL_DIR/version"

	# Configure PATH (silently)
	configure_path

	# Print success message
	echo ""
	echo -e "${DIM}█▀▀█ █▀▀▄ █   ▀ █▀▀▄ █▀▀ ${NC}█▀▀█ █▀▀█ ${DIM}█▀▀▄ █▀▀█ ▀▀█▀▀${NC}"
	echo -e "${DIM}█░░█ █░░█ █   █ █░░█ █▀▀ ${NC}█░░█ █▄▄▀ ${DIM}█░░█ █░░█   █${NC}"
	echo -e "${DIM}▀▀▀▀ ▀  ▀ ▀▀▀ ▀ ▀  ▀ ▀▀▀ ${NC}▀▀▀▀ ▀ ▀▀ ${DIM}▀  ▀ ▀▀▀▀   ▀${NC}"
	echo ""
	echo ""
	echo -e "${DIM}To get started:${NC}"
	echo ""
	echo -e "onlineornot login   ${DIM}# Authenticate${NC}"
	echo -e "onlineornot checks  ${DIM}# Manage checks${NC}"
	echo ""
	echo -e "${DIM}For more information visit ${NC}https://onlineornot.com/docs"
	echo ""
	echo ""
}

main "$@"
