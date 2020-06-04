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

        $stmt = $pdo->prepare("SELECT userID FROM user WHERE username = ? OR email = ?");
        $stmt->execute([$username, $username]);

        if ($stmt->rowCount() === 0)
            throw new Exception("Username does not exist");
        
        $userID = $stmt->fetch()["userID"];

        $stmt = $pdo->query("SELECT pass FROM user WHERE userID = $userID");
        $hash = $stmt->fetch()["pass"];

        if (!password_verify($data["password"], $hash))
            throw new Exception("Invalid password");
        
        $_SESSION["uID"] = $userID;
        $response["success"] = true;
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