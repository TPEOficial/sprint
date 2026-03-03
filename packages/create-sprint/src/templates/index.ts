// Package JSON
export { generateJWTKeys, getTypeScriptPackageJson, getJavaScriptPackageJson } from "./packageJson.js";

// Config Files (tsconfig, vite.config, sprint.config)
export { getTsConfig, getViteConfig, getSprintConfigFile } from "./configFiles.js";

// Environment Files
export { getEnvExample, getEnvDevelopment, getEnvProduction } from "./env.js";

// Routes
export { getMainFile, getHomeRoute, getAdminRoute } from "./routes.js";

// Controllers
export { getHomeController, getAdminController } from "./controllers.js";

// Middlewares
export { getInternalAuthMiddleware, getUserAuthMiddleware } from "./middlewares.js";

// Schemas
export { getHomeSchema, getAdminSchema } from "./schemas.js";

// Cronjobs
export { getExampleCronJob } from "./cronjobs.js";

// Docker
export { getDockerfile, getDockerCompose } from "./docker.js";

// GraphQL
export { getGraphQLFiles } from "./graphql.js";

// Misc
export { getGitignore, getDockerIgnore } from "./misc.js";