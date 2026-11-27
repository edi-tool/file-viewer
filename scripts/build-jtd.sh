#!/usr/bin/env bash
# Development-only build; network needed. Pin upstream tag and commit before distribution.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
temp="$(mktemp -d)"
trap 'rm -rf "$temp"' EXIT
git clone --depth 1 --branch v0.5.14 https://github.com/ezpzfile/ezpzfile-jtd.git "$temp/jtd"
test "$(git -C "$temp/jtd" rev-parse HEAD)" = "454c445a48ec9c3b5b2db4e9e44711d10ff45fcf"
cd "$temp/jtd/engine"
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.129 --locked
cargo build --locked --release --target wasm32-unknown-unknown -p ezpzjtd-wasm
mkdir -p "$root/vendor/jtd"
wasm-bindgen --target web --no-typescript --out-dir "$root/vendor/jtd" target/wasm32-unknown-unknown/release/ezpzjtd_wasm.wasm
cp "$temp/jtd/LICENSE" "$root/vendor/jtd/LICENSE"
git -C "$temp/jtd" rev-parse HEAD > "$root/vendor/jtd/SOURCE_COMMIT"
(cd "$root/vendor/jtd" && sha256sum ezpzjtd_wasm.js ezpzjtd_wasm_bg.wasm > SHA256SUMS)
