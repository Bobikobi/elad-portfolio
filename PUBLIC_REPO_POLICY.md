# Public Repository Policy (Safe Showcase)

This repository is public for portfolio and technical evaluation.

## What can be public
- Frontend code, architecture patterns, and reusable components.
- Test examples, CI workflows, and documentation.
- Sanitized sample configuration (`.env.example`).

## What must stay private
- Real API keys, tokens, service account files, private certificates.
- Production environment files (`.env*` with real values).
- Internal infrastructure runbooks and sensitive deployment details.
- Customer data, logs with personal information, private business logic.

## Rules before publishing any project
1. Run `pnpm repo:guard`.
2. Ensure no real secrets are committed.
3. Replace proprietary values with placeholders.
4. Keep production credentials only in host environment settings.
5. Keep this policy identical across all public project repositories.

## Recommended public/private split
- **Private production repo**: full system, infra, operational details.
- **Public showcase repo**: sanitized modules proving code quality and engineering depth.

## License note
If you do not want code reuse, add a restrictive license statement in each repository.
