<?php
    try
    {
        session_start();
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");

        if (!isset($_POST["role"])
            || !isset($_POST["currentStep"])
            || !isset($_POST["cardKey"])
            throw new Exception("Required values not set.");
        
        $game = $_SESSION["game"];
        $role = $_POST["role"];
        $currentStep = $_POST["currentStep"];
        $cardKey = $_POST["cardKey"];

        $EVENT_CARD_COLOR = "e";
        $EVENT_CODE = "pc";

        require "../connect.php";
        include "../utilities.php";

        if (getRoleName($mysqli, $role) !== "Contingency Planner")
            throw new Exception("Only the Contingency Planner may perform this action.");
        
        if (getContingencyCard($mysqli, $game))
            throw new Exception("There can be only 1 contingency card at a time.");

        $isEventCardKey = $mysqli->query("SELECT color
                                        FROM vw_playerCard
                                        WHERE game = $game
                                        AND cardKey = '$cardKey'")
                                ->fetch_assoc()["color"] === $EVENT_CARD_COLOR;
        
        if (!$isEventCardKey)
            throw new Exception("The specified card must be an Event card.");

        $mysqli->autocommit(FALSE);

        $cardType = "player";
        $currentPile = "discard";
        $newPile = "contingency";
        moveCardToPile($mysqli, $game, $cardType, $currentPile, $newPile, $cardKey);
        
        //$response["events"][] = recordEvent($mysqli, $game, $eventType, $details, $role);

        $response["nextStep"] = nextStep($mysqli, $game, $currentStep, $role);
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to plan contingency: " . $e->getMessage();
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