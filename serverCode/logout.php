<?php
    try
    {
        session_start();
        unset($_SESSION["uID"]);
        unset($_SESSION["game"]);
        session_destroy();

        $response = true;
    }
    catch(Exception $e)
    {
        $response["failure"] = "Logout failed: " . $e->getMessage();
    }
    finally
    {
        echo json_encode($response);
    }
?>