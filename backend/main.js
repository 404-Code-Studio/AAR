import fs from "fs/promises";
import path from "path";

const modulesPath = "./modules"; // Pfad zu deinen Modulen
const modules_loaded = [];
let logging = "debug"; // optional

async function listModules() {
  const files = await fs.readdir(modulesPath);
  const jsFiles = files
    .filter(file => file.endsWith(".js"))
    .map(file => file.slice(0, -3));
  console.log("[LOG] Found", jsFiles.length, "Modules");
  if (logging === "debug") console.log("[DEBUG] Found Modules: ", jsFiles);
  return jsFiles;
}

async function loadModule(ModuleName) {
  const imported = await import(path.join(modulesPath, ModuleName + ".js"));
  const moduleObj = imported.default || imported; // CommonJS kompatibel
  if (logging === "debug") console.log("[DEBUG] Loaded Module: ", ModuleName);
  modules_loaded.push(ModuleName);
  return moduleObj;
}

// Neue Funktion: alle Module laden
async function loadAllModules() {
  const moduleNames = await listModules();
  const loadedModules = {};

  for (const name of moduleNames) {
    try {
      loadedModules[name] = await loadModule(name);
    } catch (err) {
      console.error(`[ERROR] Failed to load module "${name}":`, err);
    }
  }

  console.log("[LOG] All modules loaded:", Object.keys(loadedModules));
  return loadedModules;
}

// Beispiel: alles laden
(async () => {
  const allModules = await loadAllModules();
})();
