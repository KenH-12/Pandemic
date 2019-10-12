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
        
        $game = $_SESSION["game"];
        $currentStep = $_POST["currentStep"];
        $activeRole = $_POST["role"];
        
        require "../connect.php";
        include "../utilities.php";
        
        $EVENT_CODE = "oq";
        $CARD_KEY = "oneq";

        checkEventCardLegality($mysqli, $game, $CARD_KEY);
        
        $discardingRole = getEventCardHolder($mysqli, $game, $CARD_KEY);
        
        $mysqli->autocommit(FALSE);
        
        discardOrRemoveEventCard($mysqli, $game, $discardingRole, $CARD_KEY);
        
        // No useful information to include here,
        // but eventDetails are usually critically important, so they are not nullable.
        $eventDetails = "";

        
        $turnNum = getTurnNumber($mysqli, $game);
        // If the "infect cities" step is already in progress,
        // then One Quiet Night cannot be played until the next turn.
        // If at least one infection card has already been flipped over, the client should prevent the card from being played.
        if ($currentStep === "infect cities")
        {
            $infectionStepInProgress = $mysqli->query("SELECT COUNT(*) AS 'numEvents'
                                                        FROM vw_event
                                                        WHERE game = $game
                                                        AND turnNum = $turnNum
                                                        AND eventType = 'ic'")->fetch_assoc()["numEvents"];

            if ($infectionStepInProgress)
                throw new Exception("this card cannot be played while the Infect Cities step is in progress.");
        }
        
        $response["events"][] = recordEvent($mysqli, $game, $EVENT_CODE, $eventDetails, $discardingRole);

        $proceedToNextStep = eventCardSatisfiedDiscard($mysqli, $game, $currentStep, $discardingRole, $activeRole);

        if ($proceedToNextStep)
            $response["proceedFromDiscardToStep"] = $proceedToNextStep;
    }
    catch(Exception $e)
    {
        $response["failure"] = "One Quiet Night failed: " . $e->getMessage();
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