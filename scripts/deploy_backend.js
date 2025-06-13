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

// Build the backend package
run('npm run build --workspace packages/backend');

const distDir = path.join(__dirname, '../packages/backend/dist');
const zipPath = path.join(__dirname, '../packages/backend/backend.zip');

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

// Package the compiled Lambda code
run(`cd ${distDir} && zip -r ${zipPath} .`);

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
