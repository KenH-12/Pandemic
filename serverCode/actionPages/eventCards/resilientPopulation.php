<?php
    try
    {
        session_start();
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");

        require "../../connect.php";
        require "../../utilities.php";

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data["currentStep"]))
            throw new Exception("Current step not set.");
        
        if (!isset($data["role"]))
            throw new Exception("Role not set.");

        if (!isset($data["cardKeyToRemove"]))
            throw new Exception("Card to remove not set.");
        
        $game = $_SESSION["game"];
        $currentStep = $data["currentStep"];
        $activeRole = $data["role"];
        $cardKeyToRemove = $data["cardKeyToRemove"];
        
        $EVENT_CODE = "rp";
        $CARD_KEY = "resi";

        checkEventCardLegality($pdo, $game, $CARD_KEY);
        $discardingRole = getEventCardHolder($pdo, $game, $CARD_KEY);
        
        $pdo->beginTransaction();
        
        discardOrRemoveEventCard($pdo, $game, $discardingRole, $CARD_KEY);
        $discardingRole = convertRoleFromPossibleContingency($pdo, $discardingRole);

        $cardType = "infection";
        $currentPile = "discard";
        $newPile = "removed";
        moveCardsToPile($pdo, $game, $cardType, $currentPile, $newPile, $cardKeyToRemove);
        
        // The cardIndex within the infection discard pile is recorded in case the Resilient Population event gets undone later.
        $stmt = $pdo->prepare("SELECT cardIndex
                                FROM vw_infectionCard
                                WHERE game = ?
                                AND cardKey = ?");
        $stmt->execute([$game, $cardKeyToRemove]);
        $eventDetails = $cardKeyToRemove . "," . $stmt->fetch()["cardIndex"];
        
        $response["events"][] = recordEvent($pdo, $game, $EVENT_CODE, $eventDetails, $discardingRole);

        $proceedToNextStep = eventCardSatisfiedDiscard($pdo, $game, $currentStep, $discardingRole, $activeRole);

        if ($proceedToNextStep)
            $response["proceedFromDiscardToStep"] = $proceedToNextStep;
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Resilient Population failed: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Resilient Population failed: " . $e->getMessage();
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