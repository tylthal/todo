const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

function run(cmd) {
  console.log(cmd);
  execSync(cmd, { stdio: 'inherit', shell: true });
}

const functionName = process.env.LAMBDA_FUNCTION_NAME;
if (!functionName) {
  console.error('LAMBDA_FUNCTION_NAME environment variable must be set');
  process.exit(1);
}

// Build packages
run('npm run build --workspace packages/shared');
run('npm run build --workspace packages/backend');

const root = path.join(__dirname, '..');
const backendDist = path.join(root, 'packages/backend/dist');
const sharedDist = path.join(root, 'packages/shared/dist');
const sharedPkg = path.join(root, 'packages/shared/package.json');
const buildDir = path.join(root, 'packages/backend/lambda_build');
const zipPath = path.join(root, 'packages/backend/backend.zip');

if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true, force: true });
}
fs.mkdirSync(buildDir, { recursive: true });

// Copy compiled backend code
fs.cpSync(backendDist, buildDir, { recursive: true });

// Copy compiled shared library into node_modules
const sharedDest = path.join(buildDir, 'node_modules', '@sticky-notes', 'shared');
fs.mkdirSync(sharedDest, { recursive: true });
fs.cpSync(sharedDist, sharedDest, { recursive: true });
fs.copyFileSync(sharedPkg, path.join(sharedDest, 'package.json'));

// Gather production dependencies
const output = execSync('npm ls --omit=dev --workspace packages/backend --parseable')
  .toString()
  .trim()
  .split('\n');

for (const p of output) {
  if (!p.includes('node_modules')) continue;
  if (p.includes('node_modules/aws-sdk')) continue; // Provided by Lambda

  const rel = path.relative(root, p);
  const idx = rel.indexOf('node_modules' + path.sep);
  if (idx === -1) continue;
  const modulePath = rel.slice(idx + 'node_modules/'.length);
  const src = path.join(root, 'node_modules', modulePath);
  const dest = path.join(buildDir, 'node_modules', modulePath);
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
  }
}

// Create zip archive
function zipDirectory(srcDir, destZip) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(destZip);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    archive.on('error', reject);
    archive.directory(srcDir, false);
    archive.pipe(output);
    archive.finalize();
  });
}

(async () => {
  if (fs.existsSync(zipPath)) fs.rmSync(zipPath);
  await zipDirectory(buildDir, zipPath);
  fs.rmSync(buildDir, { recursive: true, force: true });
  run(`aws lambda update-function-code --function-name ${functionName} --zip-file fileb://${zipPath}`);
})();
