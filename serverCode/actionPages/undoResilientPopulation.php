<?php
    try
    {
        session_start();
        require "../connect.php";
        include "../utilities.php";
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");
        
        if (!isset($_POST["activeRole"]))
            throw new Exception("Role not set.");
        
        if (!isset($_POST["eventID"]))
            throw new Exception("Event id not set.");
        
        $game = $_SESSION["game"];
        $activeRole = $_POST["activeRole"];
        $eventID = $_POST["eventID"];
        
        $RESILIENT_POPULATION_CARDKEY = "resi";

        $event = getEventById($mysqli, $game, $eventID);
        validateEventCanBeUndone($mysqli, $game, $event);

        $role = $event["role"];
        $eventDetails = explode(",", $event["details"]);
        $cardKey = $eventDetails[0];
        $infectionDiscardIndex = $eventDetails[1];

        $mysqli->autocommit(FALSE);

        // Put the infection card which was removed from the game by Resilient Population
        // back where it was in the infection discard pile.
        $mysqli->query("UPDATE vw_infectionCard
                        SET pileID = getPileID('discard'),
                            cardIndex = $infectionDiscardIndex
                        WHERE game = $game
                        AND pile = 'removed'
                        AND cardKey = '$cardKey'");
        
        if ($mysqli->affected_rows != 1)
            throw new Exception("could not place the removed infection card back in the discard pile: " . $mysqli->error);
        
        $response["wasContingencyCard"] = moveEventCardToPrevPile($mysqli, $game, $RESILIENT_POPULATION_CARDKEY, $event);

        $response["undoneEventIds"] = array($eventID);
        deleteEvent($mysqli, $game, $eventID);
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to undo Resilient Population: " . $e->getMessage();
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