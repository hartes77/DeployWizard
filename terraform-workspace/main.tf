terraform {
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 5.0"
    }
  }
}

variable "github_token" { 
  type = string
  sensitive = true
}
variable "project_name" { type = string }

provider "github" {
  token = var.github_token
}

resource "github_repository" "repo" {
  name        = var.project_name
  description = "Created via DeployWizard (Terraform)"
  visibility  = "public"
  auto_init   = true
}

resource "github_repository_file" "index" {
  repository          = github_repository.repo.name
  branch              = "main"
  file                = "index.html"
  content             = "<h1>Deployed via DeployWizard 🚀</h1><p>Managed by Terraform.</p>"
  commit_message      = "Init via DeployWizard"
  overwrite_on_create = true
}

output "repository_url" {
  value = github_repository.repo.html_url
}

output "repository_name" {
  value = github_repository.repo.name
}
