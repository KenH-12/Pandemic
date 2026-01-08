<?php
    try
    {
        require "../connect.php";
        require "../accountUtils.php";
        
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
        unset($_SESSION["emailOrUsername"]);

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