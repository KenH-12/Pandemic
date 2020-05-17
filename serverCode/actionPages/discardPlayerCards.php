<?php
    try
    {
        session_start();
        
        if (!isset($_SESSION["game"]))
            throw new Exception("game not found");

        require "../connect.php";
        require "../utilities.php";

        $details = json_decode(file_get_contents("php://input"), true);

        if (!isset($details["currentStep"]))
            throw new Exception("current step not set");
        
        if (!isset($details["role"]))
            throw new Exception("role not set");
        
        if (!isset($details["discardingRole"]))
            throw new Exception("discarding role not set");
        
        if (!isset($details["cardKeys"]))
            throw new Exception("card keys not set");
        
        $game = $_SESSION["game"];
        $currentStep = $details["currentStep"];
        $currentTurnRole = $details["role"];
        $discardingRole = $details["discardingRole"];
        $cardKeys = $details["cardKeys"];
        
        if ($currentStep === "discard")
            $nextStep = "infect cities";
        else if ($currentStep === "hand limit")
            $nextStep = false; // next step will be determined by the updateStep function.
        else
            throw new Exception("Discard player card attempt unexpected during current step: '$currentStep'");

        $pdo->beginTransaction();

        discardPlayerCards($pdo, $game, $discardingRole, $cardKeys);

        // Confirm that the discardingRole has discarded enough cards to be within the hand limit.
        if (roleHasTooManyCards($pdo, $game, $discardingRole))
            throw new Exception("Too many cards in hand after discarding.");

        $response["nextStep"] = updateStep($pdo, $game, $currentStep, $nextStep, $currentTurnRole);
        
        $eventDetails = implode(",", $cardKeys);
        $response["events"] = recordEvent($pdo, $game, "ds", $eventDetails, $discardingRole);
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Discard failed: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Discard failed: " . $e->getMessage();
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