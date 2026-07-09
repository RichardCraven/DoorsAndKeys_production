# Node Version Compatibility Callouts

**Target Node Version**: 14 (v14.17.6)  
**Currently Running**: v18.17.1  
**Last Updated**: 2026-05-30

---

## 🔴 Critical — Build Is Broken

### 1. Sass / node-sass Version Mismatch
- **Symptom**: `ParserError: Syntax Error at line: 1, column 20` on `camp-modal.scss`. The build **fails completely**.
- **Root Cause**: `package-lock.json` locks `node-sass@4.14.1` (a C++ native addon), but the actually installed module is **Dart Sass 1.100.0** aliased as `node-sass`. This means someone ran `npm install node-sass@npm:sass` or similar at some point, replacing the real `node-sass` with modern Dart Sass.
- **Why It Matters**: `sass-loader@8.0.2` (bundled with `react-scripts@3.4.1`) expects `node-sass@^4.0.0`. Dart Sass 1.100.0 has a different API and emits the "legacy JS API deprecated" warning. The SCSS parser behavior differs, causing the `camp-modal.scss` parse error.
- **Fix on Node 14**: Run `npm install node-sass@4.14.1` (the native C++ build requires Node ≤16 and Python 2/3). This is the version in `package-lock.json`.
- **Fix on Node 18+**: Replace `node-sass` with `sass` (Dart Sass) properly and upgrade `sass-loader` to a version that supports it (v10+), OR upgrade `react-scripts` to v5 which bundles Dart Sass support natively.

---

## 🟡 Moderate — Works But Requires Workaround

### 2. OpenSSL Legacy Provider (`ERR_OSSL_EVP_UNSUPPORTED`)
- **Symptom**: `Error: error:0308010C:digital envelope routines::unsupported` when running `npm start` or `npm run build`.
- **Root Cause**: Node 17+ uses OpenSSL 3.0 which drops support for MD4 hashing used by Webpack 4's `createHash()`.
- **Workaround**: Prefix scripts with `NODE_OPTIONS=--openssl-legacy-provider`. The `package.json` scripts do NOT currently include this flag.
- **Fix on Node 14**: Not needed. Node 14 uses OpenSSL 1.1.1 natively.
- **Fix on Node 18+**: Either add the flag to all scripts in `package.json`, or upgrade to Webpack 5 / `react-scripts@5`.

---

## 🟢 Low Risk — Currently Working

### 3. Optional Chaining (`?.`) and Nullish Coalescing (`??`)
- **Usage**: ~36 files use `?.`, ~110 files use `??` across the codebase.
- **Status**: **Currently compiles on Node 18** because `babel-preset-react-app@9.1.2` (bundled with `react-scripts@3.4.1`) includes `@babel/plugin-proposal-optional-chaining@7.9.0` and `@babel/plugin-proposal-nullish-coalescing-operator@7.8.3`.
- **Risk**: These Babel plugins handle the transpilation, so this works on **any** Node version. No issue expected on Node 14.
- **Note**: This is a Babel concern, not a Node runtime concern. The code is transpiled before execution.

### 4. React 16 + react-scripts 3.4.1
- **Status**: Both are vintage packages designed for Node 8–14. They run **better** on Node 14 than on Node 18.
- **Risk on Node 14**: None. This is the happy path.
- **Risk on Node 18+**: The OpenSSL and Sass issues documented above.

---

## Summary: Should You Upgrade Node?

| Stay on Node 14 | Upgrade to Node 18+ |
|---|---|
| ✅ No OpenSSL workaround needed | ❌ Requires `--openssl-legacy-provider` everywhere |
| ✅ Can use real `node-sass@4.14.1` | ❌ `node-sass` 4.x won't compile (needs Node ≤16) |
| ✅ All existing dependencies are designed for this version | ❌ Need to swap to Dart Sass + upgrade `sass-loader` |
| ❌ Missing modern Node APIs (fetch, structuredClone, etc.) | ✅ Modern APIs available |
| ❌ No security patches since April 2023 | ✅ Active LTS support |

**Recommendation**: If you stay on `react-scripts@3.4.1`, **Node 14 is the easiest path**. If you plan to modernize the stack (React 18, react-scripts 5 or Vite), then upgrade Node to 18+ at the same time.

### Immediate Fix to Unblock Build (Node 18)
If staying on Node 18 for now, fix the Sass issue by running:
```bash
npm install sass@1.77.0 --save-dev
```
Then update `package.json` scripts to include the OpenSSL flag:
```json
"start": "NODE_OPTIONS=--openssl-legacy-provider react-scripts start",
"build": "NODE_OPTIONS=--openssl-legacy-provider react-scripts build"
```
> ⚠️ The `camp-modal.scss` parse error may also require updating `sass-loader` or fixing the SCSS syntax to be compatible with Dart Sass.
