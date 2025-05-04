// Skontrolujeme, či je používateľ prihlásený v localStorage
// Funkcia na kontrolu prihlásenia a zobrazenie obsahu
if(localStorage.getItem("username")) {
    document.getElementById("userInfo").innerHTML = "Prihlásený ako: " + localStorage.getItem("username");
    document.getElementById("logoutDiv").style.display = "block";
    showEditableTeams(); // Pre prihláseného používateľa zobrazíme inputy
    displayTeams(); // Zobrazíme zmenené tímy
} else {
    showReadOnlyTeams(); // Pre neprihláseného používateľa zobrazíme len text
    displayTeams(); // Zobrazíme zmenené tímy
}

// Funkcia pre prihláseného používateľa (môže upravovať tímy)
function showEditableTeams() {
    document.getElementById("editableTeams").style.display = "block"; // Zobraziť formulár pre úpravy
    document.getElementById("readOnlyTeams").style.display = "none"; // Skryť textové zobrazenie

    // Pridanie zápasov do skupiny
    document.getElementById("groupAForm").addEventListener("submit", function(event) {
        event.preventDefault();
        saveTeamsToLocalStorage(); // Uložiť zmeny do localStorage
        generateMatches(); // Generovať zápasy
    });
}

// Funkcia pre neprihláseného používateľa (len na zobrazenie)
function showReadOnlyTeams() {
    document.getElementById("readOnlyTeams").style.display = "block"; // Zobraziť textové zobrazenie
    document.getElementById("editableTeams").style.display = "none"; // Skryť inputy
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
// Funkcia na ukladanie údajov o tímoch do localStorage
function saveTeamsToLocalStorage() {
    let teams = {
        groupA: [
            document.getElementById("teamA1").value,
            document.getElementById("teamA2").value,
            document.getElementById("teamA3").value,
            document.getElementById("teamA4").value,
            document.getElementById("teamA5").value
        ]
    };
    localStorage.setItem("teams", JSON.stringify(teams));
}
function displayTeams() {
    let storedTeams = localStorage.getItem("teams");

    if (storedTeams) {
        // Ak existujú údaje o tímoch, zobrazíme ich
        let teams = JSON.parse(storedTeams);
        document.getElementById("teamA1Display").innerText = teams.groupA[0];
        document.getElementById("teamA2Display").innerText = teams.groupA[1];
        document.getElementById("teamA3Display").innerText = teams.groupA[2];
        document.getElementById("teamA4Display").innerText = teams.groupA[3];
        document.getElementById("teamA5Display").innerText = teams.groupA[4];
    }
}

