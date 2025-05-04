<?php
session_start();

// Ak nie je prihlásený, presmeruj späť
if (!isset($_SESSION['username'])) {
  header("Location: login.html");
  exit;
}
?>

<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8">
  <title>Admin – Úprava tímov</title>
  <!-- Tu môžeš zahrnúť Firebase alebo iný JS -->
</head>
<body>
  <h2>Vitaj, <?php echo htmlspecialchars($_SESSION['username']); ?></h2>
  <button onclick="window.location.href='logout.php'">Odhlásiť sa</button>

  <!-- Editácia tímov -->
  <h3>Skupina A – Editácia tímov</h3>
  <input type="text" id="teamA1" placeholder="Tím 1">
  <input type="text" id="teamA2" placeholder="Tím 2">
  <input type="text" id="teamA3" placeholder="Tím 3">
  <input type="text" id="teamA4" placeholder="Tím 4">
  <input type="text" id="teamA5" placeholder="Tím 5">
  <button onclick="saveTeams()">Uložiť tímy</button>

  <!-- Zobrazenie tímov -->
  <h3>Skupina A – Aktuálne tímy</h3>
  <ul>
    <li id="teamA1Display"></li>
    <li id="teamA2Display"></li>
    <li id="teamA3Display"></li>
    <li id="teamA4Display"></li>
    <li id="teamA5Display"></li>
  </ul>

  <!-- Firebase JS skript tu -->
  <script src="firebase-config.js"></script>
  <script src="admin-scripts.js"></script>
</body>
</html>
