// PM2 (without Docker): npm ci && npm run prisma:push && npm run build && pm2 start deploy/ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'klinika-kassa',
    script: '.output/server/index.mjs',
    node_args: '--env-file=.env',
    env: { NODE_ENV: 'production', PORT: 3000 }
  }]
}
