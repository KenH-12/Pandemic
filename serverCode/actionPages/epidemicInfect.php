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
        
        $NEXT_STEP = "epIntensify";
        
        require "../connect.php";
        include "../utilities.php";
        
        // Epidemic Step 2: INFECT
        // "DRAW THE BOTTOM CARD FROM THE INFECTION DECK AND PUT 3 CUBES ON THAT CITY. DISCARD THAT CARD."
        $EVENT_CODE = "ef";

         // Get the bottom card from the infection deck.
         $bottomCard = $mysqli->query("SELECT cardKey, color
                                        FROM vw_infectionCard
                                        WHERE game = $game
                                        AND pile = 'deck'
                                        AND cardIndex = (SELECT MIN(cardIndex)
                                                        FROM vw_infectionCard
                                                        WHERE game = $game
                                                        AND pile = 'deck')")->fetch_assoc();

        $cardKey = $bottomCard["cardKey"];
        $color = $bottomCard["color"];

        $mysqli->autocommit(FALSE);

        discardInfectionCards($mysqli, $game, $cardKey);

        // Add 3 cubes to the corresponding city, unless the infection will be prevented somehow.
        $cubeCountBeforeInfection = getCubeCount($mysqli, $game, $cardKey, getCubeColumnName($color));
        $infectionPrevention = checkInfectionPrevention($mysqli, $game, $cardKey, $color);
        $cubesToAdd = $infectionPrevention == "0" ? 3 : 0;
        
        $details = "$cardKey,$cubeCountBeforeInfection,$infectionPrevention";
        $response["events"][] = recordEvent($mysqli, $game, $EVENT_CODE, $details);

        $infectionResult = addCubesToCity($mysqli, $game, $cardKey, $color, $cubesToAdd);
        
        if ($cubesToAdd > 0)
        {
            // Include any triggered outbreak events in the response.
            if (isset($infectionResult["outbreakEvents"]))
                $response["events"] = array_merge($response["events"], $infectionResult["outbreakEvents"]);

            // Adding disease cubes to the board can cause the game to end in defeat.
            if (getGameEndCause($mysqli, $game) === "cubes")
                $response["gameEndCause"] = "cubes";
        }

        if (!isset($response["gameEndCause"]))
            $response["nextStep"] = updateStep($mysqli, $game, $currentStep, $NEXT_STEP, $role);
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