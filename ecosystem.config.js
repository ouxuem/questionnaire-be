module.exports = {
  apps: [{
    name: "nestjs-app",
    script: "main.js",
    instances: "max",
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
  }]
}
