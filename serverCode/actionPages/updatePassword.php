<?php
    try
    {
        $rootDir = realpath($_SERVER["DOCUMENT_ROOT"]);
        require "$rootDir/Pandemic/serverCode/connect.php";
        require "$rootDir/Pandemic/serverCode/accountUtils.php";
        
        session_start();
        if (!isset($_SESSION["tmpID"]))
            throw new Exception("session timed out.");
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data["password"]))
            throw new Exception("password not set.");

        $uID = $_SESSION["tmpID"];
        $hash = password_hash($data["password"], PASSWORD_DEFAULT);

        $stmt = $pdo->prepare("UPDATE `user` SET pass = ? WHERE userID = ?");
        $stmt->execute([$hash, $uID]);

        if (queryCausedError($pdo))
            throwException($pdo, "update query failed");
        
        $_SESSION["uID"] = $uID;
        unset($_SESSION["tmpID"]);
        unset($_SESSION["tmpUsername"]);

        $response["success"] = true;
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Failed to update password: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to update password: " . $e->getMessage();
    }
    finally
    {
        echo json_encode($response);
    }
?>