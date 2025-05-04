// Zoznam povolených používateľov
const allowedUsers = [
  { username: "admin", password: "admin" },
];

// Pokus o prihlásenie
function login() {
  const username = document.getElementById("usernameInput").value.trim();
  const password = document.getElementById("passwordInput").value;

  const match = allowedUsers.find(user => user.username === username && user.password === password);

  if (match) {
    localStorage.setItem("username", username);
    location.reload();
  } else {
    alert("Nesprávne meno alebo heslo.");
  }
}

// Odhlásenie
function logout() {
  localStorage.removeItem("username");
  location.reload();
}

// Kontrola prihlásenia
function checkLogin() {
  const username = localStorage.getItem("username");
  if (username) {
    document.getElementById("loginDiv").classList.add("hidden");
    document.getElementById("userPanel").classList.remove("hidden");
    document.getElementById("editableTeams").classList.remove("hidden");
    document.getElementById("usernameDisplay").innerText = username;
  }
}
