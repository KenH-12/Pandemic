<?php
    try
    {
        $rootDir = realpath($_SERVER["DOCUMENT_ROOT"]);
        require "$rootDir/Pandemic/serverCode/connect.php";
        require "$rootDir/Pandemic/serverCode/accountUtils.php";
        
        session_start();
        if (!isset($_SESSION["accessKey"]))
            throw new Exception("session timed out");
        
        $accessKey = $_SESSION["accessKey"];
        $accountDetails = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($accountDetails["username"]))
            throw new Exception("username not set.");
        
        if (!isset($accountDetails["password"]))
            throw new Exception("password not set.");

        if (!isset($accountDetails["email"]))
            throw new Exception("email not set.");

        $username = $accountDetails["username"];
        $email = $accountDetails["email"];
        $hash = password_hash($accountDetails["password"], PASSWORD_DEFAULT);

        $stmt = $pdo->prepare("SELECT usesRemaining FROM accessKey WHERE keyCode = ?");
        $stmt->execute([$accessKey]);

        if ($stmt->rowCount() === 0)
            throw new Exception("invalid key");
        
        $accessKeyUsesRemaining = $stmt->fetch()["usesRemaining"];

        if ($accessKeyUsesRemaining == "0")
            throw new Exception("key depleted");

        $stmt = $pdo->prepare("SELECT * FROM user WHERE username = ?");
        $stmt->execute([$username]);

        if ($stmt->rowCount() > 0)
            throw new Exception("Username already exists");
        
        $stmt = $pdo->prepare("SELECT * FROM user WHERE email = ?");
        $stmt->execute([$email]);

        if ($stmt->rowCount() > 0)
            throw new Exception("Email already exists");
        
        $pdo->beginTransaction();

        $accessKeyUsesRemaining--;
        $stmt = $pdo->prepare("UPDATE accessKey SET usesRemaining = $accessKeyUsesRemaining WHERE keyCode = ?");
        $stmt->execute([$accessKey]);

        $stmt = $pdo->prepare("INSERT INTO user (username, email, pass, accessKeyUsed) VALUES (?, ?, ?, ?)");
        $stmt->execute([$username, $email, $hash, $accessKey]);

        if ($stmt->rowCount() !== 1)
            throwException($pdo, "Failed to create account");
        
        $uID = $pdo->lastInsertId();
        sendVerificationCode($pdo, $uID);
        $_SESSION["uID"] = $uID;
        
        unset($_SESSION["accessKey"]);
        $response["success"] = true;
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Failed to create account: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to create account: " . $e->getMessage();
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