<?php
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $username = $_POST['username'] ?? '';
  $password = $_POST['password'] ?? '';

  if ($username === 'admin' && $password === 'tajneheslo') {
    $_SESSION['username'] = $username;
    header("Location: admin.php");
    exit;
  } else {
    header("Location: login.html?error=1");
    exit;
  }
}
