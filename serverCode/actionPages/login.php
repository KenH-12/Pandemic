<?php
    try
    {
        require "../connect.php";
        require "../accountUtils.php";

        $ipAddress = getClientIpAddress();
        $failedAttemptCount = countFailedAttempts($pdo, $ipAddress);

        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data["username"]))
            throw new Exception("Username not provided");
        
        $username = $data["username"];

        $stmt = $pdo->prepare("SELECT userID, accountVerified, email FROM user WHERE username = ? OR email = ?");
        $stmt->execute([$username, $username]);

        if ($stmt->rowCount() === 0)
        {
            recordFailedLoginAttempt($pdo, $username, $ipAddress);
            throwExceptionIfFailedAttemptLimitReached($failedAttemptCount + 1);

            throw new Exception("Username does not exist");
        }
        
        $user = $stmt->fetch();
        $userID = $user["userID"];
        $accountNeedsVerification = $user["accountVerified"] != "1";

        $stmt = $pdo->prepare("SELECT pass FROM user WHERE userID = ?");
        $stmt->execute([$userID]);
        $hash = $stmt->fetch()["pass"];

        if (!password_verify($data["password"], $hash))
        {
            recordFailedLoginAttempt($pdo, $username, $ipAddress);
            throwExceptionIfFailedAttemptLimitReached($failedAttemptCount + 1);

            throw new Exception("Invalid password");
        }

        clearFailedLoginAttempts($pdo);
        
        session_start();
        $_SESSION["uID"] = $userID;

        $response["accountNeedsVerification"] = $accountNeedsVerification;
        
        if ($accountNeedsVerification)
            $response["emailAddress"] = $user["email"];
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Login failed: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Login failed: " . $e->getMessage();
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