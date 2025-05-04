<?php
session_start();
if (!isset($_SESSION['username'])) {
  header("Location: login.html");
  exit;
}

// Cesta k súboru so zoznamom tímov
$teamsFile = "teams.json";

// Uloženie dát, ak boli odoslané cez POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $teams = [
    "groupA" => [
      $_POST['team1'] ?? '',
      $_POST['team2'] ?? '',
      $_POST['team3'] ?? '',
      $_POST['team4'] ?? '',
      $_POST['team5'] ?? ''
    ]
  ];
  file_put_contents($teamsFile, json_encode($teams, JSON_PRETTY_PRINT));
  $message = "Tímy boli uložené.";
}

// Načítanie aktuálnych tímov
$teamsData = file_exists($teamsFile) ? json_decode(file_get_contents($teamsFile), true) : [];
$groupA = $teamsData['groupA'] ?? ["", "", "", "", ""];
?>

<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8">
  <title>Admin – Úprava tímov</title>
</head>
<body>
  <h2>Vitaj, <?= htmlspecialchars($_SESSION['username']) ?>!</h2>
  <p><a href="logout.php">Odhlásiť sa</a></p>

  <h3>Skupina A – Úprava tímov</h3>
  <?php if (!empty($message)) echo "<p style='color:green;'>$message</p>"; ?>

  <form method="post">
    <?php for ($i = 0; $i < 5; $i++): ?>
      <input type="text" name="team<?= $i+1 ?>" value="<?= htmlspecialchars($groupA[$i]) ?>" placeholder="Tím <?= $i+1 ?>"><br><br>
    <?php endfor; ?>
    <button type="submit">Uložiť tímy</button>
  </form>

  <h3>Aktuálne tímy:</h3>
  <ul>
    <?php foreach ($groupA as $team): ?>
      <li><?= htmlspecialchars($team) ?></li>
    <?php endforeach; ?>
  </ul>
</body>
</html>
