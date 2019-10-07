<?php
	session_start();
	
	if (isset($_SESSION["game"]))
	{
        require "../connect.php";
        include "../utilities.php";
        
        try
        {
            if (!isset($_POST["role"]))
                throw new Exception("role not set");
            
            if (!isset($_POST["currentStep"]))
                throw new Exception("current step not set");

            if (!isset($_POST["actionCode"]))
                throw new Exception("action code not set");
            
            if (!isset($_POST["locationKey"]))
                throw new Exception("location key not set");
            
            if (!isset($_POST["relocationKey"]))
                throw new Exception("relocation key not set");
                
            $game = $_SESSION["game"];
            $role = $_POST["role"];
            $currentStep = $_POST["currentStep"];
            $actionCode = $_POST["actionCode"];
            $locationKey = $_POST["locationKey"];
            $relocationKey = $_POST["relocationKey"];
            
            $response = array();
            
            $actionDetails = $locationKey;

            $BUILD_RS_EVENT_CODE = "rs";
            $GOVERNMENT_GRANT_EVENT_CODE = "gg";

            // Government Grant Event Card:
            // "Add 1 research station to any city (no city card needed)."
            if ($actionCode === $GOVERNMENT_GRANT_EVENT_CODE)
            {
                $cardKey = "gove";
                checkEventCardLegality($mysqli, $game, $cardKey);
                
                $discardingRole = getEventCardHolder($mysqli, $game, $cardKey);
                discardPlayerCards($mysqli, $game, $discardingRole, $cardKey);

                $proceedToNextStep = eventCardSatisfiedDiscard($mysqli, $game, $currentStep, $discardingRole, $role);
                if ($proceedToNextStep)
                    $response["proceedFromDiscardToStep"] = $proceedToNextStep;
            }
            else // Build Research Station: "Discard the city card that matches the city you are in to place a research station there."
            {
                // Operations Expert special ability:
		        // "As an action, build a research station in his current city without discarding a city card."
                if (getRoleName($mysqli, $role) !== "Operations Expert")
                    discardPlayerCards($mysqli, $game, $role, $locationKey);
                
                $response["nextStep"] = nextStep($mysqli, $game, $currentStep, $role);
            }
            
            $RESEARCH_STATION_LIMIT = 6;
            $researchStationsInPlay = $mysqli->query("SELECT COUNT(*) AS 'researchStationStock'
                                                    FROM vw_location
                                                    WHERE game = $game
                                                    AND researchStation = 1")->fetch_assoc()["researchStationStock"];
            
            $mysqli->autocommit(FALSE);
            
            // If the research station stock is depleted,
            // a research station must be relocated.
            if ($researchStationsInPlay == $RESEARCH_STATION_LIMIT)
            {
                if ($relocationKey == "0")
                    throw new Exception("No research station pieces remain and no relocation was specified.");
                
                $mysqli->query("UPDATE vw_location
                                SET researchStation = 0
                                WHERE game = $game
                                AND locationKey = '$relocationKey'");
                
                if ($mysqli->affected_rows != 1)
                    throw new Exception("Invalid research station relocation (from '$relocationKey'): " . $mysqli->error);
                
                $actionDetails .= ",$relocationKey";
            }

            $mysqli->query("UPDATE vw_location
                            SET researchStation = 1
                            WHERE game = $game
                            AND locationKey = '$locationKey'");

            if ($mysqli->affected_rows != 1)
                throw new Exception("Failed to place research station on '$locationKey': " . $mysqli->error);
            
            $response["events"] = recordEvent($mysqli, $game, $actionCode, $actionDetails, $role);
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
        }
	}
	else
		$response["failure"] = "game not found";
	
	echo json_encode($response);
?>