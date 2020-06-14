<?php
    try
    {
        require "../connect.php";
        require "../utilities.php";

        $data = json_decode(file_get_contents("php://input"), true);

        session_start();
        
        if (!isset($_SESSION["uID"]))
            throw new Exception("user not logged in.");
        
        if (!isset($data["verificationCode"]))
            throw new Exception("verification code not set.");

        $userID = $_SESSION["uID"];
        $vCode = $data["verificationCode"];

        $stmt = $pdo->prepare("SELECT verificationCode, vCodeExpiry FROM `user` WHERE userID = ?");
        $stmt->execute([$userID]);

        if ($stmt->rowCount() === 0)
        {
            unset($_SESSION["uID"]);
            throw new Exception("user not logged in");
        }
        
        $row = $stmt->fetch();

        if ($row["verificationCode"] != $vCode)
            throw new Exception("invalid code");
        
        $now = (new DateTime())->setTimezone(new DateTimeZone('America/Toronto'));
        if (strtotime($now->format("Y-m-d H:i:s")) > strtotime($row["vCodeExpiry"]))
            throw new Exception("code expired");

        $stmt = $pdo->prepare("UPDATE `user` SET accountVerified = 1 WHERE userID = ?");
        $stmt->execute([$userID]);

        if ($stmt->rowCount() !== 1)
            throwException($pdo, "failed to update account status to verified.");
        
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
        echo json_encode($response);
    }
?>