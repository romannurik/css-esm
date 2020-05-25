# css-esm

CSS modules in the browser, with lightweight preprocessing by [stylis.js](https://github.com/thysultan/stylis.js)

Based on the quite awesome [csz](https://github.com/lukejacksonn/csz) library by Luke Jackson.

## Usage

With inline styles:

    import {css} from 'path/to/css-esm';

    const styles = css`
      .button {
        color: red;
      }

      :global (.foo) {
        .button-foo {
          color: green;
        }
      }
    `;

    document.body.innerHTML = `
      <button class="${styles.button}">Get started</button>
      <div class="foo">
        <button class="${styles.buttonFoo}">Another button</button>
      </div>
    `;

With external files:

    import {loadCss} from 'path/to/css-esm';
    const styles = loadCss('main.css');

    document.body.innerHTML = `
      <button class="${styles.button}">Get started</button>
    `;

While mapped class names are available immediately, you can see when the CSS file has loaded using
the special `$loaded` property (a `Promise`):

   const styles = loadCss('main.css');
   await styles.$loaded;
