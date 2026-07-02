---
name: installLanguagePackages arg shape and rust module install
description: Correct tool call shapes for language module/package installs, and how a wrong call can pollute the workspace root
---

- `installLanguagePackages` requires flat `{language, packages}` — not `{dependencies: [...]}` or a `workingDirectory` override for scoping to a package. It always operates from a package-manager-appropriate context; for a Rust "package" like `rust-stable`, calling `installLanguagePackages({language:"rust", packages:["rust-stable"]})` is wrong — it treats `rust-stable` as a *crate* and runs `cargo init .` + `cargo add rust-stable` in the invocation directory, which fails (no such crate) but leaves behind a stray `Cargo.toml`, `Cargo.lock`, and `src/main.rs` at the root, plus a `/target` entry appended to root `.gitignore`.
- To install a Rust (or other language) *toolchain module*, use `installProgrammingLanguage({language: "rust-stable"})` instead — this is the module installer, distinct from the package installer.
- If the wrong call already happened, clean up: remove the stray root `Cargo.toml`/`Cargo.lock`/`src/`, and strip the erroneous `# Added by cargo` / `/target` block from `.gitignore` (leave `.replit`'s `modules` list alone if it also picked up a redundant `"rust"` entry — `.replit` can't be hand-edited directly, and a harmless duplicate module id doesn't break anything).
