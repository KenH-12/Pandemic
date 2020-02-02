<?php
    try
    {
        session_start();
        require "../connect.php";
        include "../utilities.php";
        
        if (!isset($_SESSION["game"]))
            throw new Exception("game not found");

        if (!isset($_POST["currentStep"]))
            throw new Exception("current step not set");
        
        if (!isset($_POST["role"]))
            throw new Exception("role not set");
        
        if (!isset($_POST["discardingRole"]))
            throw new Exception("discarding role not set");
        
        if (!isset($_POST["cardKeys"]))
            throw new Exception("card keys not set");
        
        $game = $_SESSION["game"];
        $currentStep = $_POST["currentStep"];
        $currentTurnRole = $_POST["role"];
        $discardingRole = $_POST["discardingRole"];
        $cardKeys = $_POST["cardKeys"];
        
        if ($currentStep === "discard")
            $nextStep = "infect cities";
        else if ($currentStep === "hand limit")
            $nextStep = false; // next step will be determined by the updateStep function.
        else
            throw new Exception("Discard player card attempt unexpected during current step: '$currentStep'");

        $mysqli->autocommit(FALSE);

        discardPlayerCards($mysqli, $game, $discardingRole, $cardKeys);

        // Confirm that the discardingRole has discarded enough cards to be within the hand limit.
        if (roleHasTooManyCards($mysqli, $game, $discardingRole))
            throw new Exception("Too many cards in hand after discarding.");

        $response["nextStep"] = updateStep($mysqli, $game, $currentStep, $nextStep, $currentTurnRole);
        
        $eventDetails = implode(",", $cardKeys);
        $response["events"] = recordEvent($mysqli, $game, "ds", $eventDetails, $discardingRole);
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