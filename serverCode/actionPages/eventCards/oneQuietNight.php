<?php
    try
    {
        session_start();
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");
        
        $rootDir = realpath($_SERVER["DOCUMENT_ROOT"]);
        require "$rootDir/Pandemic/serverCode/connect.php";
        require "$rootDir/Pandemic/serverCode/utilities.php";

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data["currentStep"]))
            throw new Exception("Current step not set.");
        
        if (!isset($data["role"]))
            throw new Exception("Role not set.");
        
        $game = $_SESSION["game"];
        $currentStep = $data["currentStep"];
        $activeRole = $data["role"];
        
        $EVENT_CODE = "oq";
        $CARD_KEY = "oneq";

        if (oneQuietNightScheduledThisTurn($pdo, $game))
            throw new Exception("One Quiet Night cannot be played more than once in a single turn.");
        
        checkEventCardLegality($pdo, $game, $CARD_KEY);
        
        $discardingRole = getEventCardHolder($pdo, $game, $CARD_KEY);
        
        $pdo->beginTransaction();
        
        discardOrRemoveEventCard($pdo, $game, $discardingRole, $CARD_KEY);
        $discardingRole = convertRoleFromPossibleContingency($pdo, $discardingRole);

        // No useful information to include here,
        // but eventDetails are usually critically important, so they are not nullable.
        $eventDetails = "";
        
        $turnNum = getTurnNumber($pdo, $game);
        // If the "infect cities" step is already in progress,
        // then One Quiet Night cannot be played until the next turn.
        // If at least one infection card has already been flipped over, the client should prevent the card from being played.
        $INFECT_CITY_EVENT_CODE = "ic";
        if ($currentStep === "infect cities"
            && countEventsOfTurn($pdo, $game, $INFECT_CITY_EVENT_CODE) > 0)
            throw new Exception("this card cannot be played while the Infect Cities step is in progress.");
        
        $response["events"][] = recordEvent($pdo, $game, $EVENT_CODE, $eventDetails, $discardingRole);

        $proceedToNextStep = eventCardSatisfiedDiscard($pdo, $game, $currentStep, $discardingRole, $activeRole);

        if ($proceedToNextStep)
            $response["proceedFromDiscardToStep"] = $proceedToNextStep;
    }
    catch(PDOException $e)
    {
        $response["failure"] = "One Quiet Night failed: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "One Quiet Night failed: " . $e->getMessage();
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