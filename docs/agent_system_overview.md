# Agent System Overview

## FAQ for Contributors

### Do GitHub Actions agents need special repository permissions or setup?
Usually no. Workflows run with the built-in `GITHUB_TOKEN` and repository-level Actions settings.  
If a workflow must write files/commits, ensure workflow permissions allow `contents: write`.  
If it calls external APIs or other repos, add required secrets/tokens explicitly.

- Docs: [Automatic token authentication](https://docs.github.com/en/actions/security-guides/automatic-token-authentication)  
- Docs: [Managing encrypted secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)  
- Docs: [Actions permissions in a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)

### When do agent pipelines stop running?
Each workflow run stops when all jobs finish, or when a job/step fails and no continuation rule is set (`if:`, `continue-on-error`, dependent jobs).  
Private repositories still run Actions normally, but only users with repo access can view logs/artifacts (subject to settings and plan limits).

- Docs: [Workflow syntax for GitHub Actions](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)  
- Docs: [Events that trigger workflows](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows)

### Do agents run 24/7?
No. GitHub Actions agents are event-driven, not always-on daemons.  
They run only when triggered (`push`, `pull_request`, `workflow_dispatch`, `schedule`, `workflow_run`, etc.) and shut down automatically after the run completes.

- Docs: [Understanding GitHub Actions](https://docs.github.com/en/actions/get-started/understand-github-actions)  
- Docs: [GitHub-hosted runners](https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners)
