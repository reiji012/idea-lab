---
description: Create a new app idea project
---

# Create New Idea Workflow

This workflow guides the creation of a new app idea in the `ideas/` directory.

1.  **Ask for Details**:
    - Ask the user for the **name of the idea** (short, English, kebab-case preferred).
    - Ask for a **brief description** of the idea.
    - Ask for the **technology preference** (e.g., Simple HTML/JS, Next.js, etc.).

2.  **Create Directory**:
    - Create a new directory: `ideas/<idea-name>`.

3.  **Initialize Project**:
    - If the user chose **Simple HTML/JS**:
        - Create `index.html`, `style.css`, and `script.js` in `ideas/<idea-name>/`.
        - Add basic boilerplate code.
    - If the user chose a **Framework** (e.g., Next.js, Vite):
        - Run the appropriate initialization command inside `ideas/`.
        - *Note: Ensure you are in the correct directory.*

4.  **Create Documentation**:
    - Create `ideas/<idea-name>/README.md`.
    - Content should include:
        - `# <Idea Name>`
        - Description.
        - How to run the project.

5.  **Notify User**:
    - Inform the user that the idea project has been set up and is ready for development.
