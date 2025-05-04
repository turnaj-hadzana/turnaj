<?php
session_start();

// Jednoduché prihlasovanie (v praxi použi databázu)
$correctUsername = "admin";
$correctPassword = "admin";

$username = $_POST['username'] ?? '';
$password = $_POST['password'] ?? '';

if ($username === $correctUsername && $password === $correctPassword) {
    $_SESSION['username'] = $username;
    header("Location: admin.php"); // presmeruj na admin stránku
    exit;
} else {
    echo "Nesprávne prihlasovacie údaje. <a href='login.html'>Späť</a>";
}
?>
