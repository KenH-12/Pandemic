<?php
    try
    {
        session_start();
        require "../connect.php";
        include "../utilities.php";
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");

        if (!isset($_POST["role"]))
            throw new Exception("Role not set.");
        
        if (!isset($_POST["currentStep"]))
            throw new Exception("Current step not set.");
        
        $game = $_SESSION["game"];
        $role = $_POST["role"];
        $currentStep = $_POST["currentStep"];

        // Epidemic Step 3: INTENSIFY
        // "SHUFFLE THE CARDS IN THE INFECTION DISCARD PILE AND PUT THEM ON TOP OF THE INFECTION DECK."
        
        // Before shuffling, get the discarded cardKeys in their current order for use in the event history.
        $discardPile = $mysqli->query("SELECT cardKey, cardIndex
                                        FROM vw_infectionCard
                                        WHERE game = $game
                                        AND pile = 'discard'
                                        ORDER BY cardIndex DESC");
        
        $numCardsToShuffle = $discardPile->num_rows;

        $mysqli->autocommit(FALSE);
        
        $eventType = "et";
        $details = $numCardsToShuffle;
        $response["events"] = recordEvent($mysqli, $game, $eventType, $details);
        
        // It's possible that the only card in the discard pile was the one drawn by epidemic infect,
        // and that card can be removed from the game by Resilient Population.
        if ($numCardsToShuffle > 0)
        {
            // Get the discard pile in random order (shuffled)...
            $shuffledDiscardPile = $mysqli->query("SELECT cardKey
                                                    FROM vw_infectionCard
                                                    WHERE game = $game
                                                    AND pile = 'discard'
                                                    ORDER BY RAND()");
            
            if ($shuffledDiscardPile->num_rows == 0)
                throw new Exception("Failed to retrieve infection discards (epidemic intensify): " . $mysqli->error);

            // Create an array of discarded infection card keys
            $shuffledCardKeys = array();
            while ($row = mysqli_fetch_assoc($shuffledDiscardPile))
                $shuffledCardKeys[] = $row["cardKey"];

            // Move the infection cards from the discard pile to the top of the deck
            $cardType = "infection";
            $currentPile = "discard";
            $newPile = "deck";
            moveCardsToPile($mysqli, $game, $cardType, $currentPile, $newPile, $shuffledCardKeys);

            // Record the shuffled cardKeys for the event history.
            $eventID = $response["events"]["id"];
            $response["events"]["cardKeys"] = array();
            
            while ($row = mysqli_fetch_assoc($discardPile))
            {
                $cityKey = $row["cardKey"];
                $cardIndex = $row["cardIndex"];
                $mysqli->query("INSERT INTO epidemicIntensify
                                    (eventID, cityKey, cardIndex)
                                VALUES
                                    ($eventID, '$cityKey', $cardIndex)");

                if ($mysqli->affected_rows != 1)
                    throw new Exception("Failed to insert into epidemicIntensify ($eventID, $cityKey): " . $mysqli->error);
                
                array_push($response["events"]["cardKeys"], $cityKey);
            }
        }
        
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
        
        // Determine next step...
        $turnNum = getTurnNumber($mysqli, $game);
        $anEpidemicIsUnresolved = countEpidemicsDrawnOnTurn($mysqli, $game, $turnNum) != countEpidemicsResolvedOnTurn($mysqli, $game, $turnNum);

        if ($anEpidemicIsUnresolved)
            $nextStep = "epIncrease";
        else
        {
            if (roleHasTooManyCards($mysqli, $game, $role))
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