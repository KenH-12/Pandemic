<?php
    try
    {
        require "../connect.php";
        require "../accountUtils.php";

        $ipAddress = getClientIpAddress();
        $failedAttemptCount = countFailedAttempts($pdo, $ipAddress);

        $data = json_decode(file_get_contents("php://input"), true);

        session_start();
        
        if (!isset($_SESSION["uID"]))
            throw new Exception("user not logged in.");
        
        if (!isset($data["verificationCode"]))
            throw new Exception("verification code not set.");

        $userID = $_SESSION["uID"];
        $vCode = $data["verificationCode"];

        $stmt = $pdo->prepare("SELECT vCode, expiry FROM verificationCode WHERE userID = ?");
        $stmt->execute([$userID]);

        if ($stmt->rowCount() === 0)
        {
            unset($_SESSION["uID"]);
            throw new Exception("user not logged in");
        }
        
        $row = $stmt->fetch();

        if ($row["vCode"] != $vCode)
        {
            recordFailedLoginAttempt($pdo, $userID, $ipAddress);
            throwExceptionIfFailedAttemptLimitReached($failedAttemptCount + 1);
            
            throw new Exception("invalid code");
        }
        
        $now = new DateTime(null, new DateTimeZone("America/Toronto"));
        if (strtotime($now->format("Y-m-d H:i:s")) > strtotime($row["expiry"]))
            throw new Exception("code expired");

        $pdo->beginTransaction();

        $stmt = $pdo->prepare("DELETE FROM verificationCode WHERE userID = ?");
        $stmt->execute([$userID]);

        if ($stmt->rowCount() !== 1)
            throwException($pdo, "failed to delete verification code.");

        $stmt = $pdo->prepare("UPDATE `user` SET accountVerified = 1 WHERE userID = ?");
        $stmt->execute([$userID]);

        if ($stmt->rowCount() !== 1)
            throwException($pdo, "failed to update account status to verified.");
        
        clearFailedLoginAttempts($pdo);
        
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