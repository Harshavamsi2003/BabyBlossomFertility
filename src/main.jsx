// import React from "react";
// import ReactDOM from "react-dom/client";
// import { BrowserRouter } from "react-router-dom";
// import { HelmetProvider } from "react-helmet-async";
// import App from "./App.jsx";
// import "./styles/global.css";

// ReactDOM.createRoot(document.getElementById("root")).render(
//   <React.StrictMode>
//     <HelmetProvider>
//       <BrowserRouter>
//         <App />
//       </BrowserRouter>
//     </HelmetProvider>
//   </React.StrictMode>
// );


import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.jsx";
import "./styles/global.css";

// scripts/prerender.mjs bakes a real <meta name="description">, canonical
// link and og:* tags into the HTML served for each route, so a crawler that
// doesn't run JavaScript (unlike Googlebot) still sees them. Once JS DOES
// run, react-helmet-async (inside <SEO>, one per page) adds its own set of
// these same tags — but Helmet only ever cleans up tags it previously
// inserted itself, never hand-written ones, so without this step both sets
// would sit in <head> at once. That exact failure mode is why index.html
// used to have no static description/canonical/og tags at all (see the
// comment in index.html and in src/components/SEO.jsx).
// Removing the prerendered ones here, synchronously, before React mounts,
// means Helmet's tags are always the only ones left — a non-JS crawler still
// sees the correct baked-in tags, and a JS-rendering crawler or real visitor
// ends up with exactly one of each, same as before this change.
document
  .querySelectorAll(
    'head meta[name="description"], head link[rel="canonical"], ' +
      'head meta[property="og:title"], head meta[property="og:description"], ' +
      'head meta[property="og:url"]'
  )
  .forEach((el) => el.remove());

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);
