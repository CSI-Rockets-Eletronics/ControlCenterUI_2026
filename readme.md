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

To run the dev server:

```sh
yarn dev
```

To build the production bundle:

```sh
yarn build
```
