<?php
    try
    {
        require "../connect.php";
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

        $stmt = $pdo->prepare("SELECT * FROM user WHERE username = ?");
        $stmt->execute([$username]);

        if ($stmt->rowCount() > 0)
            throw new Exception("Username already exists");
        
        $stmt = $pdo->prepare("SELECT * FROM user WHERE email = ?");
        $stmt->execute([$email]);

        if ($stmt->rowCount() > 0)
            throw new Exception("Email already exists");

        $stmt = $pdo->prepare("INSERT INTO user (username, email, pass) VALUES (?, ?, ?)");
        $stmt->execute([$username, $email, $hash]);

        if ($stmt->rowCount() !== 1)
        {
            require "../utilities.php";
            throwException($pdo, "Failed to create account");
        }
        
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
        echo json_encode($response);
    }
?>