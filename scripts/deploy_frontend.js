const { execSync } = require('child_process');
const fs = require('fs');

function run(cmd, opts = {}) {
  console.log(cmd);
  execSync(cmd, { stdio: 'inherit', shell: true, ...opts });
}

const bucket = process.env.S3_BUCKET;
const distId = process.env.CLOUDFRONT_DISTRIBUTION_ID;

if (!bucket || !distId) {
  console.error('S3_BUCKET and CLOUDFRONT_DISTRIBUTION_ID environment variables must be set');
  process.exit(1);
}

const envPath = 'packages/frontend/.env';

// Copy existing deployment env if available
try {
  fs.copyFileSync('packages/frontend/.env.deploy', envPath);
  console.log('Copied packages/frontend/.env.deploy to packages/frontend/.env');
} catch {
  fs.writeFileSync(envPath, '');
  console.log('No .env.deploy found. Created packages/frontend/.env');
}

// Ensure VITE_API_URL=/api
let envContent = fs.readFileSync(envPath, 'utf8');
if (/^VITE_API_URL=/m.test(envContent)) {
  envContent = envContent.replace(/^VITE_API_URL=.*/m, 'VITE_API_URL=/api');
} else {
  if (envContent && !envContent.endsWith('\n')) envContent += '\n';
  envContent += 'VITE_API_URL=/api\n';
}
fs.writeFileSync(envPath, envContent);
console.log('Set VITE_API_URL=/api in packages/frontend/.env');

run('npm run build --workspace packages/frontend');
run(`aws s3 sync packages/frontend/dist s3://${bucket} --delete --no-verify-ssl`);
run(`aws cloudfront create-invalidation --distribution-id ${distId} --paths "/*"`);

console.log('Deployment complete');
