#!/usr/bin/env bash
set -euo pipefail
SOURCE_DIR="$(dirname "$(realpath "${BASH_SOURCE[0]}")")"
PATH="$SOURCE_DIR:$PATH"

##########################
# Hjelpe meg!
##########################
print_help() {
  cat <<-EOF
	Compiles a did file to Rust and applies any saved manual changes.

	Usage: $(basename "$0") <CANISTER_NAME>

	Hint: To create a patchfile:
	  - Customise the built rust file to your heart's content.
	  - Commit the modified file.
	  - Remove any existing patchfile.
	  - Make a clean build (this will undo your changes)
	  - Run: git diff -R \$CANISTER_NAME.rs > \CANISTER_NAME.patch
	  - Check out the rust file to recover your changes.
	  - Now, rebuilding should create a file with your changes.

	EOF
}

# This command, with paths stripped down to the basename.
STRIPPED_COMMAND="scripts/did2rs.sh$(printf " %q" "${@##*/}")"

# Source the clap.bash file ---------------------------------------------------
source "$SOURCE_DIR/clap.bash"
# Define options
clap.define short=c long=canister desc="The canister name" variable=CANISTER_NAME default=""
clap.define short=d long=did desc="The did path.  Default: {GIT_ROOT}/declarations/used_by_{CRATE}/{CANISTER_NAME}/{CANISTER_NAME}.did" variable=DID_PATH default=""
clap.define short=o long=out desc="The path to the output rust file." variable=RUST_PATH default="/dev/stdout"
clap.define short=p long=patch desc="The path to the patch file, if any.  Default: {RUST_PATH} with the suffix .patch instead of .rs" variable=PATCH_PATH default=""
clap.define short=t long=traits desc='The traits to add to types' variable=TRAITS default=""
clap.define short=h long=header desc="Path to a header to be prepended to every file." variable=HEADER default=""
# Source the output file ----------------------------------------------------------
source "$(clap.build)"

if [[ "$(uname)" == "Darwin" ]]; then
  sed="gsed"
else
  sed="sed"
fi

##########################
# Get working dir and args
##########################
CANISTER_NAME="${CANISTER_NAME:-${1:-${DID_PATH:-}}}"
CANISTER_NAME="$(basename "${CANISTER_NAME%.did}")"
GIT_ROOT="$(git rev-parse --show-toplevel)"

PATCH_PATH="${PATCH_PATH:-${RUST_PATH%.rs}.patch}"
EDIT_PATH="${EDIT_PATH:-${RUST_PATH%.rs}.edit}"
CRATE="$(echo "${RUST_PATH}" | "$sed" -nE 's@.*/rs/([^/]+)/.*@\1@p')"
DID_PATH="${DID_PATH:-${GIT_ROOT}/declarations/used_by_${CRATE}/${CANISTER_NAME}/${CANISTER_NAME}.did}"

cd "$GIT_ROOT"

: "Ensure that tools are installed and working.  Rustfmt in particular can self-upgrade when called and the self-upgrade can fail."
{
  "$SOURCE_DIR/ensure-required-didc-version"
  rustfmt --version
} >/dev/null

##########################
# Translate candid to Rust
##########################
{
  # The first line should be a comment declaring how the rust file was created.
  echo "//! Rust code created from candid by: \`$STRIPPED_COMMAND\`"

  # We preserve lines starting `//!` at the head of the .did file.
  # These are used to provide information about provenance.
  "$sed" -nE '/\/\/!/{p;b;};q' "${DID_PATH}"

  # Here we write the next few lines of the Rust file.
  #
  # This is autogenerated code.  We allow the following:
  #   - Some field names in the API do not follow the Rust naming convention.
  #   - We do not allow the formatter to alter the files, as that would break the patch files.
  #   - Types and fields may be unused or not exactly as clippy might wish.  Tough.
  #
  # We import traits that we apply to the Rust types.
  if [[ "${HEADER:-}" == "" ]]; then
    echo "WARNING: No header specified.  You may need to add rust imports manually." >&2
  else
    if test -e "${HEADER}"; then
      cat "${HEADER:-}"
    else
      echo "ERROR: Header file not found at: '${HEADER}'" >&2
      exit 1
    fi
  fi
  # didc converts the .did to Rust, with the following limitations:
  #   - It applies the canidid Deserialize trait to all the types but not other traits that we need.
  #   - It makes almost all the types and fields private, which is not very helpful.
  #
  # sed:
  #   - Comments out the header provided by didc; we provide our own and the two conflict.
  #   - Adds additional traits after "Deserialize".
  #   - Makes API call response types "CallResult".  The alternative convention is to have:
  #       use ic_cdk::api::call::CallResult as Result;
  #     at the top of the rust file but that is both confusing for Rust developers and conflicts
  #     with custom definitions of Result found in some did files.
  #   - didc creates invalid Rust enum entries of the form: `StopDissolving{},`
  #     These are changed to legal Rust: `StopDissolving(EmptyRecord),`
  #     where "EmptyRecord" is defined as the name suggests.
  #   - Deprecated: Uses `candid::Principal` instead of `Principal`.
  #   - Change creating callback types with `candid::define_function!` to `pub type ... = candid::Func;`
  #
  # Final tweaks are defined manually and encoded as patch files.  The changes typically include:
  #   - Replacing the anonymous result{} type in enums with EmptyRecord.  didc produces valid rust code, but
  #     in a form that the Candid macro cannot handle.  Using a named type works around the limit of the macro.
  #   - We need a few but not all of the types to have the Default macro
  #   - Any corrections to the output of the sed script.  sed is not a Rust parser; the sed output
  #     is not guaranteed to be correct.
  # shellcheck disable=SC2016
  didc bind "${DID_PATH}" --target rs |
    rustfmt --edition 2021 |
    "$sed" -E '
            # Comment out the header "use", "//!" and "#!" lines.
	    s@^(use |//!|#!)@// &@;

	    # Add traits
            s/#\[derive\(/&'"${TRAITS:-}${TRAITS:+, }"'/;

	    # In the service, return CallResult instead of Result.
	    /impl Service/,${s/-> Result/-> CallResult/g};

	    # Replace invalid "{}" in generated Rust code with "EmptyRecord":
	    /^pub (struct|enum) /,/^}/{s/ *\{\},$/(EmptyRecord),/g};
	    ' |
    "$sed" -z 's/candid::define_function!(pub \([^ ]*\) [^;]*;\n#\[derive([^)]*)\]/pub type \1 = candid::Func;\n#[derive(CandidType, Deserialize)]/g' |
    rustfmt --edition 2021
} >"${RUST_PATH}"
if test -f "${EDIT_PATH}"; then
  (
    "${EDIT_PATH}"
  )
fi
if test -f "${PATCH_PATH}"; then
  (
    patch -p1 <"${PATCH_PATH}"
  )
fi
