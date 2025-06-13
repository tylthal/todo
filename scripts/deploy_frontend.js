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

// Copy .env.deploy to .env in a cross-platform way
fs.copyFileSync('packages/frontend/.env.deploy', 'packages/frontend/.env');
console.log('Copied packages/frontend/.env.deploy to packages/frontend/.env');

run('npm run build --workspace packages/frontend');
run(`aws s3 sync packages/frontend/dist s3://${bucket} --delete --no-verify-ssl`);
run(`aws cloudfront create-invalidation --distribution-id ${distId} --paths "/*"`);

console.log('Deployment complete');
