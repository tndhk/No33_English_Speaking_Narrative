# Helper Workflow: Husky & lint-staged Setup

## Goal

Automate code quality checks (linting and formatting) before plain git commits to ensure codebase consistency.

## Implementation Steps

1.  **Install Dependencies**
    - Install `husky` and `lint-staged` as dev dependencies.
    - Command: `npm install --save-dev husky lint-staged`

2.  **Initialize Husky**
    - Run `husky init` to set up `.husky` directory and add `prepare` script to `package.json`.
    - Command: `npx husky init`

3.  **Configure `lint-staged` in `package.json`**
    - Add configuration to run `eslint --fix` and `prettier --write` on staged files.
    - Target: `package.json`

4.  **Set up `pre-commit` hook**
    - Modify `.husky/pre-commit` to execute `npx lint-staged`.

5.  **Verify Configuration**
    - Check `package.json` and `.husky/pre-commit` content.
