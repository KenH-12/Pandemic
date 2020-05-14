<?php
	try
	{
		session_start();
		require "../connect.php";
		require "../utilities.php";
		
		if (!isset($_SESSION["game"]))
			throw new Exception("Game does not exist.");
		
		$game = $_SESSION["game"];
		
		$stmt = $pdo->prepare("SELECT	turn,
										turnNum,
										stepName,
										infRate AS 'infectionRate',
										numEpidemics,
										epidemicCount,
										outbreakCount
								FROM pandemic.vw_gameState
								WHERE game = ?");
		$stmt->execute([$game]);
		$response["gamestate"] = $stmt->fetch();
		
		if (!$response["gamestate"])
			throw new Exception("Game not found.");
		
		// If at least one recorded event other than Initial Infections ('ii') and Starting Hands ('sh')
		// the game is being resumed.
		// Otherwise the game will be started from scratch.
		$stmt = $pdo->prepare("SELECT COUNT(*) AS numActions
								FROM pandemic.vw_event
								WHERE game = ?
								AND eventType NOT IN ('sh', 'ii')");
		$stmt->execute([$game]);
		$response["gamestate"]["gameIsResuming"] = $stmt->fetch()["numActions"] > 0;
		
		if ($response["gamestate"]["gameIsResuming"])
		{
			$stmt = $pdo->prepare("SELECT	locationKey,
											yCubes,
											rCubes,
											uCubes,
											bCubes,
											researchStation
								FROM pandemic.vw_location
								WHERE game = ?
								AND	(researchStation = 1
									OR yCubes > 0
									OR rCubes > 0
									OR uCubes > 0
									OR bCubes > 0)");
			$stmt->execute([$game]);
			$response["cities"] = $stmt->fetchAll();

			$stmt = $pdo->prepare("SELECT cardKey as `key`, pile
								FROM pandemic.vw_infectionCard
								WHERE game = ?
								AND pile IN ('discard', 'removed')
								ORDER BY cardIndex");
			$stmt->execute([$game]);
			$response["infectionDiscards"] = $stmt->fetchAll();

			$stmt = $pdo->prepare("SELECT yStatus AS 'y',
									rStatus AS 'r',
									uStatus AS 'u',
									bStatus AS 'b'
								FROM pandemic.vw_disease
								WHERE game = ?");
			$stmt->execute([$game]);
			$response["diseaseStatuses"] = $stmt->fetch();
		}
		else // beginning new game
		{
			// get all roles for role determination slot machines.
			$allRoles = $pdo->query("SELECT roleName FROM pandemic.role");
			foreach ($allRoles as $row)
				$response["allRoles"][] = $row["roleName"];
		}
		
		$stmt = $pdo->prepare("SELECT	uID,
										pID,
										rID,
										name,
										role,
										nextID AS 'nextTurnID',
										location AS 'cityKey'
								FROM pandemic.vw_player
								WHERE game = ?");
		$stmt->execute([$game]);
		$response["players"] = $stmt->fetchAll();
		
		$stmt = $pdo->prepare("SELECT role, details AS 'cardKeys'
							FROM pandemic.vw_event
							WHERE game = ?
							AND eventType = 'sh'");
		$stmt->execute([$game]);
		$startingHands = $stmt->fetchAll(PDO::FETCH_OBJ);

		foreach ($startingHands as $row)
		{
			$cardKeys = explode(",", $row->cardKeys);
			for ($i = 0; $i < count($cardKeys); $i++)
			{
				$cityKey = $cardKeys[$i];
				$popQuery = $pdo->prepare("SELECT population FROM city WHERE cityKey = ?");
				$popQuery->execute([$cityKey]);
				
				$response["startingHandPopulations"][]
					= array("role" => $row->role,
							"key" => $cityKey,
							"population" => $popQuery->fetch()["population"]);
			}
		}

		$response["gamestate"]["numPlayerCardsRemaining"] = countCardsInPlayerDeck($pdo, $game);
	}
	catch(Exception $e)
	{
		$response["failure"] = $e->getMessage();
	}
	finally
	{
		echo json_encode($response);
	}
?>