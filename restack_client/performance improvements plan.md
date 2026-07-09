# Static Asset Serving vs. Dynamic Imports Strategy

## Context
Our game imports hundreds of asset files (PNGs, GIFs, JPGs) statically in `src/utils/images.js`. As the project grows, this eager static bundling causes:
- Large initial JavaScript bundle sizes.
- Slower initial page load times.
- Browser memory bloat, as all asset references are parsed and kept in the memory graph from the start.

To optimize the game's performance and eliminate memory bloat, two main approaches exist: **Static Asset Serving** and **Dynamic Imports**.

---

## 1. Static Asset Serving (Recommended Approach)

### Concept
Relocate all assets from the `src/` directory to the `public/` folder (e.g., `public/assets/`). Instead of importing image files in JavaScript, refer to them using plain string paths (e.g., `/assets/portraits/crew/sage_compressed.png`).

### Benefits
- **Zero Bundler Overhead**: Webpack or Vite does not need to parse, process, or hash thousands of images. They are served directly as static files.
- **Dynamic Reference Building**: We can construct image paths dynamically at runtime based on data variables, e.g., `/assets/icons/items/${item.type}/${item.name}.png`.
- **Easy Service Worker Caching**: Service Workers can easily match static routes like `/assets/*` to implement a robust, localized cache.
- **On-Demand Loading**: The browser natively lazy-loads these assets only when an `<img>` tag is rendered in the DOM or a CSS `background-image` is applied.

### How to Implement
1. **Move Assets**: Move `src/assets/` to `public/assets/`.
2. **Update Image Utility**:
   Replace static imports in `src/utils/images.js` with functional utility selectors:
   ```javascript
   export const getMonsterPortrait = (id) => `/assets/portraits/monsters/${id}.png`;
   export const getCrewPortrait = (id) => `/assets/portraits/crew/${id}/${id}_compressed.png`;
   export const getItemIcon = (category, name) => `/assets/icons/items/${category}/${name}.png`;
   ```
3. **Configure Caching**: Set up a Cache-First Service Worker in the public folder to intercept `/assets/` requests and store them in Cache Storage.

---

## 2. Dynamic Imports (`import()`)

### Concept
Keep the assets inside `src/assets/` and load them asynchronously on demand using Webpack's dynamic `import()` statement.

### Benefits
- **Asset Integrity**: Assets remain inside the bundler graph, so broken file paths or deleted assets will fail at compile/build time rather than silently returning a 404 at runtime.
- **Webpack Bundling**: Webpack can perform automated asset optimization, compressions, and inline small images as base64 data URIs.

### Drawbacks
- **Asynchronous Handling**: Loading an image becomes an asynchronous operation (returning a Promise), requiring components to manage loading states (e.g., `useState`, `useEffect`) before rendering each image.
- **Chunk Proliferation**: Webpack splits each dynamically imported image into its own separate chunk/file, resulting in thousands of tiny files in the build directory.

### How to Implement
1. **Update Code to Async Loading**:
   ```javascript
   const [imgSrc, setImgSrc] = useState(null);
   useEffect(() => {
     import(`../assets/portraits/monsters/${monsterId}.png`)
       .then(image => setImgSrc(image.default))
       .catch(err => console.error("Failed to load image", err));
   }, [monsterId]);
   ```

---

## Comparison Summary

| Metric | Static Asset Serving (Recommended) | Dynamic Imports |
| :--- | :--- | :--- |
| **Initial Bundle Size** | 🟢 Extremely Small (Images completely removed from bundle) | 🟡 Medium (Bundler still generates import chunks) |
| **Rendering Simplicity** | 🟢 Very Simple (Immediate standard string URL rendering) | 🔴 Complex (Asynchronous promise resolution in React state) |
| **Caching Control** | 🟢 Excellent (Clean pattern matching with Service Workers) | 🟡 Average (Interfered with by Webpack chunk hashing) |
| **Asset Safety** | 🟡 Risk of 404 if path changes | 🟢 Guaranteed compile-time safety |
