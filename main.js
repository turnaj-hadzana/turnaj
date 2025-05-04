// Skontrolujeme, či je používateľ prihlásený v localStorage
if(localStorage.getItem("username")) {
  document.getElementById("loginForm").style.display = "none";  // Skryť prihlasovací formulár
  document.getElementById("logoutDiv").style.display = "block"; // Zobraziť tlačidlo na odhlásenie
  showEditableTeams(); // Zavoláme funkciu na zobrazenie alebo editovanie tímov
} else {
  showReadonlyTeams(); // Ak nie je prihlásený, zobrazíme len názvy tímov
}

// Funkcia na zobrazenie registrácie
document.getElementById("showRegisterFormButton").addEventListener("click", function() {
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("registerForm").style.display = "block";
});

// Funkcia na zrušenie registrácie
document.getElementById("cancelRegisterButton").addEventListener("click", function() {
  document.getElementById("registerForm").style.display = "none";
  document.getElementById("loginForm").style.display = "block";
});

// Funkcia pre registráciu nového používateľa
document.getElementById("registerButton").addEventListener("click", function() {
  const newUsername = document.getElementById("newUsername").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if(newPassword !== confirmPassword) {
    alert("Heslá sa nezhodujú.");
    return;
  }

  let users = JSON.parse(localStorage.getItem("users")) || [];
  const userExists = users.some(user => user.username === newUsername);

  if(userExists) {
    alert("Používateľské meno už existuje.");
    return;
  }

  // Uložíme nového používateľa do localStorage
  users.push({ username: newUsername, password: newPassword });
  localStorage.setItem("users", JSON.stringify(users));

  alert("Úspešná registrácia!");
  document.getElementById("registerForm").style.display = "none";
  document.getElementById("loginForm").style.display = "block";
});

// Funkcia na prihlásenie
document.getElementById("loginButton").addEventListener("click", function() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  let users = JSON.parse(localStorage.getItem("users")) || [];
  const user = users.find(user => user.username === username && user.password === password);

  if(user) {
    localStorage.setItem("username", username); // Uložíme prihláseného používateľa
    window.location.reload();  // Obnovíme stránku, aby sme načítali správne zobrazenie
  } else {
    alert("Nesprávne prihlasovacie údaje.");
  }
});

// Funkcia na odhlásenie
document.getElementById("logoutButton").addEventListener("click", function() {
  localStorage.removeItem("username");
  window.location.reload();
});

// Funkcia pre prihláseného používateľa
function showEditableTeams() {
  document.getElementById("groupAForm").addEventListener("submit", function(event) {
    event.preventDefault();
    let teams = [
      document.getElementById("teamA1").value,
      document.getElementById("teamA2").value,
      document.getElementById("teamA3").value,
      document.getElementById("teamA4").value,
      document.getElementById("teamA5").value
    ];
    generateMatches(teams, "A");
  });

  document.getElementById("groupBForm").addEventListener("submit", function(event) {
    event.preventDefault();
    let teams = [
      document.getElementById("teamB1").value,
      document.getElementById("teamB2").value,
      document.getElementById("teamB3").value,
      document.getElementById("teamB4").value,
      document.getElementById("teamB5").value
    ];
    generateMatches(teams, "B");
  });

  document.getElementById("groupCForm").addEventListener("submit", function(event) {
    event.preventDefault();
    let teams = [
      document.getElementById("teamC1").value,
      document.getElementById("teamC2").value,
      document.getElementById("teamC3").value,
      document.getElementById("teamC4").value
    ];
    generateMatches(teams, "C");
  });
}

// Funkcia pre neprihláseného používateľa (len na zobrazenie)
function showReadonlyTeams() {
document.querySelectorAll("input").forEach(input => {
input.disabled = true;
});
}

// Funkcia na generovanie zápasov
function generateMatches(teams, group) {
let matches = [];
for(let i = 0; i < teams.length; i++) {
for(let j = i + 1; j < teams.length; j++) {
matches.push(teams[i] + " vs " + teams[j]);
}
}

let matchesDiv = document.getElementById("matches" + group);
matchesDiv.innerHTML = "<h3>Zápasy:</h3>" + matches.join("<br>");
}
