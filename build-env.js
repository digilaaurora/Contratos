const fs = require("fs");
const path = require("path");

const rootDir = __dirname;
const envPath = path.join(rootDir, ".env");
const outPath = path.join(rootDir, "env.js");

function parseEnv(content) {
  const env = {};
  const lines = content.split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const index = trimmed.indexOf("=");
    if (index === -1) return;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (key) {
      env[key] = value.replace(/^"|"$/g, "");
    }
  });
  return env;
}

function buildEnvFile() {
  let envVars = {};

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envVars = parseEnv(envContent);
  } else {
    envVars = {
      SUPABASE_URL: process.env.SUPABASE_URL || "",
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || ""
    };
  }

  if (!envVars.SUPABASE_URL || !envVars.SUPABASE_ANON_KEY) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_ANON_KEY en .env o variables de entorno.");
  }

  const output = `window.__ENV = ${JSON.stringify({
    SUPABASE_URL: envVars.SUPABASE_URL || "",
    SUPABASE_ANON_KEY: envVars.SUPABASE_ANON_KEY || ""
  }, null, 2)};\n`;

  fs.writeFileSync(outPath, output, "utf8");
}

buildEnvFile();
console.log("env.js generado correctamente");
