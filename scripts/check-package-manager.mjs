/**
 * This repo is a pnpm workspace: packages/raycast depends on @propose/core via
 * the `workspace:*` protocol, which npm and yarn cannot resolve here.
 *
 * Running `npm install` used to silently succeed while installing nothing,
 * leaving the Raycast extension unbuilt and Raycast reporting
 * "Missing executable. You might need to build the extension."
 * Fail loudly instead.
 */
const agent = process.env.npm_config_user_agent ?? "";

if (!agent.startsWith("pnpm")) {
  console.error(`
  This repo uses pnpm, not ${agent.split("/")[0] || "this package manager"}.

    corepack enable
    pnpm install
`);
  process.exit(1);
}
