const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd, opts = {}) {
  console.log(cmd);
  execSync(cmd, { stdio: 'inherit', shell: true, ...opts });
}

// Determine Lambda function name from env
const functionName = process.env.LAMBDA_FUNCTION_NAME;

if (!functionName) {
  console.error('LAMBDA_FUNCTION_NAME environment variable must be set');
  process.exit(1);
}

// Ensure root dependencies are installed
const rootNodeModules = path.join(__dirname, '..', 'node_modules');
if (!fs.existsSync(rootNodeModules)) {
  console.error(
    'Top-level node_modules folder not found. Run "npm install" before deploying.'
  );
  process.exit(1);
}

const archiver = require('archiver');

// Build the shared and backend packages
run('npm run build --workspace packages/shared');
run('npm run build --workspace packages/backend');

const distDir = path.join(__dirname, '../packages/backend/dist');
const buildDir = path.join(__dirname, '../packages/backend/lambda_build');
const zipPath = path.join(__dirname, '../packages/backend/backend.zip');

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

// Package the compiled Lambda code without relying on the zip CLI
function createZip(sourceDir, outPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    archive.on('error', reject);

    archive.directory(sourceDir, false);
    archive.pipe(output);
    archive.finalize();
  });
}

async function main() {
  // Prepare Lambda bundle directory
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true, force: true });
  }
  fs.mkdirSync(buildDir, { recursive: true });

  // Copy compiled JS files (strip top-level dist path)
  const compiledDir = path.join(distDir, 'backend', 'src');
  fs.cpSync(compiledDir, buildDir, { recursive: true });

  // Copy compiled shared workspace so imports resolve at runtime
  const sharedSrc = path.join(__dirname, '../packages/shared/dist');
  const sharedDest = path.join(
    buildDir,
    'node_modules',
    '@sticky-notes',
    'shared'
  );
  fs.mkdirSync(sharedDest, { recursive: true });
  fs.cpSync(sharedSrc, sharedDest, { recursive: true });
  fs.copyFileSync(
    path.join(__dirname, '../packages/shared/package.json'),
    path.join(sharedDest, 'package.json')
  );

  // Include production dependencies. npm workspaces hoist packages so only the
  // top-level node_modules folder contains the full dependency tree. The
  // previous approach copied only direct dependencies which omitted nested
  // packages like aws-xray-sdk-core. Use `npm ls` to obtain the complete list
  // of production dependencies for the backend workspace and copy each one.

  const lsOutput = execSync(
    'npm ls --omit=dev --parseable --all --workspace packages/backend'
  )
    .toString()
    .trim()
    .split('\n');

  for (const p of lsOutput) {
    if (!p.includes('node_modules')) continue;
    if (p.includes('node_modules/aws-sdk')) continue; // provided by runtime

    const rel = path.relative(path.join(__dirname, '..'), p);
    const idx = rel.indexOf('node_modules/');
    if (idx === -1) continue;

    const moduleSubPath = rel.slice(idx + 'node_modules/'.length);
    const dest = path.join(buildDir, 'node_modules', moduleSubPath);
    if (fs.existsSync(p)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.cpSync(p, dest, { recursive: true });
    }
  }

  await createZip(buildDir, zipPath);

  // Remove temporary directory
  fs.rmSync(buildDir, { recursive: true, force: true });

  // Deploy the zip to AWS
  run(`aws lambda update-function-code --function-name ${functionName} --zip-file fileb://${zipPath}`);

  // Print API endpoint from Terraform outputs
  try {
    const apiUrl = execSync('terraform -chdir=infra output -raw api_invoke_url').toString().trim();
    console.log(`API URL: ${apiUrl}`);
  } catch (err) {
    console.warn('Unable to read api_invoke_url from Terraform:', err.message);
  }

  console.log('Backend deployment complete');
}

main().catch((err) => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
