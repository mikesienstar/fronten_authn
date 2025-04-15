import { startAuthentication, startRegistration } from "@simplewebauthn/browser"

const signupButton = document.querySelector("[data-signup]")
const loginButton = document.querySelector("[data-login]")
const emailInput = document.querySelector("[data-email]")
const modal = document.querySelector("[data-modal]")
const closeButton = document.querySelector("[data-close]")

signupButton.addEventListener("click", signup)
loginButton.addEventListener("click", login)
closeButton.addEventListener("click", () => modal.close())

// const SERVER_URL = "http://localhost:3000"
const SERVER_URL="https://backend-auther.onrender.com"

async function signup() {
  const email = emailInput.value.trim();
  if (!email) {
    showModalText("Please enter a valid email");
    return;
  }

  try {
    // 1. Get registration options
    const initResponse = await fetch(`${SERVER_URL}/init-register?email=${encodeURIComponent(email)}`, {
      credentials: "include"
    });
    
    const options = await initResponse.json();
    
    if (!initResponse.ok) {
      showModalText(options.error || "Failed to start registration");
      return;
    }

    // 2. Start WebAuthn registration
    const registrationJSON = await startRegistration(options);
    
    // 3. Verify registration
    const verifyResponse = await fetch(`${SERVER_URL}/verify-register`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registrationJSON)
    });
    
    const verifyData = await verifyResponse.json();
    if (!verifyResponse.ok) {
      showModalText(verifyData.error || "Verification failed");
      return;
    }
    
    showModalText(verifyData.verified ? `Success! ${email} registered` : "Registration failed");
    
  } catch (error) {
    console.error("Signup error:", error);
    showModalText(error.message.includes("base64URLString") 
      ? "Browser error: Try a different browser or device"
      : "An unexpected error occurred");
  }
}

async function login() {
  const email = emailInput.value.trim();
  if (!email) {
    showModalText("Please enter a valid email");
    return;
  }

  try {
    // 1. Get challenge from server
    const initResponse = await fetch(`${SERVER_URL}/init-auth?email=${encodeURIComponent(email)}`, {
      credentials: "include",
    });
    
    if (!initResponse.ok) {
      const errorData = await initResponse.json();
      showModalText(errorData.error || "Failed to start authentication");
      return;
    }
    
    const options = await initResponse.json();

    // 2. Get passkey
    const authJSON = await startAuthentication(options);

    // 3. Verify passkey with DB
    const verifyResponse = await fetch(`${SERVER_URL}/verify-auth`, {
      credentials: "include",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(authJSON),
    });

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json();
      showModalText(errorData.error || "Verification failed");
      return;
    }

    const verifyData = await verifyResponse.json();
    showModalText(verifyData.verified 
      ? `Successfully logged in ${email}`
      : "Failed to log in");
    
  } catch (error) {
    console.error("Login error:", error);
    showModalText(error.message.includes("base64URLString")
      ? "Browser error: Try a different browser or device"
      : "An unexpected error occurred");
  }
}
