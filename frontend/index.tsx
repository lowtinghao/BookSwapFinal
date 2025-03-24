import React from "react"
import ReactDOM from "react-dom/client"
import App from "./src/App"
import "./src/App.css"

// Create root and render
const container = document.getElementById("root") || document.createElement("div");
const root = ReactDOM.createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

