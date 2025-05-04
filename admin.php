<?php
session_start();
if (!isset($_SESSION['username'])) {
    header("Location: login.html");
    exit;
}
?>

<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8">
  <title>Admin sekcia</title>
</head>
<body>
  <h2>Vitaj, <?= htmlspecialchars($_SESSION['username']) ?>!</h2>
  <p>Tu môžeš upravovať obsah tímov.</p>
  <a href="logout.php">Odhlásiť sa</a>
</body>
</html>
