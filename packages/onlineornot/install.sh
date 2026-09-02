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
no_setup=false
dry_run=false
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
		--no-setup)
			no_setup=true
			shift
			;;
		--dry-run)
			dry_run=true
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

verify_checksum() {
	local binary_path=$1
	local checksum_path=$2
	local expected actual

	expected=$(cut -d ' ' -f 1 < "$checksum_path" | tr -d '\r\n')
	if [[ ! "$expected" =~ ^[a-fA-F0-9]{64}$ ]]; then
		echo -e "${RED}Error: Release checksum is missing or malformed${NC}" >&2
		return 1
	fi

	if command -v sha256sum >/dev/null 2>&1; then
		actual=$(sha256sum "$binary_path" | cut -d ' ' -f 1)
	elif command -v shasum >/dev/null 2>&1; then
		actual=$(shasum -a 256 "$binary_path" | cut -d ' ' -f 1)
	else
		echo -e "${RED}Error: SHA-256 verification is unavailable on this system${NC}" >&2
		return 1
	fi

	if [[ "$actual" != "$expected" ]]; then
		echo -e "${RED}Error: Downloaded binary checksum does not match the release checksum${NC}" >&2
		return 1
	fi
}

can_run_setup() {
	[[ -t 1 && -r /dev/tty && -w /dev/tty ]]
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
	local OS ARCH VERSION BINARY_NAME DOWNLOAD_URL CHECKSUM_URL
	local INSTALLED_VERSION=""
	local TEMP_DIR TEMP_BINARY TEMP_CHECKSUM

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
		if [[ "$INSTALLED_VERSION" == "$VERSION" && -x "$BIN_DIR/onlineornot" ]]; then
			echo -e "${DIM}Version ${NC}${VERSION}${DIM} already installed${NC}"
		fi
	fi

	BINARY_NAME="onlineornot-${OS}-${ARCH}"
	DOWNLOAD_URL="https://github.com/$REPO/releases/download/onlineornot%40${VERSION}/${BINARY_NAME}"
	CHECKSUM_URL="${DOWNLOAD_URL}.sha256"

	if [[ "$dry_run" == "true" ]]; then
		echo ""
		echo "Dry run: no files will be changed."
		echo "Version:  $VERSION"
		echo "Binary:   $DOWNLOAD_URL"
		echo "Checksum: $CHECKSUM_URL"
		echo "Install:  $BIN_DIR/onlineornot"
		if [[ "$no_setup" == "false" ]]; then
			echo "Setup:    $BIN_DIR/onlineornot setup (TTY only)"
		fi
		return
	fi

	if [[ "$INSTALLED_VERSION" != "$VERSION" || ! -x "$BIN_DIR/onlineornot" ]]; then
		echo ""
		echo -e "${DIM}Installing ${NC}onlineornot ${DIM}version: ${NC}${VERSION}"

		mkdir -p "$BIN_DIR"
		TEMP_DIR=$(mktemp -d "$INSTALL_DIR/.install.XXXXXX")
		TEMP_BINARY="$TEMP_DIR/$BINARY_NAME"
		TEMP_CHECKSUM="$TEMP_DIR/$BINARY_NAME.sha256"
		trap 'rm -rf "${TEMP_DIR:-}"' EXIT

		if ! curl -#fSL "$DOWNLOAD_URL" -o "$TEMP_BINARY" 2>&1; then
			echo -e "${RED}Error: Binary download failed${NC}"
			exit 1
		fi
		if ! curl -#fSL "$CHECKSUM_URL" -o "$TEMP_CHECKSUM" 2>&1; then
			echo -e "${RED}Error: Release checksum download failed; refusing to install${NC}"
			exit 1
		fi
		verify_checksum "$TEMP_BINARY" "$TEMP_CHECKSUM"
		chmod +x "$TEMP_BINARY"
		mv "$TEMP_BINARY" "$BIN_DIR/onlineornot"

		# Store version info only after the verified binary is in place.
		echo "$VERSION" > "$INSTALL_DIR/version"
	fi

	# Configure PATH (silently)
	configure_path

	# Print success message
	echo ""
	echo -e "${DIM}█▀▀█ █▀▀▄ █   ▀ █▀▀▄ █▀▀ ${NC}█▀▀█ █▀▀█ ${DIM}█▀▀▄ █▀▀█ ▀▀█▀▀${NC}"
	echo -e "${DIM}█░░█ █░░█ █   █ █░░█ █▀▀ ${NC}█░░█ █▄▄▀ ${DIM}█░░█ █░░█   █${NC}"
	echo -e "${DIM}▀▀▀▀ ▀  ▀ ▀▀▀ ▀ ▀  ▀ ▀▀▀ ${NC}▀▀▀▀ ▀ ▀▀ ${DIM}▀  ▀ ▀▀▀▀   ▀${NC}"
	echo ""
	echo ""
	if [[ "$no_setup" == "false" ]] && can_run_setup; then
		echo -e "${DIM}Let's create your first uptime check.${NC}"
		echo ""
		"$BIN_DIR/onlineornot" setup < /dev/tty
	else
		echo -e "${DIM}To get started:${NC}"
		echo ""
		echo -e "onlineornot setup  ${DIM}# Log in and create your first check${NC}"
		echo -e "onlineornot checks  ${DIM}# Manage checks${NC}"
	fi
	echo ""
	echo -e "${DIM}For more information visit ${NC}https://onlineornot.com/docs"
	echo ""
	echo ""
}

main "$@"
