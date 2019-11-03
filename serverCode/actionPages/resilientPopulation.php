<?php
    try
    {
        session_start();
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");

        if (!isset($_POST["currentStep"]))
            throw new Exception("Current step not set.");
        
        if (!isset($_POST["role"]))
            throw new Exception("Role not set.");

        if (!isset($_POST["cardKeyToRemove"]))
            throw new Exception("Card to remove not set.");
        
        $game = $_SESSION["game"];
        $currentStep = $_POST["currentStep"];
        $activeRole = $_POST["role"];
        $cardKeyToRemove = $_POST["cardKeyToRemove"];
        
        require "../connect.php";
        include "../utilities.php";
        
        $EVENT_CODE = "rp";
        $CARD_KEY = "resi";

        checkEventCardLegality($mysqli, $game, $CARD_KEY);
        $discardingRole = getEventCardHolder($mysqli, $game, $CARD_KEY);
        
        $mysqli->autocommit(FALSE);
        
        discardOrRemoveEventCard($mysqli, $game, $discardingRole, $CARD_KEY);
        $discardingRole = convertRoleFromPossibleContingency($mysqli, $discardingRole);

        $cardType = "infection";
        $currentPile = "discard";
        $newPile = "removed";
        moveCardsToPile($mysqli, $game, $cardType, $currentPile, $newPile, $cardKeyToRemove);

        $response["events"][] = recordEvent($mysqli, $game, $EVENT_CODE, $cardKeyToRemove, $discardingRole);

        $proceedToNextStep = eventCardSatisfiedDiscard($mysqli, $game, $currentStep, $discardingRole, $activeRole);

        if ($proceedToNextStep)
            $response["proceedFromDiscardToStep"] = $proceedToNextStep;
    }
    catch(Exception $e)
    {
        $response["failure"] = "Resilient Population failed: " . $e->getMessage();
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