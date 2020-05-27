# css-esm

CSS modules in the browser, with lightweight preprocessing by [stylis.js](https://github.com/thysultan/stylis.js)

Based on the quite awesome [csz](https://github.com/lukejacksonn/csz) library by Luke Jackson.

## Usage

With inline styles:

```js
import {css} from 'https://unpkg.com/css-esm';

const styles = css`
  .button {
    color: red;
  }

  :global (.foo) {
    .button.is-primary {
      color: green;
    }
  }
`;

document.body.innerHTML = `
  <button class="${styles.button}">Get started</button>
  <div class="foo">
    <button class="${styles.button} ${styles.isPrimary}">Another button</button>
  </div>
`;
```

With external files:

```js
import {loadCss} from 'https://unpkg.com/css-esm';
const styles = loadCss('main.css');

document.body.innerHTML = `
  <button class="${styles.button}">Get started</button>
`;
```

While mapped class names are available immediately, you can see when the CSS file has loaded using
the special `$loaded` property (a `Promise`):

```js
const styles = loadCss('main.css');
await styles.$loaded;
```
