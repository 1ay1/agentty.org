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
        agentty builds with CMake and a C++26 toolchain. The release binaries are built
        locally with one script — no CI in the loop.
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
        archives are installed. libc stays dynamic on Linux/macOS (fully-static glibc breaks{" "}
        <code>getaddrinfo</code> and the NSS resolver). For a 100% static binary, pass{" "}
        <code>-DAGENTTY_FULLY_STATIC=ON</code> with a musl toolchain.
      </p>
      <p>
        Accurate one-liner: <strong>statically linked except libc and (usually) OpenSSL.</strong>{" "}
        The latest release ships pre-built <code>agentty-linux-x86_64</code> and{" "}
        <code>agentty-linux-aarch64</code> with zero shared-library dependencies (Alpine +
        musl + GCC 14.2).
      </p>

      <h2 id="release">Cutting a release (maintainers)</h2>
      <Code>{`scripts/bump.sh 0.2.0        # bump CMakeLists, build everything, tag, upload via gh

# or step-by-step
scripts/release.sh                  # build every artifact into dist/, no upload
scripts/release.sh --tag v0.2.0     # build + tag + upload via gh`}</Code>
      <p>
        Single source of truth: <code>CMakeLists.txt</code>&apos;s{" "}
        <code>project(agentty VERSION …)</code> line. <code>bump.sh</code> rewrites it,
        commits, builds deb/rpm/pkg.tar.zst/tarball/binaries/Homebrew/Scoop/AUR manifests,
        tags, pushes, and creates the GitHub release with every artifact attached.
      </p>

      <DocNav current="/docs/building" />
      <EditThisPage path="app/docs/building/page.tsx" />
    </>
  );
}
