<?php
    try
    {
        session_start();
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");

        require "../connect.php";
        require "../utilities.php";

        $details = json_decode(file_get_contents("php://input"), true);

        if (!isset($details["role"]))
            throw new Exception("Required values not set.");
        
        if (!isset($details["currentStep"]))
            throw new Exception("Required values not set.");
        
        if (!isset($details["cardKey"]))
            throw new Exception("Required values not set.");
        
        $game = $_SESSION["game"];
        $role = $details["role"];
        $currentStep = $details["currentStep"];
        $cardKey = $details["cardKey"];

        $EVENT_CARD_COLOR = "e";
        $EVENT_CODE = "pc";

        if (getRoleName($pdo, $role) !== "Contingency Planner")
            throw new Exception("Only the Contingency Planner may perform this action.");
        
        if (getContingencyCardKey($pdo, $game))
            throw new Exception("There can be only 1 contingency card at a time.");

        $stmt = $pdo->prepare("SELECT diseaseColor
                                FROM city
                                WHERE cityKey = ?");
        $stmt->execute([$cardKey]);
        
        if ($stmt->fetch()["diseaseColor"] !== $EVENT_CARD_COLOR)
            throw new Exception("The specified card must be an Event card.");

        $pdo->beginTransaction();

        // moveCardsToPile will ensure that the specified event card is coming from the Player Discard Pile.
        $cardType = "player";
        $currentPile = "discard";
        $newPile = "contingency";
        moveCardsToPile($pdo, $game, $cardType, $currentPile, $newPile, $cardKey);
        
        $eventDetails = $cardKey;
        $response["events"][] = recordEvent($pdo, $game, $EVENT_CODE, $eventDetails, $role);

        $response["nextStep"] = nextStep($pdo, $game, $currentStep, $role);
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Plan Contingency failed: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Plan Contingency failed: " . $e->getMessage();
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