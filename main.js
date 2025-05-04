// Skontrolujeme, či je používateľ prihlásený v localStorage
if(localStorage.getItem("username")) {
  document.getElementById("loginForm").style.display = "none";  // Skryť prihlasovací formulár
  document.getElementById("logoutDiv").style.display = "block"; // Zobraziť tlačidlo na odhlásenie
  // Zavoláme funkciu na zobrazenie alebo editovanie tímov
  showEditableTeams();
} else {
  // Ak nie je prihlásený, zobrazíme len názvy tímov bez možnosti editácie
  showReadonlyTeams();
}

// Funkcia na prihlásenie
document.getElementById("loginButton").addEventListener("click", function() {
  const username = document.getElementById("username").value;
  if(username) {
    localStorage.setItem("username", username); // Uložíme používateľské meno do localStorage
    window.location.reload();  // Obnovíme stránku, aby sme načítali správne zobrazenie
  }
});

// Funkcia na odhlásenie
document.getElementById("logoutButton").addEventListener("click", function() {
  localStorage.removeItem("username"); // Vymažeme používateľské meno z localStorage
  window.location.reload();  // Obnovíme stránku
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

// Funkcia pre neprihláseného používateľa
function showReadonlyTeams() {
  // Zobrazíme už uložené názvy tímov bez možnosti editácie
  // Tieto funkcie sa môžu jednoducho zmeniť podľa potreby
  document.querySelectorAll("input").forEach(input => input.disabled = true);
}

// Generovanie zápasov
function generateMatches(teams, group) {
  let matchesHtml = '';
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matchesHtml += `<div class="match">
        ${teams[i]} vs ${teams[j]} 
        <input type="number" placeholder="Skóre ${teams[i]}" class="score1"> : 
        <input type="number" placeholder="Skóre ${teams[j]}" class="score2">
      </div>`;
    }
  }
  
  document.getElementById("matches" + group).innerHTML = matchesHtml;
}
