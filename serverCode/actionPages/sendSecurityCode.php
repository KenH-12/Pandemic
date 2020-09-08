<?php
    try
    {
        $rootDir = realpath($_SERVER["DOCUMENT_ROOT"]);
        require "$rootDir/Pandemic/serverCode/connect.php";
        require "$rootDir/Pandemic/serverCode/accountUtils.php";

        $data = json_decode(file_get_contents("php://input"), true);
        $emailOrUsername = isset($data["emailOrUsername"]) ? $data["emailOrUsername"] : false;

        if ($emailOrUsername)
        {
            session_start();
            $_SESSION["emailOrUsername"] = $emailOrUsername;
            
            $stmt = $pdo->prepare("SELECT userID, username, email FROM `user` WHERE username = ? or email = ?");
            $stmt->execute([$emailOrUsername, $emailOrUsername]);
    
            if ($stmt->rowCount() === 1)
            {
                $userDetails = $stmt->fetch();
                
                $userID = $userDetails["userID"];
                $username = $userDetails["username"];
                $to = $userDetails["email"];
    
                $code = newVerificationOrSecurityCode($pdo, $userID);
    
                $subject = "Pandemic Security Code";
                $message = "Hello, $username.\nHere is your security code: $code\n(code will expire after 1 hour)";
                $headers = "From: ken@kenhenderson.site";
    
                mail($to, $subject, $message, $headers);
            }
        }
        
        $response["success"] = true;
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Failed to send security code: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to send security code: " . $e->getMessage();
    }
    finally
    {
        echo json_encode($response);
    }
?>