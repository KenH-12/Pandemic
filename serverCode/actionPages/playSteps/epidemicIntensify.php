<?php
    try
    {
        session_start();
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");

        require "../../connect.php";
        require "../../utilities.php";

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data["role"]))
            throw new Exception("Role not set.");
        
        if (!isset($data["currentStep"]))
            throw new Exception("Current step not set.");
        
        $game = $_SESSION["game"];
        $role = $data["role"];
        $currentStep = $data["currentStep"];

        // Epidemic Step 3: INTENSIFY
        // "SHUFFLE THE CARDS IN THE INFECTION DISCARD PILE AND PUT THEM ON TOP OF THE INFECTION DECK."
        
        // Before shuffling, get the discarded cardKeys in their current order for use in the event history.
        $stmt = $pdo->prepare("SELECT cardKey, cardIndex
                                FROM vw_infectionCard
                                WHERE game = ?
                                AND pile = 'discard'
                                ORDER BY cardIndex DESC");
        $stmt->execute([$game]);
        $numCardsToShuffle = $stmt->rowCount();
        
        $pdo->beginTransaction();
        
        $EPIDEMIC_INTENSIFY_CODE = "et";
        $response["events"] = recordEvent($pdo, $game, $EPIDEMIC_INTENSIFY_CODE, $numCardsToShuffle);
        
        // It's possible that the only card in the discard pile was the one drawn by epidemic infect,
        // and that card can be removed from the game by Resilient Population.
        if ($numCardsToShuffle > 0)
        {
            $discards = $stmt->fetchAll();

            // Get the discard pile in random order (shuffled)...
            $stmt = $pdo->prepare("SELECT cardKey
                                    FROM vw_infectionCard
                                    WHERE game = ?
                                    AND pile = 'discard'
                                    ORDER BY RAND()");
            $stmt->execute([$game]);
            
            if ($stmt->rowCount() === 0)
                throwException($pdo, "Failed to retrieve infection discards");
            
            $shuffledDiscards = $stmt->fetchAll();

            // Create an array of discarded infection card keys
            $shuffledCardKeys = array();
            foreach ($shuffledDiscards as $row)
                $shuffledCardKeys[] = $row["cardKey"];

            // Move the infection cards from the discard pile to the top of the deck
            $cardType = "infection";
            $currentPile = "discard";
            $newPile = "deck";
            moveCardsToPile($pdo, $game, $cardType, $currentPile, $newPile, $shuffledCardKeys);

            // Record the shuffled cardKeys for the event history.
            $eventID = $response["events"]["id"];
            $response["events"]["cardKeys"] = array();
            
            $stmt = $pdo->prepare("INSERT INTO epidemicIntensify
                                    (eventID, cityKey, cardIndex)
                                VALUES
                                    ($eventID, ?, ?)");
            foreach ($discards as $row)
            {
                $cardKey = $row["cardKey"];
                $stmt->execute([$cardKey, $row["cardIndex"]]);

                if ($stmt->rowCount() !== 1)
                    throwException($pdo, "Failed to record infection discard ($eventID, $cardKey)");
                
                array_push($response["events"]["cardKeys"], $cardKey);
            }
        }
        
        // Get the epidemic cardKey and discard it
        $stmt = $pdo->prepare("SELECT cardKey
                                FROM vw_playercard
                                WHERE game = ?
                                AND pile = 'deck'
                                AND cardKey LIKE 'epi%'
                                ORDER BY cardIndex DESC
                                LIMIT 1");
        $stmt->execute([$game]);
        $epidemicKey = $stmt->fetch()["cardKey"];

        $currentPile = "deck";
        discardPlayerCards($pdo, $game, $currentPile, $epidemicKey);
        
        // Determine next step...
        $turnNum = getTurnNumber($pdo, $game);
        $stmt = $pdo->prepare("SELECT count(*) AS 'numResolved'
                                FROM vw_event
                                WHERE game = ?
                                AND turnNum = $turnNum
                                AND eventType = '$EPIDEMIC_INTENSIFY_CODE'");
        $stmt->execute([$game]);
        $numEpidemicsResolvedThisTurn = $stmt->fetch()["numResolved"];

        $anEpidemicIsUnresolved = countEpidemicsDrawnOnTurn($pdo, $game, $turnNum) != $numEpidemicsResolvedThisTurn;

        if ($anEpidemicIsUnresolved)
            $nextStep = "epIncrease";
        else
        {
            if (roleHasTooManyCards($pdo, $game, $role))
                $nextStep = "discard";
            else
                $nextStep = "infect cities";
        }

        $response["nextStep"] = updateStep($pdo, $game, $currentStep, $nextStep, $role);
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Epidemic Intensify failed: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Epidemic Intensify failed: " . $e->getMessage();
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