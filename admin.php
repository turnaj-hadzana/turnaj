<?php
session_start();

// Ak nie je prihlásený, presmeruj na prihlásenie
if (!isset($_SESSION['username'])) {
    header("Location: login.php");
    exit;
}

?>

<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin – Úprava tímov</title>
</head>
<body>
  <h2>Vitaj, <?php echo htmlspecialchars($_SESSION['username']); ?>!</h2>

  <form id="editTeamsForm">
    <h3>Skupina A – Editácia tímov</h3>
    <input type="text" id="teamA1" placeholder="Tím 1"><br><br>
    <input type="text" id="teamA2" placeholder="Tím 2"><br><br>
    <input type="text" id="teamA3" placeholder="Tím 3"><br><br>
    <input type="text" id="teamA4" placeholder="Tím 4"><br><br>
    <input type="text" id="teamA5" placeholder="Tím 5"><br><br>
    <button type="button" onclick="saveTeams()">Uložiť tímy</button>
  </form>

  <h3>Aktuálne tímy – Skupina A</h3>
  <ul>
    <li id="teamA1Display"></li>
    <li id="teamA2Display"></li>
    <li id="teamA3Display"></li>
    <li id="teamA4Display"></li>
    <li id="teamA5Display"></li>
  </ul>

  <button onclick="window.location.href='logout.php'">Odhlásiť sa</button>

  <!-- Tu sa načítajú Firebase a JavaScript -->
  <script src="https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js"></script>
  <script>
    // Firebase konfigurácia
    const firebaseConfig = {
      apiKey: "AIzaSyDNWRlWmBtQPIR49KViBpWf16hDUjU7Npw",
      authDomain: "turnaj-skusobne.firebaseapp.com",
      projectId: "turnaj-skusobne",
      storageBucket: "turnaj-skusobne.firebasestorage.app",
      messagingSenderId: "755998492681",
      appId: "1:755998492681:web:f3242ae0f54b61903290d8",
      measurementId: "G-B8DVMX2KVV"
    };

    // Inicializuj Firebase
    const app = firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // Funkcia na uloženie tímov do Firestore
    async function saveTeams() {
      const teams = {
        groupA: [
          document.getElementById("teamA1").value,
          document.getElementById("teamA2").value,
          document.getElementById("teamA3").value,
          document.getElementById("teamA4").value,
          document.getElementById("teamA5").value
        ]
      };

      try {
        // Ukladanie tímov do Firestore
        await db.collection("teams").doc("groupA").set(teams);
        alert("Tímy boli úspešne uložené.");
        displayTeams();
      } catch (error) {
        console.error("Chyba pri ukladaní tímov: ", error);
        alert("Chyba pri ukladaní tímov.");
      }
    }

    // Funkcia na zobrazenie tímov z Firestore
    async function displayTeams() {
      try {
        const doc = await db.collection("teams").doc("groupA").get();
        if (doc.exists) {
          const teams = doc.data().groupA;
          document.getElementById("teamA1Display").innerText = teams[0] || "Tím 1";
          document.getElementById("teamA2Display").innerText = teams[1] || "Tím 2";
          document.getElementById("teamA3Display").innerText = teams[2] || "Tím 3";
          document.getElementById("teamA4Display").innerText = teams[3] || "Tím 4";
          document.getElementById("teamA5Display").innerText = teams[4] || "Tím 5";
        }
      } catch (error) {
        console.error("Chyba pri načítaní tímov: ", error);
      }
    }

    // Načíta tímov pri načítaní stránky
    window.onload = displayTeams;
  </script>
</body>
</html>
