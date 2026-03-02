export function getGitignore() {
    return `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build
dist/
build/
*.tsbuildinfo

# Environment
.env.development
.env.production
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Test
coverage/

# Temporary
tmp/
temp/
`;
};

export function getDockerIgnore() {
    return `node_modules
npm-debug.log
.env
.env.*
.git
.gitignore
README.md
dist
build
coverage
.vscode
.idea
*.log
tmp
temp
`;
};