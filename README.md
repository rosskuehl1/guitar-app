# GuitarApp

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

✨ Your new, shiny [Nx workspace](https://nx.dev) is almost ready ✨.

[Learn more about this workspace setup and its capabilities](https://nx.dev/nx-api/react-native?utm_source=nx_project&amp;utm_medium=readme&amp;utm_campaign=nx_projects) or run `npx nx graph` to visually explore what was created. Now, let's get you up to speed!

## Finish your CI setup

[Click here to finish setting up your workspace!](https://cloud.nx.app/connect/EVGX4y0F1k)


## Run tasks

To run the dev server for your app, use:

```sh
npx nx serve guitar-app
```

To create a production bundle:

```sh
npx nx build guitar-app
```

To see all available targets to run for a project, run:

```sh
npx nx show project guitar-app
```

These targets are either [inferred automatically](https://nx.dev/concepts/inferred-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or defined in the `project.json` or `package.json` files.

[More about running tasks in the docs &raquo;](https://nx.dev/features/run-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Add new projects

While you could add new projects to your workspace manually, you might want to leverage [Nx plugins](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) and their [code generation](https://nx.dev/features/generate-code?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) feature.

Use the plugin's generator to create new projects.

To generate a new application, use:

```sh
npx nx g @nx/react-native:app demo
```

# GuitarApp

GuitarApp is a cross-platform guitar companion built with React Native and rendered on the web via Vite. The GitHub Pages deployment serves the compiled web bundle so the app lives at [`https://rosskuehl1.github.io/guitar-app/`](https://rosskuehl1.github.io/guitar-app/).

## 🚀 Live Demo

- 👉 [Launch the Guitar App](https://rosskuehl1.github.io/guitar-app/)

## 🧑‍💻 Local Development

```sh
npm install
npx nx serve guitar-app
```

The dev server runs the Vite-powered React Native Web build. Use `npx nx build guitar-app --configuration=production` whenever you need a production bundle.

## 📦 Deployment

```sh
npm run deploy
```

`npm run deploy` compiles the production bundle and publishes `dist/apps/guitar-app/web` to the `gh-pages` branch under the `guitar-app/` directory. GitHub Pages then serves the site from `/guitar-app/` on the public site.

### Customizing the Base Path

The Vite config defaults to `base: '/guitar-app/'`. Override it by setting `VITE_BASE_PATH` (or `BASE_PATH`) before running the build or deploy target when hosting under a different path.
And join the Nx community:
