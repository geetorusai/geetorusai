# Geetorus Daytona runner image

This image is the Geetorus Cloud fleet sandbox image plus a source-built
`geetorus-runnerd` and immutable provider pack. The pack contains Node 24.11,
OpenCode 1.18.29, the compiled OpenCode proxy, ACPX 0.13.1 sidecar, qualified ACP
agents, and the production lockfile. Its manifest digests each executable bridge
and binds the pack to the runner source revision, avoiding artifact upload and
npm installation on every fresh lease.

The fleet pins are intentionally copied from
[`geetorus-cloud/fleet-sandbox-image/Dockerfile`](https://github.com/geetorusai/geetorus-cloud/blob/master/fleet-sandbox-image/Dockerfile).
Update both definitions together until the fleet base is published as a stable
image that this Dockerfile can extend directly.

## Build and verify

The fleet image is currently amd64-only because the pinned Cursor and GitHub CLI
checksums cover amd64.

```bash
content_id="$(pnpm --silent test:e2e:runner:image-id)"
docker buildx build \
  --platform linux/amd64 \
  --build-arg GEETORUS_RUNNER_CONTENT_ID="${content_id}" \
  --build-arg GEETORUS_RUNNER_SOURCE_REVISION="$(git rev-parse HEAD)" \
  --tag "geetorus-daytona-runner:e2e-content-${content_id}" \
  --load \
  --file docker/daytona-runner/Dockerfile \
  .

docker run --rm --platform linux/amd64 \
  --entrypoint geetorus-runnerd \
  "geetorus-daytona-runner:e2e-content-${content_id}" \
  --build-metadata
```

The metadata must advertise `dial_ws_loopback`, `dial_wss`, and `listen_ws`.
The explicit entrypoint is needed only for this local probe because Daytona's
base image uses its own long-running sandbox entrypoint.

`test:e2e:runner:image-id` hashes the audited Docker build dependency closure,
target platform, the immutable Dockerfile syntax-frontend digest, and every
immutable `FROM` reference. It fails before the paid workflow can build when
the frontend or a base is not pinned to a sha256 digest. When updating the
syntax version, resolve and review its registry digest and update both values in
the first Dockerfile line. Git commits that do not change those inputs reuse the
same content tag.

`GEETORUS_RUNNER_SOURCE_REVISION` remains the full Git SHA that built the first
published copy and is retained as provenance rather than cache identity.

## Use in Geetorus

Publish the image to a registry Daytona can pull, or use the environment
editor's **Configure image** flow to produce a Daytona snapshot. Set the
environment image to that immutable tag or snapshot. Geetorus probes the
sandbox user's `PATH` for `geetorus-runnerd` and `codex` and checks
`/opt/geetorus-runner/provider-pack` for OpenCode and ACPX. It uses the pack
only when its complete manifest matches the controller's build-owned pack;
otherwise it stages the pack configured by
`GEETORUS_RUNNER_REMOTE_PROVIDER_PACK_PATH`. Remote OpenCode and ACPX never
fall back to host-local processes.

Do not promote `geetorus-runner-e2e-20260826-v2` for OpenCode or ACPX. Build a
new immutable image or snapshot from a clean committed revision and pass that
full Git SHA as `GEETORUS_RUNNER_SOURCE_REVISION`.

Do not bake provider credentials, Geetorus bootstrap tickets, or Daytona
preview tokens into this image. They remain per-run secret material.

Provider CLI updates are manifest-only changes: repository CI owns the root
lockfile. The image build resolves the complete workspace manifest graph before
its frozen install, matching CI when a source commit precedes the lockfile bot.
The complete resolved lockfile must match `GEETORUS_RUNNER_LOCK_SHA256` before
package installation or lifecycle execution. Review and refresh that digest
with source dependency changes; registry-time resolution drift fails closed.
Keep one latest stable CLI installation per provider; refresh exact runtime
versions and qualification digests together, never install a private older copy
or download dependencies when a task starts.
