<?php
    try
    {
        session_start();
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");

        if (!isset($_POST["role"])
            || !isset($_POST["currentStep"]))
            throw new Exception("Required values not set.");
        
        $game = $_SESSION["game"];
        $role = $_POST["role"];
        $currentStep = $_POST["currentStep"];

        require "../connect.php";
        include "../utilities.php";

        $mysqli->autocommit(FALSE);
        
        $EVENT_TYPE = "pa";
        $response["events"] = recordEvent($mysqli, $game, $EVENT_TYPE, "", $role);

        $NEXT_STEP = "draw";
        $response["nextStep"] = updateStep($mysqli, $game, $currentStep, $NEXT_STEP, $role);
    }
    catch(Exception $e)
    {
        $response["failure"] = $e->getMessage();
    }
    finally
    {
        if (isset($response["failure"]))
            $mysqli->rollback();
        else
            $mysqli->commit();
        
        $mysqli->close();

        echo json_encode($response);
    }
?>