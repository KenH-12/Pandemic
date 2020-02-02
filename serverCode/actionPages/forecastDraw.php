<?php
    try
    {
        session_start();
        require "../connect.php";
        include "../utilities.php";
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");

        if (!isset($_POST["currentStep"]))
            throw new Exception("Current step not set.");
        
        if (!isset($_POST["role"]))
            throw new Exception("Role not set.");
        
        $game = $_SESSION["game"];
        $currentStep = $_POST["currentStep"];
        $activeRole = $_POST["role"];
        
        $EVENT_CODE = "fd";
        $CARD_KEY = "fore";
        $NUM_CARDS_TO_DRAW = 6;

        checkEventCardLegality($mysqli, $game, $CARD_KEY);
        
        $discardingRole = getEventCardHolder($mysqli, $game, $CARD_KEY);
        
        $mysqli->autocommit(FALSE);
        
        discardOrRemoveEventCard($mysqli, $game, $discardingRole, $CARD_KEY);
        $discardingRole = convertRoleFromPossibleContingency($mysqli, $discardingRole);

        $infectionCards = $mysqli->query("SELECT cardKey
                                        FROM vw_infectioncard
                                        WHERE game = $game
                                        AND pile = 'deck'
                                        ORDER BY cardIndex DESC
                                        LIMIT $NUM_CARDS_TO_DRAW");

        while ($row = mysqli_fetch_assoc($infectionCards))
            $cardKeys[] = $row["cardKey"];
        
        if (count($cardKeys) !== $NUM_CARDS_TO_DRAW)
            throw new Exception("fewer than " . $NUM_CARDS_TO_DRAW . " cards were drawn: (" . implode(",", $cardKeys) . ")");
        
        $eventDetails = implode(",", $cardKeys);
        $response["events"][] = recordEvent($mysqli, $game, $EVENT_CODE, $eventDetails, $discardingRole);
    }
    catch(Exception $e)
    {
        $response["failure"] = "Forecast draw failed: " . $e->getMessage();
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