First, install a recent version of [Node.js](https://nodejs.org/).

We use Yarn as the package manager. For Node.js >= 16.10, enable Yarn by running:

```sh
corepack enable
corepack prepare yarn@stable --activate
```

Next, install the dependencies:

```sh
yarn install
```

To run the dev server, which has hot reloading:

```sh
yarn dev
```

During actual operation, build the production bundle:

```sh
yarn build
```

Then, use the following command to serve the bundle:

```sh
yarn preview
```
