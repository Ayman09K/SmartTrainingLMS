import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { SmartTrainingDocumentTitle } from "./branding/SmartTrainingDocumentTitle";
import { AuthProvider } from "./features/auth/AuthContext";
import { SmartTrainingThemeProvider } from "./theme/SmartTrainingThemeProvider";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <SmartTrainingDocumentTitle />
      <AuthProvider>
        <SmartTrainingThemeProvider>
          <App />
        </SmartTrainingThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
