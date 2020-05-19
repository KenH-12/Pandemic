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
            throw new Exception("Role not set.");

        if (!isset($details["currentStep"]))
            throw new Exception("Current step not set.");
        
        $game = $_SESSION["game"];
        $role = $details["role"];
        $currentStep = $details["currentStep"];
        
        $NEXT_STEP = "epIntensify";
        
        // Epidemic Step 2: INFECT
        // "DRAW THE BOTTOM CARD FROM THE INFECTION DECK AND PUT 3 CUBES ON THAT CITY. DISCARD THAT CARD."
        $EVENT_CODE = "ef";

         // Get the bottom card from the infection deck.
         $stmt = $pdo->prepare("SELECT MIN(cardIndex), cardKey, color
                                FROM vw_infectioncard
                                WHERE game = ?
                                AND pile = 'deck'
                                AND cardIndex IS NOT NULL");
        $stmt->execute([$game]);
        $bottomCard = $stmt->fetch();

        $cardKey = $bottomCard["cardKey"];
        $color = $bottomCard["color"];

        $pdo->beginTransaction();

        discardInfectionCards($pdo, $game, $cardKey);

        // Add 3 cubes to the corresponding city, unless the infection will be prevented somehow.
        $cubeCountBeforeInfection = getCubeCount($pdo, $game, $cardKey, $color);
        $infectionPrevention = checkInfectionPrevention($pdo, $game, $cardKey, $color);
        $cubesToAdd = $infectionPrevention == "0" ? 3 : 0;
        
        $eventDetails = "$cardKey,$cubeCountBeforeInfection,$infectionPrevention";
        $response["events"][] = recordEvent($pdo, $game, $EVENT_CODE, $eventDetails);

        $infectionResult = addCubesToCity($pdo, $game, $cardKey, $color, $cubesToAdd);
        
        if ($cubesToAdd > 0)
        {
            // Include any triggered outbreak events in the response.
            if (isset($infectionResult["outbreakEvents"]))
                $response["events"] = array_merge($response["events"], $infectionResult["outbreakEvents"]);

            // Adding disease cubes to the board can cause the game to end in defeat.
            if (getGameEndCause($pdo, $game) === "cubes")
                $response["gameEndCause"] = "cubes";
        }

        if (!isset($response["gameEndCause"]))
            $response["nextStep"] = updateStep($pdo, $game, $currentStep, $NEXT_STEP, $role);
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Epidemic Infect failed: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Epidemic Infect failed: " . $e->getMessage();
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