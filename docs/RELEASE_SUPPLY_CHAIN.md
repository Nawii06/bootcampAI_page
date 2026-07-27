# Release integrity, SBOM, and approval

Last reviewed: 2026-07-27

## Release manifest

After production builds complete, generate and immediately verify the integrity
manifest:

```powershell
pnpm release:manifest
pnpm release:manifest:verify
```

`.release/release-manifest.json` records the full Git commit, dirty-source flag,
Node version, generation time, and SHA-256/size of API and portal artifacts,
Docker deployment files, every migration file, and the pnpm lockfile. CI retains
the manifest for 30 days. A production approval must use a manifest generated
from `sourceDirty=false`.

Regenerate the manifest whenever any build, migration, deployment, or lockfile
input changes. Verification must occur again immediately before packaging or
deployment.

## SBOM and container scanning

The Linux CI job loads both runtime images, produces SPDX JSON SBOMs with Syft,
and retains them for 30 days. It then scans each image with Trivy and fails for
fixed HIGH or CRITICAL vulnerabilities.

The SBOM and scanner actions use full immutable commit references rather than
mutable tags. Updates require review of the upstream signed release, full
commit, changelog, and security advisories.

For an accepted exception, record the CVE, affected component, exploitability,
compensating control, owner, expiry, and approver in the institutional risk
system. Do not add a blanket ignore or lower the CI severity threshold.

## Deployment approval record

Copy `deploy/release-approval.template.json` outside the repository, complete it
with the final manifest, image digests, SBOM hashes, migration target, verified
backup hash, rollback images/strategy, and change reference, then validate:

```powershell
pnpm release:approval:validate "release-approval.json"
```

Requester, technical reviewer, and change approver must be three different
institutional actor IDs. The record contains no passwords, tokens, connection
URLs, personal data, or exported application data.

Store the completed record in the approved change-management system with:

- release manifest and its SHA-256;
- both SPDX SBOM files and their SHA-256 values;
- immutable API and portal image digests;
- Trivy results or workflow run link;
- backup metadata and restore-verification reference;
- migration review and applied migration target;
- smoke-test results, monitoring confirmation, rollback decision, and operators.

## Release gate

A production deployment may begin only when:

1. CI, dependency review, secret scan, SBOM generation, and image scans pass.
2. The manifest verifies and reports clean source.
3. The backup verifies and rollback targets remain pullable.
4. The completed approval record passes validation.
5. Required reviewers approve through the protected production environment.
6. The deployment window, incident contact, and rollback authority are active.
