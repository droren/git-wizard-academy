// js/file-system.js
/**
 * Virtual File System for Git Wizard Academy
 * Simulates a basic Unix-like file system
 *
 * Fixes:
 * - resolvePath no longer mutates currentPath (absolute path resolution used to 'cd' you silently)
 * - persistence to localStorage so git repos survive page refresh
 */

(function(){
  const STORAGE_KEY = "gwa_fileSystem_v1";

  // In-memory FS tree
  let fileSystem = {
    "/": { type: "directory", children: {} }
  };

  let currentPath = "/";
  const pathHistory = ["/"];

  function deepClone(obj){
    return JSON.parse(JSON.stringify(obj));
  }

  function normalizePath(path){
    if(!path) return currentPath;
    if(path === "." ) return currentPath;
    if(path === "~" || path === "$HOME") return "/";
    // If absolute
    if(path.startsWith("/")) return path;
    // Relative -> join
    if(currentPath === "/") return "/" + path;
    return currentPath.replace(/\/+$/,"") + "/" + path;
  }

  function resolvePure(path){
    const raw = normalizePath(path);
    const parts = raw.split("/").filter(Boolean);
    const out = [];
    for(const part of parts){
      if(part === "." || part === "") continue;
      if(part === ".."){ out.pop(); continue; }
      out.push(part);
    }
    return "/" + out.join("/");
  }

  function getNode(path){
    const resolved = resolvePure(path || ".");
    const parts = resolved.split("/").filter(Boolean);
    let cur = fileSystem["/"];
    for(const part of parts){
      if(!cur.children?.[part]) return null;
      cur = cur.children[part];
    }
    return cur;
  }

  function ensureDir(path){
    const resolved = resolvePure(path);
    const parts = resolved.split("/").filter(Boolean);
    let cur = fileSystem["/"];
    for(const part of parts){
      if(!cur.children[part]) cur.children[part] = { type:"directory", children:{} };
      cur = cur.children[part];
      if(cur.type !== "directory") return null;
    }
    return cur;
  }

  function saveFS(){
    try{
      const payload = {
        fs: fileSystem,
        cwd: currentPath,
        history: pathHistory
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }catch(e){
      // ignore storage errors
    }
  }

  function loadFS(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return;
      const payload = JSON.parse(raw);
      if(payload?.fs?.["/"]?.type === "directory"){
        fileSystem = payload.fs;
        currentPath = payload.cwd || "/";
        pathHistory.length = 0;
        (payload.history || ["/"]).forEach(p => pathHistory.push(p));
      }
    }catch(e){
      // ignore parse errors
    }
  }

  // Load once on script load
  loadFS();

  window.fileSystemModule = {
    // --- persistence helpers
    save: saveFS,
    load: loadFS,
    export: () => deepClone({ fs: fileSystem, cwd: currentPath, history: pathHistory }),
    import: (snapshot) => {
      if(snapshot?.fs?.["/"]?.type === "directory"){
        fileSystem = snapshot.fs;
        currentPath = snapshot.cwd || "/";
        pathHistory.length = 0;
        (snapshot.history || ["/"]).forEach(p => pathHistory.push(p));
        saveFS();
        return true;
      }
      return false;
    },

    getCurrentPath: () => currentPath,
    setCurrentPath: (path) => { currentPath = resolvePure(path); },
    resolvePath: (path) => resolvePure(path),

    // Get directory object
    getDir: (path) => {
      const node = getNode(path || ".");
      return node && node.type === "directory" ? node : null;
    },

    createFile: (path, content="") => {
      const full = resolvePure(path);
      const parts = full.split("/").filter(Boolean);
      let cur = fileSystem["/"];
      for(let i=0;i<parts.length-1;i++){
        const part = parts[i];
        if(!cur.children[part]) cur.children[part] = { type:"directory", children:{} };
        cur = cur.children[part];
        if(cur.type !== "directory") return false;
      }
      const filename = parts[parts.length-1];
      cur.children[filename] = { type:"file", content: String(content), modified: new Date().toISOString() };
      saveFS();
      return true;
    },

    readFile: (path) => {
      const node = getNode(path);
      return node && node.type === "file" ? node : null;
    },

    writeFile: (path, content="") => {
      const node = getNode(path);
      if(node && node.type === "file"){
        node.content = String(content);
        node.modified = new Date().toISOString();
        saveFS();
        return true;
      }
      // create if missing
      return window.fileSystemModule.createFile(path, content);
    },

    listDirectory: (path=".") => {
      const dir = window.fileSystemModule.getDir(path);
      if(!dir) return [];
      return Object.keys(dir.children).map(name => ({
        name,
        type: dir.children[name].type,
        modified: dir.children[name].modified
      }));
    },

    listFiles: (path=".") => window.fileSystemModule.listDirectory(path).filter(i => i.type === "file"),

    exists: (path) => {
      if(!path || path === ".") return true;
      return !!getNode(path);
    },

    isDirectory: (path) => {
      if(!path || path === ".") return true;
      const n = getNode(path);
      return !!n && n.type === "directory";
    },

    deletePath: (path) => {
      const full = resolvePure(path);
      const parts = full.split("/").filter(Boolean);
      if(parts.length === 0) return false;
      let cur = fileSystem["/"];
      for(let i=0;i<parts.length-1;i++){
        if(!cur.children[parts[i]]) return false;
        cur = cur.children[parts[i]];
        if(cur.type !== "directory") return false;
      }
      const last = parts[parts.length-1];
      if(cur.children[last]){
        delete cur.children[last];
        saveFS();
        return true;
      }
      return false;
    },

    createDirectory: (path) => {
      const dir = ensureDir(path);
      if(!dir) return false;
      saveFS();
      return true;
    },

    reset: () => {
      fileSystem = { "/": { type:"directory", children:{} } };
      currentPath = "/";
      pathHistory.length = 0;
      pathHistory.push("/");
      saveFS();
    },

    // expose history for cd -
    _pathHistory: pathHistory,
  };
})();
