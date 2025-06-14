const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

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

// Build the backend package
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

  // Include production dependencies
  const backendPkg = require('../packages/backend/package.json');
  const deps = Object.keys(backendPkg.dependencies || {}).filter(
    (d) => d !== 'aws-sdk'
  );
  for (const dep of deps) {
    const src = path.join(__dirname, '../node_modules', dep);
    const dest = path.join(buildDir, 'node_modules', dep);
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.cpSync(src, dest, { recursive: true });
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
