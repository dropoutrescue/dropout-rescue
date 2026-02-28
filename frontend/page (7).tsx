@import "tailwindcss";

:root {
  --background: #0c0c0c;
  --foreground: #ffffff;
}

body {
  color: var(--foreground);
  background: var(--background);
  min-height: 100vh;
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}