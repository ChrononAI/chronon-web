import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { initMixpanel } from "./mixpanel";

// 🔹 Create MUI theme that matches Tailwind's font
const theme = createTheme({
  typography: {
    fontFamily: [
      'Inter',
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      'sans-serif',
    ].join(','),
  },
});

// 🔹 Optional: ensure MUI respects Tailwind body background / colors
theme.components = {
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        fontFamily: theme.typography.fontFamily,
      },
    },
  },
};

initMixpanel();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>
);
