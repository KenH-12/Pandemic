<?php
$host = $_SERVER['DB_HOST'] ?? 'localhost';
$db   = $_SERVER['DB_NAME'] ?? 'pandemic';
$user = $_SERVER['DB_USER'] ?? 'root';
$pass = $_SERVER['DB_PASS'] ?? '';

$dsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";

try {
    $pdo = new PDO(
        $dsn,
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (PDOException $e) {
    error_log('Database connection failed: ' . $e->getMessage());
    http_response_code(500);
    exit('Database connection error');
}
