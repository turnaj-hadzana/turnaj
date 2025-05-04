<?php
session_start();

// Ak je používateľ už prihlásený, presmeruj ho na admin stránku
if (isset($_SESSION['username'])) {
    header("Location: admin.php");
    exit;
}

// Kontrola prihlásenia
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $username = $_POST['username'];
    $password = $_POST['password'];

    // Pre tento príklad si tvrdé nastavenie prihlasovacích údajov
    if ($username === 'admin' && $password === 'tajneheslo') {
        $_SESSION['username'] = $username;
        header("Location: admin.php");
        exit;
    } else {
        $error_message = "Nesprávne meno alebo heslo.";
    }
}
?>

<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prihlásenie</title>
</head>
<body>
  <h2>Prihlásenie</h2>

  <?php if (isset($error_message)) : ?>
    <p style="color: red;"><?php echo $error_message; ?></p>
  <?php endif; ?>

  <form method="POST">
    <input type="text" name="username" placeholder="Používateľské meno" required><br><br>
    <input type="password" name="password" placeholder="Heslo" required><br><br>
    <button type="submit">Prihlásiť sa</button>
  </form>
</body>
</html>
