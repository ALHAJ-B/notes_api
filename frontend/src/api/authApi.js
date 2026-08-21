const API = "/api";

export const arrayBufferToBase64 = (buffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)));

const createWorkerAndPromise = () => {
  const worker = new Worker(new URL("../crypto/crypto.worker.js", import.meta.url), {
    type: "module",
  });

  const workerPromise = new Promise((resolve, reject) => {
    worker.onmessage = (e) => {
      if (e.data.status === "success") {
        resolve(e.data.key);
      } else {
        reject(new Error(e.data.error || "Key derivation failed"));
      }
    };
    worker.onerror = (e) => reject(new Error(e.message || "Worker failed"));
  });

  return { worker, workerPromise };
};

const handleLogin = async (formData, password, setEncryptionKey) => {
  const { worker, workerPromise } = createWorkerAndPromise();

  try {
    const response = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || payload.message || "Login failed");
    }

    const { token, encryptionSalt } = payload;
    const saltBytes = Uint8Array.from(atob(encryptionSalt), (c) => c.charCodeAt(0));
    worker.postMessage({ password, salt: saltBytes });

    const derivedKey = await workerPromise;
    setEncryptionKey(derivedKey);
    return { success: true, token };
  } finally {
    worker.terminate();
  }
};

const handleRegister = async (formData, password, setEncryptionKey) => {
  const { worker, workerPromise } = createWorkerAndPromise();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltString = arrayBufferToBase64(salt);

  worker.postMessage({ password, salt });

  try {
    const response = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...Object.fromEntries(formData),
        encryptionSalt: saltString,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || payload.message || "Registration failed");
    }

    const derivedKey = await workerPromise;
    setEncryptionKey(derivedKey);
    return { success: true, token: payload.token };
  } finally {
    worker.terminate();
  }
};

export const handleSubmit = async (event, setEncryptionKey) => {
  event.preventDefault();

  const formData = new FormData(event.target);
  const { password, action } = Object.fromEntries(formData);

  if (!password) {
    throw new Error("Password is required");
  }

  if (action === "login") {
    return handleLogin(formData, password, setEncryptionKey);
  }

  return handleRegister(formData, password, setEncryptionKey);
};
