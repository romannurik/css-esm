// Copyright 2020 Google (Roman Nurik)
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Fork of https://github.com/lukejacksonn/csz (MIT License, Copyright (c) 2020 Luke Jackson)

import {compile, serialize, middleware, stringify} from './stylis-4.0.0.esm.js';
import murmur from './murmurhash3.esm.js';

const cache = {};

const sheet = document.createElement('style');
document.head.appendChild(sheet);

const isExternalStyleSheet = key => key.indexOf('\n') < 0 && /^http|\.css$/.test(key.trim());

const replaceLocals = (selector, mapper) => {
  let global = false;
  let parts = selector
      .split(/(?=:local|:global)|(?<=\))/)
      .map(part => {
        let prevGlobal = global;
        global = part.match(/^:global/) ? true : global;
        global = part.match(/^:local/) ? false : global;
        if (!global) {
          part = part.replace(/\.([\w-_]+)/ig,
              s => '.' + mapper(s.substring(1)));
        }
        global = part.match(/\)$/) ? prevGlobal : global;
        return part.replace(/^:(global|local)\s*\(?\s*|\)$/g, '');
      });
  selector = parts.join('');
  return selector;
};

const modulify = classMapper => element => {
  let inKeyframe = element.parent && element.parent.type == '@keyframe';
  if (element.type === 'rule' && !inKeyframe) {
    element.props = element.props
      .map(sel => replaceLocals(sel, classMapper))
      .filter(sel => !!sel);
  }
};

function go(key) {
  const hashSeed = murmur(key);
  let loaded = false;
  let resolveLoaded;
  const loadedPromise = new Promise(resolve => { resolveLoaded = resolve; });
  const found = new Set();

  const mapper = cls => {
    cls = cls
      .replace(/^[A-Z]+/, s => s.toLowerCase())
      .replace(/[A-Z]+/g, s => `-${s.toLowerCase()}`);
    let hash = murmur(cls, hashSeed).toString(36);
    return `${cls}-${hash}`;
  };

  const proxy = new Proxy({}, {
    get: (_, prop) => {
      if (prop == '$loaded') {
        return loadedPromise;
      }

      let mapped = mapper(prop);
      if (loaded && !found.has(mapped)) {
        console.warn(`Loaded CSS didn't have an export for "${prop}"`);
      }
      return mapped;
    }
  });

  const process = source => {
    let css = serialize(
      compile(source),
      middleware([
        modulify(cls => {
          let mapped = mapper(cls);
          found.add(mapped);
          return mapped;
        }),
        stringify]));
    cache[key] = {css};
    loaded = true;
    resolveLoaded();
    sheet.innerHTML += css;
  };

  return {proxy, process};
}

export const css = (strings, ...values) => {
  let source = strings.reduce(
    (acc, string, i) => (acc += string + (values[i] == null ? '' : values[i])),
    '');

  let {proxy, process} = go(source);
  process(source);
  return proxy;
};

export const loadCss = path => {
  let url = new URL(path, document.baseURI).href; // relative to absolute URL
  if (cache[url]) {
    return cache[url].css;
  }

  let {proxy, process} = go(url);
  fetch(url)
    .then(res => res.text())
    .then(source => process(source));
  return proxy;
};
