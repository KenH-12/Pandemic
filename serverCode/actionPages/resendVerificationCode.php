<?php
    try
    {
        require "../connect.php";
        require "../accountUtils.php";

        session_start();
        
        if (!isset($_SESSION["uID"]))
            throw new Exception("user not logged in.");
        
        sendVerificationCode($pdo, $_SESSION["uID"]);
        
        $response["success"] = true;
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Failed to resend verification code: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to resend verification code: " . $e->getMessage();
    }
    finally
    {
        echo json_encode($response);
    }
?>