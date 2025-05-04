// Skontrolujeme, či je používateľ prihlásený v localStorage
if(localStorage.getItem("username")) {
  document.getElementById("loginForm").style.display = "none";  // Skryť prihlasovací formulár
  document.getElementById("logoutDiv").style.display = "block"; // Zobraziť tlačidlo na odhlásenie
  showEditableTeams(); // Zavoláme funkciu na zobrazenie alebo editovanie tímov
} else {
  showReadonlyTeams(); // Ak nie je prihlásený, zobrazíme len názvy tímov
}

// Funkcia pre prihláseného používateľa (môže upravovať tímy)
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

  // Aktivácia inputov
  enableInputFields();
}

// Funkcia pre neprihláseného používateľa (len na zobrazenie)
function showReadonlyTeams() {
  // Zakážeme inputy
  disableInputFields();
}

// Funkcia pre zakázanie všetkých inputov (neprihlásený používateľ)
function disableInputFields() {
  document.querySelectorAll("input").forEach(input => {
    input.disabled = true; // Zakáže všetky inputy
  });
}

// Funkcia pre povolenie všetkých inputov (pri prihlásenom používateľovi)
function enableInputFields() {
  document.querySelectorAll("input").forEach(input => {
    input.disabled = false; // Povolenie všetkých inputov
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
