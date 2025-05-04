<?php
session_start();
session_destroy();  // Zničí session, čím odhlási používateľa
header("Location: login.php");  // Presmerovanie na login stránku
exit;
?>
