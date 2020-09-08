<?php

function getClientIpAddress()
{
    if (isset($_SERVER['HTTP_CLIENT_IP']))
        return $_SERVER['HTTP_CLIENT_IP'];
    
    if (isset($_SERVER['HTTP_X_FORWARDED_FOR']))
        return $_SERVER['HTTP_X_FORWARDED_FOR'];
    
    return $_SERVER['REMOTE_ADDR'];
}

function recordFailedLoginAttempt($pdo, $usernameOrId, $ipAddress)
{
    // Record the username that was used in the attempt.
    if (is_numeric($usernameOrId))
    {
        $stmt = $pdo->prepare("SELECT username from user WHERE userID = ?");
        $stmt->execute([$usernameOrId]);
        
        if ($stmt->rowCount() === 0)
            $username = "0";
        else
            $username = $stmt->fetch()["username"];
    }
    else
        $username = $usernameOrId;
    
    $timeOfAttempt = (new DateTime(null, new DateTimeZone("America/Toronto")))->format("Y-m-d H:i:s");

    $stmt = $pdo->prepare("INSERT INTO failedLoginAttempt (ipAddress, username, timeOfAttempt) VALUES (?, ?, ?)");
    $stmt->execute([$ipAddress, $username, $timeOfAttempt]);
}

function countFailedAttempts($pdo, $ipAddress)
{
    $fifteenMinsAgo = (new DateTime("15 minutes ago", new DateTimeZone("America/Toronto")))->format("Y-m-d H:i:s");

    $stmt = $pdo->prepare("SELECT COUNT(*) AS 'numAttempts'
                            FROM failedLoginAttempt
                            WHERE ipAddress = ?
                            AND timeOfAttempt > ?");
    $stmt->execute([$ipAddress, $fifteenMinsAgo]);

    $numAttempts = $stmt->fetch()["numAttempts"];

    throwExceptionIfFailedAttemptLimitReached($numAttempts);
    
    return $numAttempts;
}

function throwExceptionIfFailedAttemptLimitReached($numAttempts)
{
    $MAX_ATTEMPTS = 10;

    if ($numAttempts >= $MAX_ATTEMPTS)
    {
        session_start();
        unset($_SESSION["uID"]);
        throw new Exception("too many failed attempts");
    }
}

function clearFailedLoginAttempts($pdo)
{
    $ip = getClientIpAddress();

    $stmt = $pdo->prepare("DELETE FROM failedLoginAttempt WHERE ipAddress = ?");
    $stmt->execute([$ip]);
}

function sendVerificationCode($pdo, $userID)
{
    $stmt = $pdo->prepare("SELECT username, email FROM `user` WHERE userID = ?");
    $stmt->execute([$userID]);

    if ($stmt->rowCount() === 0)
    {
        session_start();
        unset($_SESSION["uID"]);
        throw new Exception("user not logged in");
    }

    $userDetails = $stmt->fetch();
    $username = $userDetails["username"];
    $to = $userDetails["email"];

    $code = newVerificationOrSecurityCode($pdo, $userID);

    $subject = "Pandemic Account Verification";
    $message = "Hello, $username.\nVerify your Pandemic account using this code: $code\n(code will expire after 1 hour)";
    $headers = "From: ken@kenhenderson.site";

    mail($to, $subject, $message, $headers);
}

function newVerificationOrSecurityCode($pdo, $userID)
{
    $stmt = $pdo->prepare("DELETE FROM verificationCode WHERE userID = ?");
    $stmt->execute([$userID]);
    
    if (queryCausedError($pdo))
        throwException($pdo, "failed to delete expired verification code");
    
    $vCode = callDbFunctionSafe($pdo, "udf_generateVerificationCode", $userID);

    if ($vCode == "0")
        throwException($pdo, "Failed to set verification code");
}

function callDbFunctionSafe($pdo, $fnName, $args)
{
    $placeholders = "?";
    
    if (is_array($args))
    {
        for ($i = 1; $i < count($args); $i++)
            $placeholders .= ", ?";
    }
    else
        $args = array($args);
    
    $stmt = $pdo->prepare("SELECT pandemic.$fnName($placeholders) AS 'returnVal'");
    $stmt->execute($args);

    return $stmt->fetch()["returnVal"];
}

function queryCausedError($pdo)
{
    return $pdo->errorInfo()[0] != "00000";
}

function throwException($pdo, $msg)
{
    throw new Exception("$msg: " . implode(", ", $pdo->errorInfo()));
}

?>