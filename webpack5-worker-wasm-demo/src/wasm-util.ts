const dbName = 'wasm-cache';
const storeName = 'wasm-cache';

function openDatabase(dbVersion) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);
    request.onerror = reject.bind(null, 'Error opening wasm cache database');
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (db.objectStoreNames.contains(storeName)) {
        console.log(`Clearing out version ${event.oldVersion} wasm cache`);
        db.deleteObjectStore(storeName);
      }
      console.log(`Creating version ${event.newVersion} wasm cache`);
      db.createObjectStore(storeName);
    };
  });
}

function lookupInDatabase(db, url) {
  return new Promise((resolve, reject) => {
    const store = db.transaction([storeName]).objectStore(storeName);
    const request = store.get(url);
    request.onerror = reject.bind(null, `Error getting wasm module ${url}`);
    request.onsuccess = (event) => {
      if (request.result) resolve(request.result);
      else reject(`Module ${url} was not found in wasm cache`);
    };
  });
}

function storeInDatabase(db, module, url) {
  const store = db.transaction([storeName], 'readwrite').objectStore(storeName);
  try {
    const request = store.put(module, url);
    request.onerror = (err) => {
      console.log(`Failed to store in wasm cache: ${err}`);
    };
    request.onsuccess = (err) => {
      console.log(`Successfully stored ${url} in wasm cache`);
    };
  } catch (e) {
    console.warn('An error was thrown... in storing wasm cache...');
    console.warn(e);
  }
}

export function instantiateCachedURL(dbVersion, url, importObject) {
  function fetchAndInstantiate() {
    return fetch(url)
      .then((response) => response.arrayBuffer())
      .then((buffer) => WebAssembly.instantiate(buffer, importObject));
  }

  return openDatabase(dbVersion).then(
    (db) => {
      return lookupInDatabase(db, url).then(
        (module) => {
          console.log(`Found ${url} in wasm cache`);
          return WebAssembly.instantiate(module, importObject);
        },
        (errMsg) => {
          console.log(errMsg);
          return fetchAndInstantiate().then((results) => {
            setTimeout(() => storeInDatabase(db, results.module, url), 0);
            return results.instance;
          });
        }
      );
    },
    (errMsg) => {
      // If opening the database failed (due to permissions or quota), fall back
      // to simply fetching and compiling the module and don't try to store the
      // results.
      console.log(errMsg);
      return fetchAndInstantiate().then((results) => results.instance);
    }
  );
}

export function fetchAndInstantiate(url, importObject) {
  return fetch(url)
    .then((response) => response.arrayBuffer())
    .then((bytes) => WebAssembly.instantiate(bytes, importObject))
    .then((results) => results.instance);
}
