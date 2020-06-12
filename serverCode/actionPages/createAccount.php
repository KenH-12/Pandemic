<?php
    try
    {
        require "../connect.php";
        require "../utilities.php";
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
            throwException($pdo, "Failed to create account");

        $uID = $pdo->lastInsertId();
        $stmt = $pdo->query("SELECT udf_generateVerificationCode($uID) AS 'vCode'");
        $vCode = $stmt->fetch()["vCode"];

        if ($vCode == "0")
            throwException($pdo, "Failed to set verification code");

        $to = $email;
        $subject = "Pandemic Account Verification";
        $message = "<html>
                    <head>
                        <title>Pandemic Account Verification</title>
                    </head>
                    <body>
                        <h3>Hello, $username.</h3>
                        <h5>Ready to save the world?!</h5>
                        <p>Verify your Pandemic account using this code: $vCode</p>
                        <p>(code will expire after 1 hour)</p>
                    </body>
                    </html>";
        $headers = "MIME-Version: 1.0\r\nContent-type: text/html; charset=iso-8859-1";
        
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