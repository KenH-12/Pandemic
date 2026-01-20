<?php
    function recordFailedAttemptAndThrowException($pdo, $emailOrUsername, $ipAddress, $failedAttemptCount)
    {
        recordFailedLoginAttempt($pdo, $emailOrUsername, $ipAddress);
        throwExceptionIfFailedAttemptLimitReached($failedAttemptCount + 1);
        
        throw new Exception("invalid code");
    }
    
    try
    {
        require "../connect.php";
        require_once "../accountUtils.php";

        $ipAddress = getClientIpAddress();
        $failedAttemptCount = countFailedAttempts($pdo, $ipAddress);
        
        // Get the email or username that the user claimed is theirs.
        session_start();
        if (!isset($_SESSION["emailOrUsername"]))
            throw new Exception("email or username not set.");
        
        $emailOrUsername = $_SESSION["emailOrUsername"];

        // Make sure the user exists.
        $stmt = $pdo->prepare("SELECT userID, username, accountVerified FROM `user` WHERE email = ? OR username = ?");
        $stmt->execute([$emailOrUsername, $emailOrUsername]);

        if ($stmt->rowCount() === 0)
            recordFailedAttemptAndThrowException($pdo, $emailOrUsername, $ipAddress, $failedAttemptCount);
        
        $userDetails = $stmt->fetch();
        $uID = $userDetails["userID"];
        $username = $userDetails["username"];
        $userNotVerified = $userDetails["accountVerified"] == "0";

        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data["verificationCode"]))
            throw new Exception("verification code not set.");

        // Verify the code.
        $stmt = $pdo->prepare("SELECT vCode, expiry FROM verificationCode WHERE userID = ?");
        $stmt->execute([$uID]);

        if ($stmt->rowCount() === 0)
            recordFailedAttemptAndThrowException($pdo, $emailOrUsername, $ipAddress, $failedAttemptCount);
        
        $row = $stmt->fetch();

        if ($row["vCode"] != $data["verificationCode"])
            recordFailedAttemptAndThrowException($pdo, $emailOrUsername, $ipAddress, $failedAttemptCount);
        
        // Verify the code's expiry date.
        $utcNow = new DateTime("now", new DateTimeZone("UTC"));
        if (strtotime($utcNow->format("Y-m-d H:i:s")) > strtotime($row["expiry"]))
            throw new Exception("code expired");

        // Clear the user's codes,
        // verify the user (they have proved that they are in control of the email address associated with the account),
        // and clear any failed attempts.
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("DELETE FROM verificationCode WHERE userID = ?");
        $stmt->execute([$uID]);

        if ($stmt->rowCount() !== 1)
            throwException($pdo, "failed to delete verification code.");

        if ($userNotVerified)
        {
            $stmt = $pdo->prepare("UPDATE `user` SET accountVerified = 1 WHERE userID = ?");
            $stmt->execute([$uID]);
    
            if ($stmt->rowCount() !== 1)
                throwException($pdo, "failed to update account status to verified.");
        }
        
        clearFailedLoginAttempts($pdo);

        // Temporary session variables to keep the user logged out until they choose a new password.
        $_SESSION["tmpID"] = $uID;
        $_SESSION["tmpUsername"] = $username;
        
        $response["success"] = true;
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Failed to verify account: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to verify account: " . $e->getMessage();
    }
    finally
    {
        if ($pdo->inTransaction())
        {
            if (isset($response["failure"]))
                $pdo->rollback();
            else
                $pdo->commit();
        }
        
        echo json_encode($response);
    }
?>