<?php
    try
    {
        $rootDir = realpath($_SERVER["DOCUMENT_ROOT"]);
        require "$rootDir/Pandemic/serverCode/connect.php";
        require "$rootDir/Pandemic/serverCode/utilities.php";

        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data["username"]))
            throw new Exception("Username not provided");
        
        $username = $data["username"];

        $stmt = $pdo->prepare("SELECT userID, accountVerified, email FROM user WHERE username = ? OR email = ?");
        $stmt->execute([$username, $username]);

        if ($stmt->rowCount() === 0)
            throw new Exception("Username does not exist");
        
        $user = $stmt->fetch();
        $userID = $user["userID"];
        $accountNeedsVerification = $user["accountVerified"] != "1";

        $stmt = $pdo->query("SELECT pass FROM user WHERE userID = $userID");
        $hash = $stmt->fetch()["pass"];

        if (!password_verify($data["password"], $hash))
            throw new Exception("Invalid password");
        
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