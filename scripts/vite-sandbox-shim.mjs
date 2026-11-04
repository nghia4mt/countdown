/**
 * Dev-environment shim for the DSH Windows file sandbox.
 *
 * The sandbox forbids child processes that capture output through a pipe, so
 * Vite's `optimizeSafeRealPathSync()` — which runs `exec('net use')` to map
 * network drive letters on Windows — dies with `spawn EPERM` before the config
 * even loads. Our workspace is on a local drive, so that mapping is irrelevant.
 *
 * Vite already supports falling back to `fs.realpathSync` when native realpath
 * reports `EISDIR`. This shim forces exactly that supported fallback for the
 * probe call and neutralises the `net use` pipespawn. Nothing else is touched.
 *
 * Usage (only needed while the DSH sandbox is active):
 *   NODE_OPTIONS="--import ./scripts/vite-sandbox-shim.mjs" npm run build
 */
import fs from 'node:fs';
import childProcess from 'node:child_process';

if (process.platform === 'win32' && !globalThis.__viteSandboxShim) {
  globalThis.__viteSandboxShim = true;

  const nativeRealpath = fs.realpathSync.native;
  fs.realpathSync.native = function realpathSyncNative(path, ...rest) {
    const caller = new Error().stack || '';
    if (caller.includes('optimizeSafeRealPathSync')) {
      // Mirrors the error Vite probes for; makes it pick its supported fallback.
      const error = new Error(
        `EISDIR: illegal operation on a directory, realpath '${String(path)}'`,
      );
      error.code = 'EISDIR';
      throw error;
    }
    return nativeRealpath.call(fs.realpathSync, path, ...rest);
  };

  const originalExec = childProcess.exec;
  childProcess.exec = function exec(command, ...args) {
    if (typeof command === 'string' && command.trim() === 'net use') {
      const callback = args.find((arg) => typeof arg === 'function');
      const fakeChild = {
        on() {
          return fakeChild;
        },
        kill() {
          return fakeChild;
        },
        unref() {
          return fakeChild;
        },
        stdout: null,
        stderr: null,
        pid: -1,
      };
      queueMicrotask(() => callback?.(null, '', ''));
      return fakeChild;
    }
    return originalExec.apply(this, [command, ...args]);
  };
}
