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

import {compile, middleware, serialize, stringify} from './stylis-4.0.0.esm.js';

import murmur from './murmurhash3.esm.js';

const cache = {};

const rules = [];
const sheet = document.createElement('style');
document.head.appendChild(sheet);

const tokenize = (s, re) => {
  let tokens = [];
  re.lastIndex = 0;
  let si = 0;
  let m;
  while ((m = re.exec(s)) !== null) {
    if (si != m.index) {
      tokens.push(s.substring(si, m.index));
    }
    tokens.push(m[0]);
    si = re.lastIndex;
  }
  if (si < s.length) {
    tokens.push(s.substring(si));
  }
  return tokens;
}

const replaceLocals = (selector, mapper) => {
  let out = [];
  let stack = [{local: true, emitParen: false}];
  for (let token of tokenize(selector, /:(local|global)\s*\(?|\(|\)/g)) {
    if (token.startsWith(':local')) {
      token.endsWith('(') && stack.unshift({emitParen: false});
      stack[0].local = true;
    } else if (token.startsWith(':global')) {
      token.endsWith('(') && stack.unshift({local:0, emitParen: false});
      stack[0].local = false;
    } else if (token == '(') {
      stack.unshift({local: stack[0].local, emitParen: true});
      out.push(token);
    } else if (token == ')' && stack.length > 1) {
      let {emitParen} = stack.shift();
      emitParen && out.push(token);
    } else {
      if (stack[0].local) {
        token = token.replace(/\.([\w-_]+)/ig,
                              s => '.' + mapper(s.substring(1)));
      }
      out.push(token);
    }
  }
  return out.join('');
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
  const globalIndex = rules.length;
  rules[globalIndex] = '';

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
    rules[globalIndex] = css;
    sheet.innerHTML = rules.join('');
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
