import { existsSync, readFileSync } from "node:fs";

const required = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

function readEnvFile(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1).replace(/^["']|["']$/g, "")];
      }),
  );
}

const env = {
  ...readEnvFile(".env"),
  ...readEnvFile(".env.local"),
  ...process.env,
};

const missing = required.filter((key) => !env[key] || env[key].startsWith("your_"));
if (missing.length > 0) {
  console.error("Deployment is missing Firebase web app environment values:");
  for (const key of missing) console.error(`- ${key}`);
  console.error("\nCreate .env.local with the Firebase Web SDK config before deploying the production shell.");
  process.exitCode = 1;
} else {
  console.log("Deployment preflight passed: Firebase environment values are present.");
}
