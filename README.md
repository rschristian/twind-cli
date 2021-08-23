<div align="center">

# @twind/cli

[![MIT License](https://flat.badgen.net/github/license/tw-in-js/twind-cli)](https://github.com/tw-in-js/twind-cli/blob/main/LICENSE)
[![Latest Release](https://flat.badgen.net/npm/v/@twind/cli?icon=npm&label&cache=10800&color=blue)](https://www.npmjs.com/package/@twind/cli)
[![Github](https://flat.badgen.net/badge/icon/tw-in-js%2Ftwind-cli?icon=github&label)](https://github.com/tw-in-js/twind-cli)
[![Typescript](https://flat.badgen.net/badge/icon/included?icon=typescript&label)](https://unpkg.com/browse/@twind/cli/cli.d.ts)

![Twind Demo](https://raw.githubusercontent.com/tw-in-js/twind-cli/main/assets/demo.gif)

</div>

## Changes

As a Twind user, I found myself wanting to continue using the tool even on smaller projects, such as building singular HTML files. The difficulty that arises there is that build scripts will inevitably need to be created to get a decent development experience, like file watching, automatic rebuilding, etc. While `@twind/cli` came close to what I had desired, it still had a number of shortcomings, like missing warnings when unrecognized class names were used, no support for inlining the built CSS, and no support for the grouping syntax. Hence, a fork was necessary and this also allows me to add some more personalizations that conflict with a general use tool.

This fork has lost much of its flexibility and therefore is not likely to appeal to any sort of general audience. It's been altered to fit my exact use case and unwanted functionality has been cut out entirely. I've provided a change log of sorts below that, while not comprehensive, covers most of the major changes.

Many thanks to [Sascha](https://github.com/sastan) for building the base for this tool.

1. No longer supports glob inputs
  - I simply have no need of this. Singular file input only.
2. Any styles not found in a `class="..."` will be ignored
  - The regex will ignore any class name not declared this way. If you have some JS creating UI elements, those styles will be included as long as they can use that style of class name assigning. Sorry React, but you're not supported.
3. Input and output is HTML
  - No longer supports a wide variety of inputs, and no longer outputs a standalone CSS file. Input must be HTML and is expected to contain `<style id="__twind"></style>`. This is where the resulting CSS will be injected.
4. Full minification of input HTML
  - Something I use and so it made sense to insert here. The HTML doc will be minified with terser. No option to disable this.
5. No support for Tailwind config files
  - Use `twind.config.{[m]js,ts}` instead.

## Installation

Install from npm:

```sh
# Using npm
npm install @rschristian/twind-cli

# Using Yarn
yarn add @rschristian/twind-cli
```

## Usage

```bash
## Basic usage, outputs to 'ouput.html'
twind index.html

# Use custom output
twind index.html -o foo.html

# Disable watch mode
twind index.html --no-watch

# Use different twind config
twind index.html -c src/twind.config.ts
```

```
  Usage
    $ twind <input> [options]

  Options
    -o, --output     Set output html file path  (default output.html)
    -c, --config     Set config file path  (default {.,src,pages,docs}/twind.config.{[m]js,ts})
    -w, --watch      Watch for changes  (default true)
    -v, --version    Displays current version
    -h, --help       Displays this message
```

## License

[MIT](https://github.com/tw-in-js/cli/blob/main/LICENSE)
