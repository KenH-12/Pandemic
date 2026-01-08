<?php
    try
    {
        require "../connect.php";
        require "../accountUtils.php";

        $ipAddress = getClientIpAddress();
        $failedAttemptCount = countFailedAttempts($pdo, $ipAddress);

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data["accessKey"]))
            throw new Exception("access key not set.");

        $accessKey = $data["accessKey"];

        $stmt = $pdo->prepare("SELECT keyCode, usesRemaining FROM accessKey WHERE keyCode = ?");
        $stmt->execute([$accessKey]);

        if ($stmt->rowCount() === 0)
        {
            recordFailedLoginAttempt($pdo, $accessKey, $ipAddress);
            throwExceptionIfFailedAttemptLimitReached($failedAttemptCount + 1);
            throw new Exception("invalid key");
        }
        
        if ($stmt->fetch()["usesRemaining"] == "0")
            throw new Exception("key depleted");
        
        session_start();
        $_SESSION["accessKey"] = $accessKey;
        
        clearFailedLoginAttempts($pdo);
        
        $response["success"] = true;
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Failed to verify access key: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to verify access key: " . $e->getMessage();
    }
    finally
    {
        echo json_encode($response);
    }
?>