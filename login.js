// Zoznam platných používateľov
const allowedUsers = [
  { username: "admin", password: "admin" }
];

// Prihlásenie
function login() {
  const username = document.getElementById("usernameInput").value.trim();
  const password = document.getElementById("passwordInput").value;

  const found = allowedUsers.find(user => user.username === username && user.password === password);

  if (found) {
    localStorage.setItem("username", username);
    window.location.href = "index.html";
  } else {
    alert("Nesprávne meno alebo heslo.");
  }
}

// Odhlásenie
function logout() {
  localStorage.removeItem("username");
  location.reload();
}

// Vracia true, ak je prihlásený
function isLoggedIn() {
  return !!localStorage.getItem("username");
}

// Zobrazí panel v pravom hornom rohu (okrem login.html)
function renderLoginPanel() {
  if (window.location.pathname.includes("login.html")) return;

  const div = document.createElement("div");
  div.style.position = "fixed";
  div.style.top = "10px";
  div.style.right = "10px";
  div.style.background = "#f0f0f0";
  div.style.padding = "10px";
  div.style.borderRadius = "5px";
  div.style.boxShadow = "0 0 5px rgba(0,0,0,0.2)";
  div.style.zIndex = "999";

  if (isLoggedIn()) {
    const user = localStorage.getItem("username");
    div.innerHTML = `
      Prihlásený: <strong>${user}</strong>
      <button onclick="logout()" style="margin-left:10px;">Odhlásiť</button>
    `;
  } else {
    div.innerHTML = `<a href="login.html">Prihlásenie</a>`;
  }

  document.body.appendChild(div);
}

window.onload = renderLoginPanel;
