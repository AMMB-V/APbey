import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npmExecPath = process.env.npm_execpath;
const commands = [
  ['run', 'check:migrations'],
  ['run', 'check:secrets'],
  ['run', 'lint'],
  ['run', 'test'],
  ['run', 'build'],
];

for (const args of commands) {
  await new Promise((resolve, reject) => {
    const child = spawn(npmExecPath ? process.execPath : npm, npmExecPath ? [npmExecPath, ...args] : args, {
      stdio: 'inherit',
      shell: !npmExecPath && process.platform === 'win32',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${npm} ${args.join(' ')} failed with exit code ${code}`));
    });
  });
}

console.log('Release verification passed.');
