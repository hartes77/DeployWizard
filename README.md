# DeployWizard 🚀

A small **desktop GUI (Electron + React)** that provisions a GitHub repository
through **Terraform** — Infrastructure-as-Code, without touching the terminal.

You enter a project name and a GitHub token in the app; DeployWizard runs a
Terraform plan/apply behind the scenes and creates an initialized public repo
for you.

> A focused demo of wrapping an IaC workflow (Terraform) inside a cross‑platform
> desktop app. Not an enterprise product — a clean, self-contained portfolio
> piece.

## Screenshot

![DeployWizard — desktop UI](docs/screenshot.png)

<!-- Drop a PNG of the running app at docs/screenshot.png and it will show here. -->

## Stack

- **React 19** + **Vite 7** + **Tailwind CSS 4** — UI
- **Electron 39** — desktop shell (macOS / Windows / Linux)
- **Terraform** (`integrations/github` provider) — provisioning engine

## How it works

```
React UI  ──>  Electron main (IPC)  ──>  terraform plan / apply  ──>  GitHub repo
```

The Terraform definition lives in `terraform-workspace/main.tf`. The GitHub
token is passed at runtime as a `sensitive` Terraform variable
(`TF_VAR_github_token`) — it is **never** written to disk or committed.

## Roadmap — where this is heading (2.0)

Today DeployWizard creates a GitHub repo. Honestly, that alone is something
`gh repo create` already does in one command. The version worth *using* stops
duplicating the CLI and instead does what terminal tools make awkward:
**orchestrate a real, multi-resource environment from one place.**

The direction:

- **Visual plan in plain language** — not 200 lines of `terraform plan` HCL, but
  *"I'll create: 1 GitHub repo, 1 web service, 1 Postgres. Change: nothing.
  Destroy: nothing."*
- **Cost estimate up front** — *"this environment costs ~$0 (free tier) /
  ~$14/mo"* — shown **before** you apply.
- **One-click teardown** — an inventory of everything that's running and a single
  button to destroy it cleanly. No orphaned resources, no surprise bill.

Two things make it worth a desktop app rather than a SaaS:

1. **It never sees your secrets.** Tokens and keys stay on your machine; nothing
   is sent to a third-party backend (zero-egress by design).
2. **You can switch the environment off without fear.** The teardown is the
   feature, not an afterthought.

**MVP scope (deliberately narrow):** one blueprint — *Web App + Postgres* —
on **GitHub + Render**. No AWS until that flow is solid. The risk to manage is
over-scoping, not under-building.

### Engine proof-of-concept (validated)

The core — *"can a single Terraform file stand up a full environment and tear it
down clean?"* — has been validated end-to-end: one `main.tf` creates a GitHub
repo + a seeded Node app → a Render Postgres → a Render web service with
`DATABASE_URL` **wired automatically** from the database (no human copy-paste).
The live app confirmed `DATABASE_URL configured: yes`, and `terraform destroy`
removed everything. The GUI is just a layer over that file.

Field notes the real product must handle:

- Render's `owner_id` is the **workspace/team** (`tea-…`), not the user
  (`usr-…`); the API key lives in the workspace.
- Creating a GitHub repo needs the `repo` scope; **deleting** it needs the
  separate `delete_repo` scope — so a complete teardown must request it.

## Run in development

```bash
npm install
npm run dev          # Vite + Electron with hot reload
```

You'll need [Terraform](https://developer.hashicorp.com/terraform/install)
installed and on your `PATH`, plus a GitHub token with `repo` scope.

## Build a desktop app

```bash
npm run dist:mac     # or dist:win / dist:linux
```

Output goes to `release/`.

## Security notes

- The GitHub token is entered at runtime and handled as a Terraform `sensitive`
  variable. Do not hardcode it.
- `*.tfstate`, `*.tfvars` and `.terraform/` are git-ignored — Terraform state
  can capture secrets in plaintext and must never be pushed.

## License

[MIT](./LICENSE)
