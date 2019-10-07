<?php
    try
    {
        session_start();
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");

        if (!isset($_POST["role"]))
            throw new Exception("Role not set.");
        
        if (!isset($_POST["currentStep"]))
            throw new Exception("Current step not set.");
        
        $game = $_SESSION["game"];
        $role = $_POST["role"];
        $currentStep = $_POST["currentStep"];
        
        require "../connect.php";
        include "../utilities.php";

        // Epidemic Step 3: INTENSIFY
        // "SHUFFLE THE CARDS IN THE INFECTION DISCARD PILE AND PUT THEM ON TOP OF THE INFECTION DECK."
        
        // Shuffle the discard pile...
        $discardPile = $mysqli->query("SELECT cardKey
                                        FROM vw_infectionCard
                                        WHERE game = $game
                                        AND pile = 'discard'
                                        ORDER BY RAND()");
        
        if ($discardPile->num_rows == 0)
            throw new Exception("Failed to retrieve infection discards (epidemic intensify): " . $mysqli->error);

        $mysqli->autocommit(FALSE);

        // Create an array of discarded infection card keys
        $infectionDiscardKeys = array();
        while ($row = mysqli_fetch_assoc($discardPile))
            array_push($infectionDiscardKeys, $row["cardKey"]);

        // Move the infection cards from the discard pile to the top of the deck
        $cardType = "infection";
        $currentPile = "discard";
        $newPile = "deck";
        moveCardsToPile($mysqli, $game, $cardType, $currentPile, $newPile, join(",", $infectionDiscardKeys));
        
        // Get the epidemic cardKey and discard it
        $epidemicKey = $mysqli->query("SELECT cardKey
                                        FROM vw_playercard
                                        WHERE game = $game
                                        AND pile = 'deck'
                                        AND cardKey LIKE 'epi%'
                                        ORDER BY cardIndex DESC
                                        LIMIT 1")->fetch_assoc()["cardKey"];

        $currentPile = "deck";
        discardPlayerCards($mysqli, $game, $currentPile, $epidemicKey);

        $eventType = "et";
        $details = count($infectionDiscardKeys);
        $response["events"] = recordEvent($mysqli, $game, $eventType, "$details", $role);
        
        // Determine next step...
        $turnNum = getTurnNumber($mysqli, $game);
        $anEpidemicIsUnresolved = countEpidemicsDrawnOnTurn($mysqli, $game, $turnNum) != countEpidemicsResolvedOnTurn($mysqli, $game, $turnNum);

        if ($anEpidemicIsUnresolved)
            $nextStep = "epIncrease";
        else
        {
            $MAX_HAND_SIZE = 7;
            $handSize = getHandSize($mysqli, $game, $role);

            if ($handSize > $MAX_HAND_SIZE)
                $nextStep = "discard";
            else
                $nextStep = "infect cities";
        }

        $response["nextStep"] = updateStep($mysqli, $game, $currentStep, $nextStep, $role);
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