import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
// ======================
// Modal Utilities (Export)
// ======================
export function showModalText(text) {
  try {
    const modal = document.querySelector("[data-modal]");
    const content = modal.querySelector("[data-content]");
    
    if (!modal || !content) {
      throw new Error("Modal elements not found");
    }
    
    content.textContent = text;
    modal.showModal();
  } catch (error) {
    console.error("Modal error:", error);
    // Fallback to alert if modal fails
    alert(text);
  }
}

export function closeModal() {
  const modal = document.querySelector("[data-modal]");
  modal?.close();
}

// ======================
// DOM Elements
// ======================
const signupButton = document.querySelector("[data-signup]");
const loginButton = document.querySelector("[data-login]");
const emailInput = document.querySelector("[data-email]");
const closeButton = document.querySelector("[data-close]");

// ======================
// Configuration
// ======================
const SERVER_URL = import.meta.env.PROD 
  ? "https://backend-auther.onrender.com" 
  : "http://localhost:3000";

// ======================
// Event Listeners
// ======================
signupButton?.addEventListener("click", signup);
loginButton?.addEventListener("click", login);
closeButton?.addEventListener("click", closeModal);

// ======================
// Auth Functions
// ======================
async function signup() {
  const email = emailInput.value.trim();
  
  if (!validateEmail(email)) {
    showModalText("Please enter a valid email address");
    return;
  }

  try {
    signupButton.disabled = true;
    signupButton.textContent = "Registering...";

    // 1. Get registration options
    const initResponse = await fetch(`${SERVER_URL}/init-register?email=${encodeURIComponent(email)}`, {
      credentials: "include"
    });
    
    if (!initResponse.ok) {
      const error = await initResponse.json();
      throw new Error(error.message || "Registration failed");
    }

    const options = await initResponse.json();

    // 2. Start WebAuthn registration
    const registrationJSON = await startRegistration(options);
    
    // 3. Verify registration
    const verifyResponse = await fetch(`${SERVER_URL}/verify-register`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registrationJSON)
    });
    
    if (!verifyResponse.ok) {
      const error = await verifyResponse.json();
      throw new Error(error.message || "Verification failed");
    }

    const { verified } = await verifyResponse.json();
    showModalText(verified ? `Success! ${email} registered` : "Registration failed");
    
  } catch (error) {
    console.error("Signup error:", error);
    showModalText(formatErrorMessage(error));
  } finally {
    signupButton.disabled = false;
    signupButton.textContent = "Sign Up";
  }
}

async function login() {
  const email = emailInput.value.trim();
  
  if (!validateEmail(email)) {
    showModalText("Please enter a valid email address");
    return;
  }

  try {
    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    // 1. Get authentication options
    const initResponse = await fetch(`${SERVER_URL}/init-auth?email=${encodeURIComponent(email)}`, {
      credentials: "include",
    });

    if (!initResponse.ok) {
      const error = await initResponse.json();
      throw new Error(error.message || "Authentication failed");
    }

    const options = await initResponse.json();

    // 2. Start WebAuthn authentication
    const authJSON = await startAuthentication(options);

    // 3. Verify authentication
    const verifyResponse = await fetch(`${SERVER_URL}/verify-auth`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authJSON),
    });

    if (!verifyResponse.ok) {
      const error = await verifyResponse.json();
      throw new Error(error.message || "Verification failed");
    }

    const { verified } = await verifyResponse.json();
    showModalText(verified ? `Welcome back ${email}!` : "Login failed");

  } catch (error) {
    console.error("Login error:", error);
    showModalText(formatErrorMessage(error));
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Login";
  }
}

// ======================
// Helper Functions
// ======================
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatErrorMessage(error) {
  const message = error.message || "An unexpected error occurred";
  
  if (message.includes("base64URLString")) {
    return "Browser not supported. Try Chrome, Firefox or Edge";
  }
  if (message.includes("cancelled")) {
    return "Authentication was cancelled";
  }
  if (message.includes("timeout")) {
    return "Session timed out. Please try again";
  }
  if (message.includes("credentials")) {
    return "No passkey found for this email";
  }
  
  return message;
}

// ======================
// Initialize
// ======================
document.addEventListener('DOMContentLoaded', () => {
  if (!window.PublicKeyCredential) {
    showModalText("Passkeys not supported in this browser");
    loginButton?.setAttribute('disabled', 'true');
    signupButton?.setAttribute('disabled', 'true');
  }
});
