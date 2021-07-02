#!/bin/sh

set -e

bin_dir="$HOME/.dotbin"
exe="$bin_dir/dot"
repo="ihack2712/dottie"
remote="https://github.com/$repo"
branch="install-map"
repo_raw="https://raw.githubusercontent.com/$repo"
base="$repo_raw/$branch"
downloadBase="$remote/releases/download"

if [ "$OS" = "Windows_NT" ]; then
	target="x86_64-pc-windows-msvc"
else
	case $(uname -sm) in
	"Darwin x86_64") target="x86_64-apple-darwin" ;;
	"Darwin arm64") target="aarch64-apple-darwin" ;;
	*) target="x86_64-unknown-linux-gnu" ;;
	esac
fi

################################################################################################

function style () {
  printf "\x1b[$1m"
}

BOLD="$(style 1)"
NO_BOLD="$(style 22)"
FGD="$(style 39)"
PURPLE="$(style 35)"
YELLOW="$(style 33)"
BLUE="$(style 34)"
RED="$(style 31)"

function stdout () {
  echo "$*"
}

function stderr () {
  >&2 stdout "$*"
}

function failure () {
  stderr "$*"
  exit 1
}

function getRemoteVersionFromUrl () {
  if [ $# -eq 0 ]; then
    failure "Missing remote URL!"
  fi
  if [ $# -eq 1 ]; then
    curl --fail --location --silent "$1"
    return
  fi
  failure "Invalid amount of arguments passed!"
}

function getLatestRemoteStableVersion () {
  stdout $(getRemoteVersionFromUrl "$base/latest.txt")
}

function getLatestRemoteCanaryVersion () {
  stdout $(getRemoteVersionFromUrl "$base/latest-canary.txt")
}

function hasCommand () {
  if ! command -v "$1" >/dev/null; then
    return 1
  fi
  return 0
}

function downloadUrlForVersion () {
  if [ $# -eq 0 ]; then
    failure "Missing version!"
  fi
  if [ $# -eq 1 ]; then
    stdout "$downloadBase/$1/dot-$target.zip"
    return
  fi
  failure "Invalid amount of arguments passed!"
}

################################################################################################

HELP="$(cat << EOF

  ${BOLD}Usage${NO_BOLD}: ${BLUE}sh -c "\$(curl -s ${repo_raw}/main/install.sh)" -- ${YELLOW}[${PURPLE}versionOrCommand${YELLOW}]${FGD}

  ${BOLD}Description${NO_BOLD}:

    Install the ${BOLD}${PURPLE}dot${FGD}${NO_BOLD}tie sync tool.

  ${BOLD}Commands${NO_BOLD}:

    ${BLUE}help      ${RED}-${FGD} Show this help text.
    ${BLUE}stable    ${RED}-${FGD} Install latest stable version.
    ${BLUE}canary    ${RED}-${FGD} Install latest canary version.
    ${BLUE}ls        ${RED}-${FGD} List all stable versions.
    ${BLUE}ls-canary ${RED}-${FGD} List all versions (including canary versions).

EOF
)"

################################################################################################

if [ $# -eq 0 ]; then
  failure "$HELP"
fi

if [ "$1" == "help" ]; then
  stdout "$HELP"
  exit 0
fi

function checkCommand () {
  if ! hasCommand "$1"; then
    failure "Must have ${PURPLE}$1${FGD} installed!"
  fi
}

requiredCommands="curl unzip"

for a in $requiredCommands; do
  checkCommand "$a"
done

################################################################################################

function cmdInstall () {
  if [ $# -eq 0 ]; then
    failure "Missing version to install!"
  fi
  if [ $# -eq 1 ]; then
    if [ ! -d "$bin_dir" ]; then
      mkdir -p "$bin_dir"
    fi
    stdout "$(downloadUrlForVersion "$1")"
    rm -f "$exe $exe.zip"
    curl --fail --location --progress-bar --output "$exe.zip" "$(downloadUrlForVersion "$1")"
    unzip -d "$bin_dir" -o "$exe.zip"
    rm "$exe.zip"
    mv "$bin_dir/dot-$target" "$bin_dir/dot"
    chmod +x "$exe"
    
    stdout "Dottie was installed successfully to $exe"
    if command -v dot >/dev/null; then
      stdout "Run 'dot --help' to get started"
    else
      case $SHELL in
      /bin/zsh) shell_profile=".zshrc" ;;
      *) shell_profile=".bash_profile" ;;
      esac
      stdout "Manually add the directory to your \$HOME/$shell_profile (or similar)"
      stdout "  export PATH=\"$bin_dir:\$PATH\""
      stdout "Run '$exe --help' to get started"
      export PATH="$bin_dir:$PATH"
    fi
    return
  fi
  failure "Invalid amount of arguments passed!"
}

function listVersionsFrom () {
  if [ $# -eq 0 ]; then
    failure "Missing file to list versions from."
  fi
  if [ $# -eq 1 ]; then
    versions="$(curl --fail --silent --location "$base/$1")"
    if ! [ $? -eq 0 ]; then
      failure "Could not get versions!";
    fi
    for version in $versions; do
      echo "- $version"
    done
    return
  fi
  failure "Invalid amount of arguments passed!"
}

function cmdListStable () {
  stdout "$(listVersionsFrom "history.txt")"
}

function cmdListCanary () {
  stdout "$(listVersionsFrom "history-canary.txt")"
}

function cmdInstallLatestStable () {
  cmdInstall "$(getLatestRemoteStableVersion)"
}

function cmdInstallLatestUnstable () {
  cmdInstall "$(getLatestRemoteCanaryVersion)"
}

case "$1" in
  "stable")
    cmdInstallLatestStable
    ;;
  "canary")
    cmdInstallLatestUnstable
    ;;
  "ls")
    cmdListStable
    ;;
  "ls-canary")
    cmdListCanary
    ;;
  *)
    cmdInstall "$1"
    ;;
esac
