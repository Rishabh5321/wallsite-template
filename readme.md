<div align="center">
  <h1>Wallpaper Gallery</h1>
  <p>A curated collection of stunning wallpapers, fully automated and ready for deployment.</p>
</div>

## ✨ Live Demo

You can view the live wallpaper gallery hosted from this repository here: **[Live Gallery](https://wallsite.vercel.app/)**

---

## 🏗️ Architecture

The following diagram illustrates the project's architecture and the relationship between the development repository (`wallsite`) and the user-facing template (`wallsite-template`).

%% ------------- THEME & LAYOUT -------------
%% Title & styling
%% -------------------------------
graph TD
    classDef repo    fill:#1f2937,stroke:#4b5563,color:#ffffff
    classDef user    fill:#065f46,stroke:#047857,color:#ffffff
    classDef action  fill:#7c2d12,stroke:#9a3412,color:#ffffff
    classDef output  fill:#4338ca,stroke:#3730a3,color:#ffffff
    classDef sync    fill:#0f766e,stroke:#0d9488,color:#ffffff

    %% ------------- DEVELOPMENT REPO -------------
    subgraph "wallsite (main repo)"
        direction LR
        A[Developer wallpapers<br>/src]:::repo
        B[pnpm run build]:::action
        C[Gallery assets<br>optimized]:::output
        D[Live demo<br>wallsite.vercel.app]:::output
        E[GitHub Actions]:::action
        F["Docker image<br>ghcr.io/rishabh5321/wallsite:latest"]:::output
        G[Sync commits to<br>template repo]:::sync

        A --> B --> C
        C --> D
        B --> E
        E --> F
        E --> G
    end

    %% ------------- USER TEMPLATE -------------
    subgraph "wallsite-template (generated copy)"
        direction TB
        H[Empty /src folder]:::user
        I[User forks / uses template]:::user
        J[User adds own wallpapers]:::user
        K[Deploy to<br>Vercel, Netlify<br>or Docker]:::user
        H --> I --> J --> K
    end

    %% ------------- SYNC ARROW -------------
    G -.->|push| H
---

## 🚀 Create Your Own Gallery

Ready to build your own gallery? Click the button below to generate a new repository from the template. You'll get a clean copy of the project with an empty `src` folder, ready for your wallpapers and deployment.

<div align="center" style="margin-top: 20px; margin-bottom: 20px;">
  <a href="https://github.com/Rishabh5321/wallsite-template/generate" style="text-decoration: none;">
    <img src="https://img.shields.io/badge/Use%20this%20template-brightgreen?style=for-the-badge&logo=github" alt="Use this template"/>
  </a>
</div>

After you create your repository, follow the simple deployment instructions in your new repository's `README.md` file.

---

## 🔧 Deployment Options

### Vercel & Netlify (Recommended)

For a quick and easy deployment, use Vercel or Netlify. Both platforms offer a seamless Git-based workflow.

1.  **Generate from Template**: Create your own repository using the template.
2.  **Add Wallpapers**: Clone your new repository and add your wallpapers to the `src` directory.
3.  **Import to Vercel/Netlify**: Import your repository into Vercel or Netlify. The project is pre-configured for automatic builds and deployments.

### Self-hosting with Docker

For users who want to host the gallery on their own server, a pre-built Docker image is available.

<div align="center">
    <a href="docker-compose.yml" title="View docker-compose.yml"><img src="https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/></a>
</div>

1.  **Pull the Docker Image:**

    ```bash
    docker pull ghcr.io/rishabh5321/wallsite:latest
    ```

2.  **Run the Container:**
    Run the Docker container, making sure to mount your local `src` directory (filled with your wallpapers) into the container at `/app/src`.
    ```bash
    docker run -d -p 8000:8000 \
      -v /path/to/your/wallpapers/src:/app/src \
      --name my-wallsite \
      ghcr.io/rishabh5321/wallsite:latest
    ```
    Your gallery will be running at `http://localhost:8000`.

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines to ensure a smooth development process.

### Coding Style

- **JavaScript**: We use ESLint with the `airbnb-base` configuration and Prettier for code formatting.
- **Shell Scripts**: Scripts should be POSIX-compliant and pass `shellcheck`.
- **General**: Follow the existing code style and conventions.

## License

The code in this repository is licensed under the MIT License. See the [LICENSE](LICENSE) file for details. Wallpapers are not covered by this license.
