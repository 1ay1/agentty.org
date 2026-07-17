import type { Metadata } from "next";
import { DocNav } from "@/components/DocNav";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";
import { Code, Note } from "@/components/Doc";

export const metadata: Metadata = {
  title: "Building from Source",
  description: "Compile agentty with CMake, including the standalone static build.",
  alternates: { canonical: "/docs/building" },
};

export default function Building() {
  return (
    <>
      <Breadcrumb title="Building from Source" />
      <h1>Building from Source</h1>
      <p className="lead">
        agentty builds with CMake and a C++26 toolchain. Cutting a release is a single
        command that tags and pushes; GitHub Actions builds every binary and OS package.
      </p>

      <h2 id="requirements">Requirements</h2>
      <ul>
        <li>GCC 14+ / Clang 18+ / MSVC 14.40+ (<code>/std:c++latest</code>)</li>
        <li>CMake 3.28+</li>
        <li>OpenSSL and nghttp2 (FetchContent pulls maya automatically)</li>
      </ul>
      <Note type="warn">
        AppleClang tops out at C++23 — building the tests (<code>AGENTTY_BUILD_TESTS</code>)
        requires <code>g++</code> or stock LLVM <code>clang++</code> on macOS, not
        Xcode&apos;s bundled toolchain.
      </Note>

      <h2 id="basic">Basic build</h2>
      <Code>{`git clone --recursive git@github.com:1ay1/agentty.git
cd agentty
cmake -B build
cmake --build build -j
./build/agentty`}</Code>

      <h2 id="standalone">Standalone (static) build</h2>
      <Code>{`cmake -B build -DAGENTTY_STANDALONE=ON`}</Code>
      <p>
        Statically links OpenSSL + nghttp2 + libstdc++ + libgcc when their <code>.a</code>{" "}
        archives are installed, while libc stays dynamic. For a 100% static binary that runs
        on any Linux userland, pass <code>-DAGENTTY_FULLY_STATIC=ON</code>.
      </p>
      <p>
        The prebuilt Linux release binaries are <strong>true standalone executables</strong>:
        linked <code>-static -no-pie</code> into a classic <code>ET_EXEC</code> with no{" "}
        <code>NEEDED</code> entry and no <code>PT_INTERP</code>, so one file runs on glibc
        (Debian/Ubuntu/Fedora), musl (Alpine), and 64-bit Raspberry Pi OS alike. A build-time
        ELF-shape assertion (<code>cmake/assert_static_pie.cmake</code>) hard-fails the compile
        if the artifact ever regains a dynamic dependency. Termux/Android needs a PIE — build
        that with the opt-in <code>-DAGENTTY_STATIC_PIE=ON</code> on a musl toolchain.
      </p>

      <h2 id="release">Cutting a release (maintainers)</h2>
      <Code>{`scripts/cut-release.sh X.Y.Z       # POSIX / macOS / Linux / Git-Bash
scripts\\cut-release.cmd X.Y.Z       # Windows cmd.exe

scripts/cut-release.sh X.Y.Z --dry-run   # preview the exact diff, write nothing`}</Code>
      <p>
        Single source of truth: <code>CMakeLists.txt</code>&apos;s{" "}
        <code>project(agentty VERSION …)</code> line. <code>cut-release.sh</code> bumps it,
        promotes <code>CHANGELOG.md</code>&apos;s <code>[Unreleased]</code> section to a dated{" "}
        <code>[X.Y.Z]</code>, commits <code>release: vX.Y.Z</code>, tags <code>vX.Y.Z</code>,
        and pushes. The tag push fires GitHub Actions, which builds every binary + OS package
        (Linux x86_64/aarch64 on native runners, macOS Intel/ARM, Windows exe/msi) and
        auto-submits to winget, Homebrew, Scoop, and the AUR — nix/snap/gentoo manifests are
        attached to the release. Guards refuse a downgrade, duplicate version, dirty tree, or
        existing tag.
      </p>

      <DocNav current="/docs/building" />
      <EditThisPage path="app/docs/building/page.tsx" />
    </>
  );
}
